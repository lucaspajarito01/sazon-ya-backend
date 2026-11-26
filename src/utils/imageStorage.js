import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { AppError } from './AppError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_VIDEO_BYTES = 15 * 1024 * 1024; // 15 MB

const IMAGE_MIME_RULES = Object.freeze({
  'image/jpeg': { ext: 'jpg', kind: 'image', maxBytes: MAX_IMAGE_BYTES },
  'image/png': { ext: 'png', kind: 'image', maxBytes: MAX_IMAGE_BYTES },
  'image/webp': { ext: 'webp', kind: 'image', maxBytes: MAX_IMAGE_BYTES },
  'image/gif': { ext: 'gif', kind: 'image', maxBytes: MAX_IMAGE_BYTES }
});

const VIDEO_MIME_RULES = Object.freeze({
  'video/mp4': { ext: 'mp4', kind: 'video', maxBytes: MAX_VIDEO_BYTES },
  'video/webm': { ext: 'webm', kind: 'video', maxBytes: MAX_VIDEO_BYTES }
});

const EXT_TO_MIME = Object.freeze({
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
});

const ALLOWED_CATEGORIES = new Set(['products', 'events']);

export function getUploadsRoot() {
  const configured = process.env.UPLOADS_DIR;
  if (configured && configured.trim() !== '') {
    return path.resolve(configured.trim());
  }
  return DEFAULT_UPLOADS_ROOT;
}

export function normalizeMimeType(mimetype) {
  if (!mimetype || typeof mimetype !== 'string') return '';
  const base = mimetype.split(';')[0].trim().toLowerCase();
  if (base === 'image/jpg') return 'image/jpeg';
  return base;
}

export function getMimeForExtension(ext) {
  if (!ext || typeof ext !== 'string') return null;
  return EXT_TO_MIME[ext.toLowerCase()] || null;
}

export function detectMagicMime(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;

  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WEBP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  // GIF: GIF87a | GIF89a
  if (buffer.length >= 6) {
    const header6 = buffer.toString('ascii', 0, 6);
    if (header6 === 'GIF87a' || header6 === 'GIF89a') {
      return 'image/gif';
    }
  }

  // MP4: ....ftyp
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    return 'video/mp4';
  }

  // WEBM: 1A 45 DF A3
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return 'video/webm';
  }

  return null;
}

export function validateMediaBuffer({ buffer, mimetype = '', category = 'products' }) {
  if (!ALLOWED_CATEGORIES.has(category)) {
    throw new AppError('Categoría de almacenamiento inválida.', 400);
  }

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new AppError('El archivo multimedia está vacío o es inválido.', 400);
  }

  const maxCategoryBytes = category === 'events' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (buffer.length > maxCategoryBytes) {
    const limitMb = Math.round(maxCategoryBytes / (1024 * 1024));
    throw new AppError(`El archivo excede el tamaño máximo permitido de ${limitMb} MB.`, 413);
  }

  const detectedMime = detectMagicMime(buffer);
  if (!detectedMime) {
    throw new AppError('Formato de archivo no permitido o firma binaria inválida.', 415);
  }

  const rule =
    category === 'events'
      ? IMAGE_MIME_RULES[detectedMime] || VIDEO_MIME_RULES[detectedMime] || null
      : IMAGE_MIME_RULES[detectedMime] || null;

  if (!rule) {
    const msg =
      category === 'products'
        ? 'Solo se permiten imágenes PNG, JPEG, WEBP o GIF para productos.'
        : 'Solo se permiten imágenes (PNG, JPEG, WEBP, GIF) o videos (MP4, WEBM) para eventos.';
    throw new AppError(msg, 415);
  }

  const declaredMime = normalizeMimeType(mimetype);
  if (declaredMime && declaredMime !== detectedMime) {
    throw new AppError('El tipo MIME declarado no coincide con la firma real del archivo.', 415);
  }

  if (buffer.length > rule.maxBytes) {
    const limitMb = Math.round(rule.maxBytes / (1024 * 1024));
    throw new AppError(`El archivo excede el tamaño máximo permitido de ${limitMb} MB.`, 413);
  }

  return {
    mime: detectedMime,
    ext: rule.ext,
    kind: rule.kind
  };
}

