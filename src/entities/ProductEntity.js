import { BaseEntity } from './BaseEntity.js';
import { ValidationError } from '../utils/AppError.js';

export const PRODUCT_STATES = Object.freeze({
  DISPONIBLE: 'DISPONIBLE',
  STOCK_BAJO: 'STOCK_BAJO',
  AGOTADO: 'AGOTADO',
  INACTIVO: 'INACTIVO'
});

export class ProductEntity extends BaseEntity {
  constructor({
    id = null,
    categoria_id = 1,
    nombre,
    descripcion,
    costo_unitario,
    precio_venta,
    stock_actual = 0,
    stock_minimo = 5,
    estado = null,
    imagen_url = null,
    promedio_estrellas = 0,
    total_resenas = 0,
    creado_en = null
  }) {
    const stock = Number(stock_actual);
    const min = Number(stock_minimo);
    const computedState = ProductEntity.resolveInventoryState(stock, min, estado);

    super(id, {
      categoria_id: Number(categoria_id),
      nombre: typeof nombre === 'string' ? nombre.trim() : '',
      descripcion: typeof descripcion === 'string' ? descripcion.trim() : '',
      costo_unitario: Number(Number(costo_unitario).toFixed(2)),
      precio_venta: Number(Number(precio_venta).toFixed(2)),
      stock_actual: stock,
      stock_minimo: min,
      estado: computedState,
      imagen_url: imagen_url ? String(imagen_url).trim() : null,
      promedio_estrellas: Number(Number(promedio_estrellas || 0).toFixed(2)),
      total_resenas: Number(total_resenas || 0),
      creado_en: creado_en || new Date().toISOString()
    });
    this.validate();
  }

  static resolveInventoryState(stockActual, stockMinimo, requestedState = null) {
    if (requestedState === PRODUCT_STATES.INACTIVO) {
      return PRODUCT_STATES.INACTIVO;
    }
    if (stockActual <= 0) {
      return PRODUCT_STATES.AGOTADO;
    }
    if (stockActual <= stockMinimo) {
      return PRODUCT_STATES.STOCK_BAJO;
    }
    return PRODUCT_STATES.DISPONIBLE;
  }

  validate() {
    const errors = [];
    const d = this.getData();

    if (!Number.isSafeInteger(d.categoria_id) || d.categoria_id <= 0) {
      errors.push({ field: 'categoria_id', message: 'La categoría es obligatoria.' });
    }
    if (!d.nombre || d.nombre.length < 3 || d.nombre.length > 120) {
      errors.push({ field: 'nombre', message: 'El nombre del producto debe tener entre 3 y 120 caracteres.' });
    }
    if (!d.descripcion || d.descripcion.length < 10) {
      errors.push({ field: 'descripcion', message: 'La descripción debe tener al menos 10 caracteres.' });
    }
    if (Number.isNaN(d.costo_unitario) || d.costo_unitario < 0) {
      errors.push({ field: 'costo_unitario', message: 'El costo unitario debe ser mayor o igual a 0.' });
    }
    if (Number.isNaN(d.precio_venta) || d.precio_venta <= d.costo_unitario) {
      errors.push({
        field: 'precio_venta',
        message: 'El precio de venta debe ser estrictamente mayor al costo unitario para garantizar margen.'
      });
    }
    if (!Number.isSafeInteger(d.stock_actual) || d.stock_actual < 0) {
      errors.push({ field: 'stock_actual', message: 'El stock actual debe ser un entero mayor o igual a 0.' });
    }
    if (!Number.isSafeInteger(d.stock_minimo) || d.stock_minimo < 0) {
      errors.push({ field: 'stock_minimo', message: 'El stock mínimo debe ser un entero mayor o igual a 0.' });
    }
    if (!Object.values(PRODUCT_STATES).includes(d.estado)) {
      errors.push({ field: 'estado', message: 'Estado de inventario de producto inválido.' });
    }
    if (d.imagen_url !== null) {
      if (d.imagen_url.length > 500 || !/^(?:[hH][tT][tT][pP][sS]?:\/\/|\/uploads\/)/.test(d.imagen_url)) {
        errors.push({
          field: 'imagen_url',
          message: 'La URL de la imagen debe iniciar con http(s):// o /uploads/ y tener máximo 500 caracteres.'
        });
      } else if (d.imagen_url.startsWith('/uploads/')) {
        if (
          !/^\/uploads\/products\/[^/?#\\]+$/.test(d.imagen_url) ||
          d.imagen_url.includes('..') ||
          d.imagen_url.includes('%2e') ||
          d.imagen_url.includes('%2E') ||
          d.imagen_url.slice('/uploads/products/'.length).startsWith('.') ||
          !/\.(png|jpe?g|webp|gif)$/i.test(d.imagen_url)
        ) {
          errors.push({
            field: 'imagen_url',
            message:
              'Las imágenes locales de productos deben ubicarse bajo /uploads/products/ con formato PNG, JPEG, WEBP o GIF.'
          });
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Error de validación en la entidad Producto (Barrera 2).', errors);
    }
  }
}
