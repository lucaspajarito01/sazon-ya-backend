import { BaseEntity } from './BaseEntity.js';
import { ValidationError } from '../utils/AppError.js';

export class ReviewEntity extends BaseEntity {
  constructor({ id = null, usuario_id, producto_id, estrellas, comentario, creado_en = null }) {
    super(id, {
      usuario_id: Number(usuario_id),
      producto_id: Number(producto_id),
      estrellas: Number(estrellas),
      comentario: typeof comentario === 'string' ? comentario.trim() : '',
      creado_en: creado_en || new Date().toISOString()
    });
    this.validate();
  }

  validate() {
    const errors = [];
    const d = this.getData();

    if (!Number.isSafeInteger(d.usuario_id) || d.usuario_id <= 0) {
      errors.push({ field: 'usuario_id', message: 'El usuario es obligatorio.' });
    }
    if (!Number.isSafeInteger(d.producto_id) || d.producto_id <= 0) {
      errors.push({ field: 'producto_id', message: 'El producto es obligatorio.' });
    }
    if (!Number.isSafeInteger(d.estrellas) || d.estrellas < 1 || d.estrellas > 5) {
      errors.push({ field: 'estrellas', message: 'La calificación debe ser un número entero entre 1 y 5 estrellas.' });
    }
    if (!d.comentario || d.comentario.length < 5 || d.comentario.length > 500) {
      errors.push({ field: 'comentario', message: 'La reseña debe tener entre 5 y 500 caracteres.' });
    }
    if (/<[a-z][\s\S]*>/i.test(d.comentario)) {
      errors.push({ field: 'comentario', message: 'No se permiten etiquetas HTML en la reseña.' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Error de validación en la entidad Reseña (Barrera 2).', errors);
    }
  }
}
