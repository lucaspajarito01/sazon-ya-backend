import { BaseEntity } from './BaseEntity.js';
import { ValidationError } from '../utils/AppError.js';

export const EVENT_TYPES = Object.freeze({
  EVENTO: 'EVENTO',
  PROMOCION: 'PROMOCION',
  SORTEO: 'SORTEO'
});

export const EVENT_STATES = Object.freeze({
  PROGRAMADO: 'PROGRAMADO',
  ACTIVO: 'ACTIVO',
  FINALIZADO: 'FINALIZADO',
  CANCELADO: 'CANCELADO'
});

export class EventEntity extends BaseEntity {
  constructor({
    id = null,
    creado_por_admin_id = 1,
    titulo,
    descripcion,
    tipo = EVENT_TYPES.PROMOCION,
    porcentaje_descuento = 0,
    premio_sorteo = null,
    cupo_maximo = null,
    fecha_inicio,
    fecha_fin,
    estado = EVENT_STATES.ACTIVO,
    creado_en = null
  }) {
    super(id, {
      creado_por_admin_id: creado_por_admin_id ? Number(creado_por_admin_id) : 1,
      titulo: typeof titulo === 'string' ? titulo.trim() : '',
      descripcion: typeof descripcion === 'string' ? descripcion.trim() : '',
      tipo: tipo || EVENT_TYPES.PROMOCION,
      porcentaje_descuento: Number(Number(porcentaje_descuento || 0).toFixed(2)),
      premio_sorteo: premio_sorteo ? String(premio_sorteo).trim() : null,
      cupo_maximo: cupo_maximo !== null && cupo_maximo !== undefined && cupo_maximo !== '' ? Number(cupo_maximo) : null,
      fecha_inicio,
      fecha_fin,
      estado: estado || EVENT_STATES.ACTIVO,
      creado_en: creado_en || new Date().toISOString()
    });
    this.validate();
  }

  validate() {
    const errors = [];
    const d = this.getData();

    if (!d.titulo || d.titulo.length < 5 || d.titulo.length > 150) {
      errors.push({ field: 'titulo', message: 'El título del evento debe tener entre 5 y 150 caracteres.' });
    }
    if (!d.descripcion || d.descripcion.length < 10) {
      errors.push({ field: 'descripcion', message: 'La descripción del evento debe tener al menos 10 caracteres.' });
    }
    if (!Object.values(EVENT_TYPES).includes(d.tipo)) {
      errors.push({ field: 'tipo', message: 'El tipo debe ser EVENTO, PROMOCION o SORTEO.' });
    }
    if (Number.isNaN(d.porcentaje_descuento) || d.porcentaje_descuento < 0 || d.porcentaje_descuento > 100) {
      errors.push({ field: 'porcentaje_descuento', message: 'El descuento debe estar entre 0 y 100.' });
    }
    if (d.cupo_maximo !== null && (!Number.isSafeInteger(d.cupo_maximo) || d.cupo_maximo <= 0)) {
      errors.push({ field: 'cupo_maximo', message: 'El cupo máximo debe ser un entero positivo.' });
    }

    const start = new Date(d.fecha_inicio).getTime();
    const end = new Date(d.fecha_fin).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      errors.push({
        field: 'fecha_fin',
        message: 'La fecha de finalización debe ser posterior a la fecha de inicio.'
      });
    }

    if (errors.length > 0) {
      throw new ValidationError('Error de validación en la entidad Evento/Promoción (Barrera 2).', errors);
    }
  }
}
