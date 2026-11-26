import { AppError, ValidationError } from './AppError.js';
import { deleteLocalUpload, saveMediaBuffer } from './imageStorage.js';
import { validateEventPayload, validateProductPayload } from '../validators/domainValidator.js';

export async function persistProductCreate({ body, uploadedMedia, inventoryService }) {
  const clean = validateProductPayload(body, false);
  let savedUrl = null;

  if (uploadedMedia) {
    const saved = await saveMediaBuffer({
      buffer: uploadedMedia.buffer,
      mimetype: uploadedMedia.mimetype,
      category: 'products',
      prefix: 'prod'
    });
    savedUrl = saved.url;
    clean.imagen_url = savedUrl;
  }

  try {
    return await inventoryService.createProduct(clean);
  } catch (err) {
    if (savedUrl) {
      await deleteLocalUpload(savedUrl);
    }
    throw err;
  }
}

export async function persistProductUpdate({ id, body, uploadedMedia, inventoryService }) {
  const clean = validateProductPayload(body, true);
  const existing = await inventoryService.getProductById(id);
  if (!existing) {
    throw new AppError('Producto no encontrado.', 404);
  }

  let savedUrl = null;
  if (uploadedMedia) {
    const saved = await saveMediaBuffer({
      buffer: uploadedMedia.buffer,
      mimetype: uploadedMedia.mimetype,
      category: 'products',
      prefix: 'prod'
    });
    savedUrl = saved.url;
    clean.imagen_url = savedUrl;
  }

  try {
    return await inventoryService.updateProduct(id, clean);
  } catch (err) {
    if (savedUrl) {
      await deleteLocalUpload(savedUrl);
    }
    throw err;
  }
}

function assertEventMediaKindCoherence(targetMediaTipo, savedKind) {
  if (targetMediaTipo === 'VIDEO' && savedKind !== 'video') {
    throw new ValidationError('Un evento de tipo VIDEO requiere un archivo de video MP4 o WEBM.', [
      { field: 'media_file', message: 'El archivo subido debe ser un video MP4 o WEBM.' }
    ]);
  }
  if (targetMediaTipo === 'POSTING' && savedKind !== 'image') {
    throw new ValidationError('Un evento de tipo POSTING solo admite archivos de imagen.', [
      { field: 'media_file', message: 'El archivo subido para POSTING debe ser una imagen.' }
    ]);
  }
}

export async function persistEventCreate({ body, uploadedMedia, adminId, eventService }) {
  const clean = validateEventPayload(body, false);
  let savedUrl = null;

  if (uploadedMedia) {
    const saved = await saveMediaBuffer({
      buffer: uploadedMedia.buffer,
      mimetype: uploadedMedia.mimetype,
      category: 'events',
      prefix: 'evt'
    });
    savedUrl = saved.url;

    try {
      if (!clean.media_tipo || clean.media_tipo === 'NONE') {
        clean.media_tipo = saved.kind === 'video' ? 'VIDEO' : 'POSTING';
      } else {
        assertEventMediaKindCoherence(clean.media_tipo, saved.kind);
      }
      clean.media_url = savedUrl;
    } catch (err) {
      await deleteLocalUpload(savedUrl);
      throw err;
    }
  }

  try {
    return await eventService.createEvent(clean, adminId);
  } catch (err) {
    if (savedUrl) {
      await deleteLocalUpload(savedUrl);
    }
    throw err;
  }
}

export async function persistEventUpdate({ id, body, uploadedMedia, eventService }) {
  const clean = validateEventPayload(body, true);
  const existing = await eventService.getEventById(id);
  if (!existing) {
    throw new AppError('Evento o promoción no encontrado.', 404);
  }

  let savedUrl = null;
  if (uploadedMedia) {
    const saved = await saveMediaBuffer({
      buffer: uploadedMedia.buffer,
      mimetype: uploadedMedia.mimetype,
      category: 'events',
      prefix: 'evt'
    });
    savedUrl = saved.url;

    try {
      const targetMediaTipo = clean.media_tipo || existing.media_tipo || 'NONE';
      if (targetMediaTipo === 'NONE') {
        clean.media_tipo = saved.kind === 'video' ? 'VIDEO' : 'POSTING';
      } else {
        assertEventMediaKindCoherence(targetMediaTipo, saved.kind);
      }
      clean.media_url = savedUrl;
    } catch (err) {
      await deleteLocalUpload(savedUrl);
      throw err;
    }
  }

  try {
    return await eventService.updateEvent(id, clean);
  } catch (err) {
    if (savedUrl) {
      await deleteLocalUpload(savedUrl);
    }
    throw err;
  }
}
