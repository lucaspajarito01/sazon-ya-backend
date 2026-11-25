import { BaseEntity } from './BaseEntity.js';
import { PRODUCT_STATES } from './ProductEntity.js';
import { ValidationError } from '../utils/AppError.js';

export const CONDIMENT_TYPES = Object.freeze({
  CONDIMENTO: 'CONDIMENTO',
  SALSA: 'SALSA',
  INGREDIENTE: 'INGREDIENTE',
  EMPAQUE: 'EMPAQUE'
});

export class CondimentEntity extends BaseEntity {
  constructor({
    id = null,
    nombre,
    tipo = CONDIMENT_TYPES.CONDIMENTO,
    unidad_medida = 'porcion',
    stock_actual = 0,
    stock_minimo = 10,
    estado = null,
    actualizado_en = null
  }) {
    const stock = Number(Number(stock_actual).toFixed(2));
    const min = Number(Number(stock_minimo).toFixed(2));
    const resolvedState =
      estado === PRODUCT_STATES.INACTIVO
        ? PRODUCT_STATES.INACTIVO
        : stock <= 0
          ? PRODUCT_STATES.AGOTADO
          : stock <= min
            ? PRODUCT_STATES.STOCK_BAJO
            : PRODUCT_STATES.DISPONIBLE;

    super(id, {
      nombre: typeof nombre === 'string' ? nombre.trim() : '',
      tipo: tipo || CONDIMENT_TYPES.CONDIMENTO,
      unidad_medida: typeof unidad_medida === 'string' ? unidad_medida.trim() : 'porcion',
      stock_actual: stock,
      stock_minimo: min,
      estado: resolvedState,
      actualizado_en: actualizado_en || new Date().toISOString()
    });
    this.validate();
  }

  validate() {
    const errors = [];
    const d = this.getData();

    if (!d.nombre || d.nombre.length < 2 || d.nombre.length > 100) {
      errors.push({ field: 'nombre', message: 'El nombre del condimento/insumo debe tener entre 2 y 100 caracteres.' });
    }
    if (!Object.values(CONDIMENT_TYPES).includes(d.tipo)) {
      errors.push({ field: 'tipo', message: 'Tipo de condimento/insumo inválido.' });
    }
    if (Number.isNaN(d.stock_actual) || d.stock_actual < 0) {
      errors.push({ field: 'stock_actual', message: 'El stock actual no puede ser negativo.' });
    }
    if (Number.isNaN(d.stock_minimo) || d.stock_minimo < 0) {
      errors.push({ field: 'stock_minimo', message: 'El stock mínimo no puede ser negativo.' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Error de validación en la entidad Condimento/Insumo (Barrera 2).', errors);
    }
  }
}
