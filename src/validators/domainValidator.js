import { pickFields } from './authValidator.js';
import { ValidationError } from '../utils/AppError.js';

export function validateProductPayload(body = {}, isUpdate = false) {
  const allowed = [
    'categoria_id',
    'nombre',
    'descripcion',
    'costo_unitario',
    'precio_venta',
    'stock_actual',
    'stock_minimo',
    'estado',
    'imagen_url'
  ];
  const payload = pickFields(body, allowed);
  const errors = [];

  if (!isUpdate || payload.nombre !== undefined) {
    const nombre = typeof payload.nombre === 'string' ? payload.nombre.trim() : '';
    if (!nombre || nombre.length < 3 || nombre.length > 120) {
      errors.push({ field: 'nombre', message: 'El nombre del producto debe tener entre 3 y 120 caracteres.' });
    }
    payload.nombre = nombre;
  }

  if (!isUpdate || payload.descripcion !== undefined) {
    const descripcion = typeof payload.descripcion === 'string' ? payload.descripcion.trim() : '';
    if (!descripcion || descripcion.length < 10) {
      errors.push({ field: 'descripcion', message: 'La descripción debe tener mínimo 10 caracteres.' });
    }
    payload.descripcion = descripcion;
  }

  if (!isUpdate || payload.costo_unitario !== undefined) {
    const costo = Number(payload.costo_unitario);
    if (Number.isNaN(costo) || costo < 0) {
      errors.push({ field: 'costo_unitario', message: 'El costo unitario debe ser un número mayor o igual a 0.' });
    }
    payload.costo_unitario = costo;
  }

  if (!isUpdate || payload.precio_venta !== undefined) {
    const precio = Number(payload.precio_venta);
    if (Number.isNaN(precio) || precio <= 0) {
      errors.push({ field: 'precio_venta', message: 'El precio de venta debe ser mayor a 0.' });
    }
    if (payload.costo_unitario !== undefined && precio <= payload.costo_unitario) {
      errors.push({
        field: 'precio_venta',
        message: 'El precio de venta debe ser mayor al costo unitario.'
      });
    }
    payload.precio_venta = precio;
  }

  if (payload.stock_actual !== undefined) {
    const stock = Number(payload.stock_actual);
    if (!Number.isSafeInteger(stock) || stock < 0) {
      errors.push({ field: 'stock_actual', message: 'El stock actual debe ser un entero >= 0.' });
    }
    payload.stock_actual = stock;
  }

  if (payload.stock_minimo !== undefined) {
    const min = Number(payload.stock_minimo);
    if (!Number.isSafeInteger(min) || min < 0) {
      errors.push({ field: 'stock_minimo', message: 'El stock mínimo debe ser un entero >= 0.' });
    }
    payload.stock_minimo = min;
  }

  if (errors.length > 0) {
    throw new ValidationError('Datos de producto inválidos (Barrera 1).', errors);
  }
  return payload;
}

export function validateCondimentPayload(body = {}, isUpdate = false) {
  const allowed = ['nombre', 'tipo', 'unidad_medida', 'stock_actual', 'stock_minimo', 'estado'];
  const payload = pickFields(body, allowed);
  const errors = [];

  if (!isUpdate || payload.nombre !== undefined) {
    const nombre = typeof payload.nombre === 'string' ? payload.nombre.trim() : '';
    if (!nombre || nombre.length < 2) {
      errors.push({ field: 'nombre', message: 'El nombre del condimento/insumo es obligatorio.' });
    }
    payload.nombre = nombre;
  }

  if (payload.stock_actual !== undefined) {
    const stock = Number(payload.stock_actual);
    if (Number.isNaN(stock) || stock < 0) {
      errors.push({ field: 'stock_actual', message: 'El stock actual debe ser >= 0.' });
    }
    payload.stock_actual = stock;
  }

  if (errors.length > 0) {
    throw new ValidationError('Datos de condimento/insumo inválidos (Barrera 1).', errors);
  }
  return payload;
}

export function validateEventPayload(body = {}) {
  const allowed = [
    'titulo',
    'descripcion',
    'tipo',
    'porcentaje_descuento',
    'premio_sorteo',
    'cupo_maximo',
    'fecha_inicio',
    'fecha_fin',
    'estado'
  ];
  const payload = pickFields(body, allowed);
  const errors = [];

  if (!payload.titulo || String(payload.titulo).trim().length < 5) {
    errors.push({ field: 'titulo', message: 'El título debe tener al menos 5 caracteres.' });
  }
  if (!payload.descripcion || String(payload.descripcion).trim().length < 10) {
    errors.push({ field: 'descripcion', message: 'La descripción debe tener al menos 10 caracteres.' });
  }
  if (!payload.fecha_inicio || !payload.fecha_fin) {
    errors.push({ field: 'fecha_fin', message: 'Las fechas de inicio y fin son obligatorias.' });
  }

  if (errors.length > 0) {
    throw new ValidationError('Datos de evento/promoción inválidos (Barrera 1).', errors);
  }
  return payload;
}

export function validateOrderPayload(body = {}) {
  const payload = pickFields(body, ['items', 'notas_entrega']);
  const errors = [];

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    errors.push({ field: 'items', message: 'El pedido debe contener al menos 1 producto.' });
  } else {
    payload.items.forEach((item, idx) => {
      const prodId = Number(item?.producto_id);
      const qty = Number(item?.cantidad);
      if (!Number.isSafeInteger(prodId) || prodId <= 0) {
        errors.push({ field: `items[${idx}].producto_id`, message: 'ID de producto inválido.' });
      }
      if (!Number.isSafeInteger(qty) || qty < 1 || qty > 50) {
        errors.push({
          field: `items[${idx}].cantidad`,
          message: 'La cantidad por línea debe ser un entero entre 1 y 50.'
        });
      }
    });
  }

  if (errors.length > 0) {
    throw new ValidationError('Datos de pedido inválidos (Barrera 1).', errors);
  }

  return {
    items: payload.items.map((i) => ({
      producto_id: Number(i.producto_id),
      cantidad: Number(i.cantidad)
    })),
    notasEntrega: payload.notas_entrega ? String(payload.notas_entrega).trim() : null
  };
}
