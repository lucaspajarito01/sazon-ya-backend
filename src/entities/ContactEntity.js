import { BaseEntity } from './BaseEntity.js';
import { ValidationError } from '../utils/AppError.js';

export const CONTACT_STATES = Object.freeze({
  PENDIENTE: 'PENDIENTE',
  LEIDO: 'LEIDO',
  RESPONDIDO: 'RESPONDIDO'
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HTML_TAG_REGEX = /<[a-z][\s\S]*>/i;

export class ContactEntity extends BaseEntity {
  constructor({
    id = null,
    nombre,
    correo,
    asunto,
    mensaje,
    estado = CONTACT_STATES.PENDIENTE,
    creado_en = null
  }) {
    super(id, {
      nombre: typeof nombre === 'string' ? nombre.trim().replace(/\s+/g, ' ') : '',
      correo: typeof correo === 'string' ? correo.trim().toLowerCase() : '',
      asunto: typeof asunto === 'string' ? asunto.trim() : '',
      mensaje: typeof mensaje === 'string' ? mensaje.trim() : '',
      estado: estado ? String(estado).trim().toUpperCase() : CONTACT_STATES.PENDIENTE,
      creado_en: creado_en || new Date().toISOString()
    });
    this.validate();
  }

  validate() {
    const errors = [];
    const d = this.getData();

    if (!d.nombre || d.nombre.length < 2 || d.nombre.length > 100) {
      errors.push({ field: 'nombre', message: 'El nombre debe tener entre 2 y 100 caracteres.' });
    }
    if (!d.correo || d.correo.length > 150 || !EMAIL_REGEX.test(d.correo)) {
      errors.push({ field: 'correo', message: 'El correo electrónico no tiene un formato válido.' });
    }
    if (!d.asunto || d.asunto.length < 3 || d.asunto.length > 150) {
      errors.push({ field: 'asunto', message: 'El asunto debe tener entre 3 y 150 caracteres.' });
    }
    if (!d.mensaje || d.mensaje.length < 10 || d.mensaje.length > 1000) {
      errors.push({ field: 'mensaje', message: 'El mensaje debe tener entre 10 y 1000 caracteres.' });
    }
    if (HTML_TAG_REGEX.test(d.nombre) || HTML_TAG_REGEX.test(d.asunto) || HTML_TAG_REGEX.test(d.mensaje)) {
      errors.push({ field: 'mensaje', message: 'No se permiten etiquetas HTML en el formulario de contacto.' });
    }
    if (!Object.values(CONTACT_STATES).includes(d.estado)) {
      errors.push({ field: 'estado', message: 'Estado de mensaje de contacto inválido.' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Error de validación en la entidad Contacto (Barrera 2).', errors);
    }
  }
}
