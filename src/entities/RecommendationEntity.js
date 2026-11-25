import { BaseEntity } from './BaseEntity.js';
import { ValidationError } from '../utils/AppError.js';

export class RecommendationEntity extends BaseEntity {
  constructor({
    id = null,
    usuario_id,
    nombre_sugerido,
    descripcion_ingredientes,
    estado = 'PENDIENTE',
    creado_en = null
  }) {
    super(id, {
      usuario_id: Number(usuario_id),
      nombre_sugerido: typeof nombre_sugerido === 'string' ? nombre_sugerido.trim() : '',
      descripcion_ingredientes: typeof descripcion_ingredientes === 'string' ? descripcion_ingredientes.trim() : '',
      estado: estado || 'PENDIENTE',
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
    if (!d.nombre_sugerido || d.nombre_sugerido.length < 3 || d.nombre_sugerido.length > 120) {
      errors.push({
        field: 'nombre_sugerido',
        message: 'El nombre sugerido del producto debe tener entre 3 y 120 caracteres.'
      });
    }
    if (!d.descripcion_ingredientes || d.descripcion_ingredientes.length < 15 || d.descripcion_ingredientes.length > 600) {
      errors.push({
        field: 'descripcion_ingredientes',
        message: 'Describe los ingredientes o preparación entre 15 y 600 caracteres.'
      });
    }
    if (/<[a-z][\s\S]*>/i.test(d.nombre_sugerido) || /<[a-z][\s\S]*>/i.test(d.descripcion_ingredientes)) {
      errors.push({
        field: 'descripcion_ingredientes',
        message: 'No se permiten etiquetas HTML en la recomendación.'
      });
    }

    if (errors.length > 0) {
      throw new ValidationError('Error de validación en la entidad Recomendación (Barrera 2).', errors);
    }
  }
}
