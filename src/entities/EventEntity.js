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

export const EVENT_MEDIA_TYPES = Object.freeze({
  NONE: 'NONE',
  VIDEO: 'VIDEO',
  POSTING: 'POSTING'
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
    media_tipo = EVENT_MEDIA_TYPES.NONE,
    media_url = null,
    posting_contenido = null,
    creado_en = null
  }) {
    const resolvedMediaTipo = media_tipo ? String(media_tipo).trim().toUpperCase() : EVENT_MEDIA_TYPES.NONE;

    super(id, {
      creado_por_admin_id: creado_por_admin_id ? Number(creado_por_admin_id) : 1,
      titulo: typeof titulo === 'string' ? titulo.trim() : '',
      descripcion: typeof descripcion === 'string' ? descripcion.trim() : '',
      tipo: tipo ? String(tipo).trim().toUpperCase() : EVENT_TYPES.PROMOCION,
      porcentaje_descuento: Number(Number(porcentaje_descuento || 0).toFixed(2)),
      premio_sorteo: premio_sorteo && String(premio_sorteo).trim() !== '' ? String(premio_sorteo).trim() : null,
      cupo_maximo: cupo_maximo !== null && cupo_maximo !== undefined && cupo_maximo !== '' ? Number(cupo_maximo) : null,
      fecha_inicio,
      fecha_fin,
      estado: estado ? String(estado).trim().toUpperCase() : EVENT_STATES.ACTIVO,
      media_tipo: resolvedMediaTipo,
      media_url:
        resolvedMediaTipo === EVENT_MEDIA_TYPES.NONE
          ? null
          : media_url && String(media_url).trim() !== ''
            ? String(media_url).trim()
            : null,
      posting_contenido:
        resolvedMediaTipo === EVENT_MEDIA_TYPES.NONE
          ? null
          : posting_contenido && String(posting_contenido).trim() !== ''
            ? String(posting_contenido).trim()
            : null,
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
    if (!Object.values(EVENT_STATES).includes(d.estado)) {
      errors.push({
        field: 'estado',
        message: 'El estado debe ser PROGRAMADO, ACTIVO, FINALIZADO o CANCELADO.'
      });
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

    if (!Object.values(EVENT_MEDIA_TYPES).includes(d.media_tipo)) {
      errors.push({
        field: 'media_tipo',
        message: 'El tipo multimedia del evento debe ser NONE, VIDEO o POSTING.'
      });
    }

    if (d.media_url !== null) {
      if (d.media_url.length > 500 || !/^(?:[hH][tT][tT][pP][sS]?:\/\/|\/uploads\/)/.test(d.media_url)) {
        errors.push({
          field: 'media_url',
          message: 'La URL multimedia debe iniciar con http(s):// o /uploads/ y tener máximo 500 caracteres.'
        });
      }
    }

    if (d.posting_contenido !== null) {
      if (d.posting_contenido.length > 5000) {
        errors.push({
          field: 'posting_contenido',
          message: 'El contenido del posting no debe superar los 5000 caracteres.'
        });
      }
      if (/<[a-z][\s\S]*>/i.test(d.posting_contenido)) {
        errors.push({
          field: 'posting_contenido',
          message: 'No se permiten etiquetas HTML en el contenido del posting.'
        });
      }
    }

    if (d.media_url && d.media_url.startsWith('/uploads/')) {
      if (
        !/^\/uploads\/events\/[^/?#\\]+$/.test(d.media_url) ||
        d.media_url.includes('..') ||
        d.media_url.includes('%2e') ||
        d.media_url.includes('%2E') ||
        d.media_url.slice('/uploads/events/'.length).startsWith('.')
      ) {
        errors.push({
          field: 'media_url',
          message: 'Los archivos locales de eventos deben ubicarse bajo /uploads/events/.'
        });
      } else if (d.media_tipo === EVENT_MEDIA_TYPES.VIDEO && !/\.(mp4|webm)$/i.test(d.media_url)) {
        errors.push({
          field: 'media_url',
          message: 'Un evento de tipo VIDEO no puede referenciar una imagen local; debe usar un video MP4 o WEBM.'
        });
      } else if (d.media_tipo === EVENT_MEDIA_TYPES.POSTING && !/\.(png|jpe?g|webp|gif)$/i.test(d.media_url)) {
        errors.push({
          field: 'media_url',
          message: 'Un evento de tipo POSTING solo puede referenciar una imagen local PNG, JPEG, WEBP o GIF.'
        });
      }
    }

    if (d.media_tipo === EVENT_MEDIA_TYPES.VIDEO && !d.media_url) {
      errors.push({
        field: 'media_url',
        message: 'Un evento de tipo VIDEO requiere media_url o archivo de video.'
      });
    }

    if (d.media_tipo === EVENT_MEDIA_TYPES.POSTING && !d.posting_contenido && !d.media_url) {
      errors.push({
        field: 'posting_contenido',
        message: 'Un evento de tipo POSTING requiere contenido de texto o imagen.'
      });
    }

    if (errors.length > 0) {
      throw new ValidationError('Error de validación en la entidad Evento/Promoción (Barrera 2).', errors);
    }
  }
}