export function decodeBase64DataUrl(dataUrl) {
  if (typeof dataUrl !== 'string' || dataUrl.trim() === '') {
    throw new AppError('La cadena Base64 de la imagen está vacía.', 400);
  }

  const trimmed = dataUrl.trim();
  const match = /^data:([a-z0-9.+\/-]+);base64,([A-Za-z0-9+/=\r\n\s]+)$/i.exec(trimmed);
  if (!match) {
    throw new AppError('Formato Base64 inválido. Debe cumplir data:<mime>;base64,<datos>.', 400);
  }

  const mimetype = normalizeMimeType(match[1]);
  const cleanB64 = match[2].replace(/\s+/g, '');
  if (!cleanB64) {
    throw new AppError('El contenido Base64 de la imagen está vacío.', 400);
  }

  const estimatedBytes = Math.floor((cleanB64.length * 3) / 4);
  if (estimatedBytes > MAX_VIDEO_BYTES + 1024 * 1024) {
    throw new AppError('La imagen Base64 excede el tamaño máximo permitido.', 413);
  }

  const buffer = Buffer.from(cleanB64, 'base64');
  if (buffer.length === 0) {
    throw new AppError('No se pudo decodificar la imagen Base64.', 400);
  }

  return { buffer, mimetype };
}

export async function saveMediaBuffer({ buffer, mimetype = '', category = 'products', prefix = null }) {
  const { mime, ext, kind } = validateMediaBuffer({ buffer, mimetype, category });
  const resolvedPrefix = prefix || (category === 'events' ? 'evt' : 'prod');
  const uploadsRoot = getUploadsRoot();
  const targetDir = path.join(uploadsRoot, category);

  await fs.mkdir(targetDir, { recursive: true });

  const filename = `${resolvedPrefix}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  const destPath = path.join(targetDir, filename);
  await fs.writeFile(destPath, buffer);

  return {
    url: `/uploads/${category}/${filename}`,
    kind,
    mime,
    filename,
    filePath: destPath
  };
}

export function resolveSafeUploadPath(urlPath) {
  if (typeof urlPath !== 'string' || urlPath.trim() === '' || urlPath.includes('\0')) {
    throw new AppError('Ruta de archivo inválida.', 400);
  }

  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    throw new AppError('Ruta de archivo con codificación inválida.', 400);
  }

  if (decoded.includes('\0') || decoded.includes('\\')) {
    throw new AppError('Ruta de archivo inválida.', 400);
  }

  const normalized = decoded.replace(/^\/+/, '');
  const subpath = normalized.startsWith('uploads/') ? normalized.slice('uploads/'.length) : normalized;
  if (!subpath || subpath.startsWith('/') || subpath.split('/').some((seg) => seg === '..' || seg === '.' || seg.startsWith('.'))) {
    throw new AppError('Ruta de archivo inválida.', 400);
  }

  const uploadsRoot = getUploadsRoot();
  const resolved = path.resolve(uploadsRoot, subpath);
  const rel = path.relative(uploadsRoot, resolved);

  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new AppError('Ruta de archivo fuera del directorio permitido.', 400);
  }

  const segments = rel.split(path.sep);
  if (segments.length !== 2 || !ALLOWED_CATEGORIES.has(segments[0]) || segments.some((s) => s.startsWith('.'))) {
    throw new AppError('Ruta de archivo inválida.', 400);
  }

  const ext = path.extname(resolved).toLowerCase();
  return {
    resolved,
    ext,
    mime: getMimeForExtension(ext)
  };
}

export async function deleteLocalUpload(publicUrl) {
  if (!publicUrl || typeof publicUrl !== 'string' || !publicUrl.startsWith('/uploads/')) {
    return false;
  }

  try {
    const { resolved } = resolveSafeUploadPath(publicUrl);
    await fs.unlink(resolved);
    return true;
  } catch (err) {
    if (err?.code === 'ENOENT' || err instanceof AppError) {
      return false;
    }
    throw err;
  }
}
