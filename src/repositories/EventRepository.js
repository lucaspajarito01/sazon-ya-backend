import { BaseRepository } from './BaseRepository.js';
import { EventEntity } from '../entities/EventEntity.js';
import { AppError } from '../utils/AppError.js';

export class EventRepository extends BaseRepository {
  constructor(db) {
    super(db, 'eventos_promociones');
  }

  async findAll({ onlyActive = false, userId = null } = {}, conn = null) {
    const state = this.executor(conn).state;
    let items = [...state.eventos_promociones];
    if (onlyActive) {
      items = items.filter((e) => e.estado === 'ACTIVO');
    }

    return items.map((e) => {
      const participants = state.participaciones_eventos.filter((p) => p.evento_id === e.id);
      const userParticipation = userId ? participants.find((p) => p.usuario_id === Number(userId)) : null;
      return {
        ...e,
        total_inscritos: participants.length,
        cupos_restantes: e.cupo_maximo !== null ? Math.max(0, e.cupo_maximo - participants.length) : null,
        usuario_inscrito: Boolean(userParticipation),
        codigo_boleto: userParticipation ? userParticipation.codigo_boleto : null
      };
    });
  }

  async findById(id, conn = null) {
    const list = await this.findAll({}, conn);
    return list.find((e) => e.id === Number(id)) || null;
  }

  async create(eventEntity, conn = null) {
    const store = this.executor(conn).state.eventos_promociones;
    const data = eventEntity.getData();
    const nextId = store.length > 0 ? Math.max(...store.map((e) => e.id)) + 1 : 1;
    const record = { ...data, id: nextId };
    store.push(record);
    return this.findById(nextId, conn);
  }

  async updateStatus(id, estado, conn = null) {
    const store = this.executor(conn).state.eventos_promociones;
    const index = store.findIndex((e) => e.id === Number(id));
    if (index === -1) {
      throw new AppError('Evento o promoción no encontrado.', 404);
    }
    const entity = new EventEntity({ ...store[index], estado });
    store[index] = entity.getData();
    return this.findById(id, conn);
  }

  async participate({ eventoId, usuarioId }, conn = null) {
    const state = this.executor(conn).state;
    const evento = state.eventos_promociones.find((e) => e.id === Number(eventoId));
    if (!evento) {
      throw new AppError('El evento o sorteo indicado no existe.', 404);
    }
    if (evento.estado !== 'ACTIVO') {
      throw new AppError('Este evento o sorteo no está activo para inscripciones.', 422);
    }

    const now = Date.now();
    if (now < new Date(evento.fecha_inicio).getTime() || now > new Date(evento.fecha_fin).getTime()) {
      throw new AppError('El evento o sorteo se encuentra fuera de su vigencia.', 422);
    }

    const alreadyJoined = state.participaciones_eventos.find(
      (p) => p.evento_id === Number(eventoId) && p.usuario_id === Number(usuarioId)
    );
    if (alreadyJoined) {
      throw new AppError('Ya te encuentras participando en este evento/sorteo.', 409, [
        { field: 'evento_id', message: `Tu boleto actual es ${alreadyJoined.codigo_boleto}` }
      ]);
    }

    const currentParticipants = state.participaciones_eventos.filter((p) => p.evento_id === Number(eventoId));
    if (evento.cupo_maximo !== null && currentParticipants.length >= evento.cupo_maximo) {
      throw new AppError('Se alcanzó el cupo máximo disponible para este sorteo/evento.', 409);
    }

    const nextId =
      state.participaciones_eventos.length > 0
        ? Math.max(...state.participaciones_eventos.map((p) => p.id)) + 1
        : 1;
    const codigoBoleto = `SZY-EVT${eventoId}-U${usuarioId}-${String(nextId).padStart(4, '0')}`;
    const record = {
      id: nextId,
      evento_id: Number(eventoId),
      usuario_id: Number(usuarioId),
      codigo_boleto: codigoBoleto,
      es_ganador: 0,
      inscrito_en: new Date().toISOString()
    };

    state.participaciones_eventos.push(record);
    return record;
  }
}
