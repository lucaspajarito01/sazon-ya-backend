import { pickFields } from './authValidator.js';
import { ValidationError } from '../utils/AppError.js';
import { EVENT_STATES } from '../entities/EventEntity.js';

const URL_REGEX = /^(?:[hH][tT][tT][pP][sS]?:\/\/|\/uploads\/)/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HTML_TAG_REGEX = /<[a-z][\s\S]*>/i;

function isBlankValue(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function assertPlainObjectBody(body, message) {
  if (body !== undefined && (!body || typeof body !== 'object' || Array.isArray(body))) {
    throw new ValidationError(message, [{ field: 'body', message: 'El cuerpo debe ser un objeto válido.' }]);
  }
}

export function validateProductPayload(body = {}, isUpdate = false) {
  assertPlainObjectBody(body, 'Datos de producto inválidos (Barrera 1).');
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

  if (payload.categoria_id !== undefined) {
    if (typeof payload.categoria_id === 'string' && payload.categoria_id.trim() === '') {
      if (isUpdate) {
        delete payload.categoria_id;
      } else {
        errors.push({ field: 'categoria_id', message: 'La categoría es obligatoria y debe ser un entero positivo.' });
      }
    } else {
      const catId = Number(payload.categoria_id);
      if (!Number.isSafeInteger(catId) || catId <= 0) {
        errors.push({ field: 'categoria_id', message: 'La categoría debe ser un entero positivo.' });
      } else {
        payload.categoria_id = catId;
      }
    }
  } else if (!isUpdate) {
    errors.push({ field: 'categoria_id', message: 'La categoría es obligatoria.' });
  }

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

  if (payload.costo_unitario !== undefined) {
    if (isBlankValue(payload.costo_unitario)) {
      if (isUpdate) {
        delete payload.costo_unitario;
      } else {
        errors.push({ field: 'costo_unitario', message: 'El costo unitario es obligatorio.' });
      }
    } else {
      const costo = Number(payload.costo_unitario);
      if (Number.isNaN(costo) || costo < 0) {
        errors.push({ field: 'costo_unitario', message: 'El costo unitario debe ser un número mayor o igual a 0.' });
      }
      payload.costo_unitario = costo;
    }
  } else if (!isUpdate) {
    errors.push({ field: 'costo_unitario', message: 'El costo unitario es obligatorio.' });
  }

  if (payload.precio_venta !== undefined) {
    if (isBlankValue(payload.precio_venta)) {
      if (isUpdate) {
        delete payload.precio_venta;
      } else {
        errors.push({ field: 'precio_venta', message: 'El precio de venta es obligatorio.' });
      }
    } else {
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
  } else if (!isUpdate) {
    errors.push({ field: 'precio_venta', message: 'El precio de venta es obligatorio.' });
  }

  if (payload.stock_actual !== undefined) {
    if (isBlankValue(payload.stock_actual)) {
      delete payload.stock_actual;
    } else {
      const stock = Number(payload.stock_actual);
      if (!Number.isSafeInteger(stock) || stock < 0) {
        errors.push({ field: 'stock_actual', message: 'El stock actual debe ser un entero >= 0.' });
      }
      payload.stock_actual = stock;
    }
  }

  if (payload.stock_minimo !== undefined) {
    if (isBlankValue(payload.stock_minimo)) {
      delete payload.stock_minimo;
    } else {
      const min = Number(payload.stock_minimo);
      if (!Number.isSafeInteger(min) || min < 0) {
        errors.push({ field: 'stock_minimo', message: 'El stock mínimo debe ser un entero >= 0.' });
      }
      payload.stock_minimo = min;
    }
  }

  if (payload.estado !== undefined && typeof payload.estado === 'string' && payload.estado.trim() === '') {
    delete payload.estado;
  }

  if (payload.imagen_url !== undefined) {
    if (payload.imagen_url === null) {
      if (isUpdate) {
        delete payload.imagen_url;
      }
    } else if (typeof payload.imagen_url === 'string') {
      const trimmedUrl = payload.imagen_url.trim();
      if (trimmedUrl === '') {
        if (isUpdate) {
          delete payload.imagen_url;
        } else {
          payload.imagen_url = null;
        }
      } else if (trimmedUrl.length > 500 || !URL_REGEX.test(trimmedUrl)) {
        errors.push({
          field: 'imagen_url',
          message: 'La URL de imagen debe iniciar con http(s):// o /uploads/ y tener máximo 500 caracteres.'
        });
      } else {
        payload.imagen_url = trimmedUrl;
      }
    } else {
      errors.push({ field: 'imagen_url', message: 'La URL de imagen debe ser una cadena de texto válida.' });
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Datos de producto inválidos (Barrera 1).', errors);
  }
  return payload;
}

export function validateCondimentPayload(body = {}, isUpdate = false) {
  assertPlainObjectBody(body, 'Datos de condimento/insumo inválidos (Barrera 1).');
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

export function validateEventPayload(body = {}, isUpdate = false) {
  assertPlainObjectBody(body, 'Datos de evento/promoción inválidos (Barrera 1).');
  const allowed = [
    'titulo',
    'descripcion',
    'tipo',
    'porcentaje_descuento',
    'premio_sorteo',
    'cupo_maximo',
    'fecha_inicio',
    'fecha_fin',
    'estado',
    'media_tipo',
    'media_url',
    'posting_contenido'
  ];
  const payload = pickFields(body, allowed);
  const errors = [];

  if (!isUpdate || payload.titulo !== undefined) {
    const titulo = typeof payload.titulo === 'string' ? payload.titulo.trim() : '';
    if (!titulo || titulo.length < 5 || titulo.length > 150) {
      errors.push({ field: 'titulo', message: 'El título debe tener entre 5 y 150 caracteres.' });
    }
    payload.titulo = titulo;
  }

  if (!isUpdate || payload.descripcion !== undefined) {
    const descripcion = typeof payload.descripcion === 'string' ? payload.descripcion.trim() : '';
    if (!descripcion || descripcion.length < 10) {
      errors.push({ field: 'descripcion', message: 'La descripción debe tener al menos 10 caracteres.' });
    }
    payload.descripcion = descripcion;
  }

  if (!isUpdate) {
    if (!payload.fecha_inicio || !payload.fecha_fin) {
      errors.push({ field: 'fecha_fin', message: 'Las fechas de inicio y fin son obligatorias.' });
    }
  }

  if (payload.fecha_inicio !== undefined && Number.isNaN(new Date(payload.fecha_inicio).getTime())) {
    errors.push({ field: 'fecha_inicio', message: 'La fecha de inicio es inválida.' });
  }
  if (payload.fecha_fin !== undefined && Number.isNaN(new Date(payload.fecha_fin).getTime())) {
    errors.push({ field: 'fecha_fin', message: 'La fecha de finalización es inválida.' });
  }

  if (payload.porcentaje_descuento !== undefined) {
    if (isBlankValue(payload.porcentaje_descuento)) {
      if (isUpdate) {
        delete payload.porcentaje_descuento;
      } else {
        payload.porcentaje_descuento = 0;
      }
    } else {
      const pct = Number(payload.porcentaje_descuento);
      if (Number.isNaN(pct) || pct < 0 || pct > 100) {
        errors.push({ field: 'porcentaje_descuento', message: 'El descuento debe estar entre 0 y 100.' });
      }
      payload.porcentaje_descuento = pct;
    }
  }

  if (payload.cupo_maximo !== undefined) {
    if (isBlankValue(payload.cupo_maximo)) {
      payload.cupo_maximo = null;
    } else {
      const cupo = Number(payload.cupo_maximo);
      if (!Number.isSafeInteger(cupo) || cupo <= 0) {
        errors.push({ field: 'cupo_maximo', message: 'El cupo máximo debe ser un entero positivo.' });
      }
      payload.cupo_maximo = cupo;
    }
  }

  if (payload.premio_sorteo !== undefined) {
    payload.premio_sorteo = isBlankValue(payload.premio_sorteo) ? null : String(payload.premio_sorteo).trim();
  }

  if (payload.tipo !== undefined) {
    if (isBlankValue(payload.tipo)) {
      delete payload.tipo;
    } else {
      const tipo = String(payload.tipo).trim().toUpperCase();
      if (!['EVENTO', 'PROMOCION', 'SORTEO'].includes(tipo)) {
        errors.push({ field: 'tipo', message: 'El tipo debe ser EVENTO, PROMOCION o SORTEO.' });
      }
      payload.tipo = tipo;
    }
  }

  if (payload.estado !== undefined) {
    if (isBlankValue(payload.estado)) {
      delete payload.estado;
    } else {
      const estado = String(payload.estado).trim().toUpperCase();
      if (!['PROGRAMADO', 'ACTIVO', 'FINALIZADO', 'CANCELADO'].includes(estado)) {
        errors.push({ field: 'estado', message: 'El estado del evento es inválido.' });
      }
      payload.estado = estado;
    }
  }

  if (payload.media_tipo !== undefined) {
    if (isBlankValue(payload.media_tipo)) {
      if (isUpdate) {
        delete payload.media_tipo;
      } else {
        payload.media_tipo = 'NONE';
      }
    } else {
      const mediaTipo = String(payload.media_tipo).trim().toUpperCase();
      if (!['NONE', 'VIDEO', 'POSTING'].includes(mediaTipo)) {
        errors.push({ field: 'media_tipo', message: 'El tipo multimedia debe ser NONE, VIDEO o POSTING.' });
      }
      payload.media_tipo = mediaTipo;
    }
  }

  if (payload.media_url !== undefined) {
    if (payload.media_url === null) {
      payload.media_url = null;
    } else if (typeof payload.media_url === 'string') {
      const trimmed = payload.media_url.trim();
      if (trimmed === '') {
        if (isUpdate && payload.media_tipo !== 'NONE') {
          delete payload.media_url;
        } else {
          payload.media_url = null;
        }
      } else if (trimmed.length > 500 || !URL_REGEX.test(trimmed)) {
        errors.push({
          field: 'media_url',
          message: 'La URL multimedia debe iniciar con http(s):// o /uploads/ y tener máximo 500 caracteres.'
        });
      } else {
        payload.media_url = trimmed;
      }
    } else {
      errors.push({ field: 'media_url', message: 'La URL multimedia debe ser texto válido.' });
    }
  }

  if (payload.posting_contenido !== undefined) {
    if (isBlankValue(payload.posting_contenido)) {
      payload.posting_contenido = null;
    } else {
      const text = String(payload.posting_contenido).trim();
      if (text.length > 5000) {
        errors.push({
          field: 'posting_contenido',
          message: 'El contenido del posting no debe superar los 5000 caracteres.'
        });
      }
      if (HTML_TAG_REGEX.test(text)) {
        errors.push({
          field: 'posting_contenido',
          message: 'No se permiten etiquetas HTML en el contenido del posting.'
        });
      }
      payload.posting_contenido = text;
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Datos de evento/promoción inválidos (Barrera 1).', errors);
  }
  return payload;
}

export function validateEventStatusPayload(body = {}) {
  const payload = pickFields(body, ['estado']);
  const raw = payload.estado;
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new ValidationError('Datos de estado de evento inválidos (Barrera 1).', [
      { field: 'estado', message: 'El estado del evento es obligatorio.' }
    ]);
  }
  const normalized = raw.trim().toUpperCase();
  if (!Object.values(EVENT_STATES).includes(normalized)) {
    throw new ValidationError('Datos de estado de evento inválidos (Barrera 1).', [
      {
        field: 'estado',
        message: 'El estado debe ser PROGRAMADO, ACTIVO, FINALIZADO o CANCELADO.'
      }
    ]);
  }
  return { estado: normalized };
}

export function validateContactPayload(body = {}) {
  const payload = pickFields(body, ['nombre', 'correo', 'asunto', 'mensaje']);
  const errors = [];

  const nombre = typeof payload.nombre === 'string' ? payload.nombre.trim().replace(/\s+/g, ' ') : '';
  const correo = typeof payload.correo === 'string' ? payload.correo.trim().toLowerCase() : '';
  const asunto = typeof payload.asunto === 'string' ? payload.asunto.trim() : '';
  const mensaje = typeof payload.mensaje === 'string' ? payload.mensaje.trim() : '';

  if (!nombre || nombre.length < 2 || nombre.length > 100) {
    errors.push({ field: 'nombre', message: 'El nombre debe tener entre 2 y 100 caracteres.' });
  }
  if (!correo || correo.length > 150 || !EMAIL_REGEX.test(correo)) {
    errors.push({ field: 'correo', message: 'Ingresa un correo electrónico válido.' });
  }
  if (!asunto || asunto.length < 3 || asunto.length > 150) {
    errors.push({ field: 'asunto', message: 'El asunto debe tener entre 3 y 150 caracteres.' });
  }
  if (!mensaje || mensaje.length < 10 || mensaje.length > 1000) {
    errors.push({ field: 'mensaje', message: 'El mensaje debe tener entre 10 y 1000 caracteres.' });
  }
  if (HTML_TAG_REGEX.test(nombre) || HTML_TAG_REGEX.test(asunto) || HTML_TAG_REGEX.test(mensaje)) {
    errors.push({ field: 'mensaje', message: 'No se permiten etiquetas HTML en el mensaje de contacto.' });
  }

  if (errors.length > 0) {
    throw new ValidationError('Datos de contacto inválidos (Barrera 1).', errors);
  }

  return { nombre, correo, asunto, mensaje };
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
