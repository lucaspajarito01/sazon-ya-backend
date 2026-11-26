import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { AppError } from '../utils/AppError.js';
import {
  decodeBase64DataUrl,
  resolveSafeUploadPath,
  validateMediaBuffer
} from '../utils/imageStorage.js';

export function readRawBody(req, maxBytes = 6 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    let settled = false;

    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    req.on('data', (chunk) => {
      if (settled) return;
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buf.length;
      if (totalBytes > maxBytes) {
        chunks.length = 0;
        req.resume();
        fail(new AppError('El archivo o cuerpo de la petición excede el límite permitido.', 413));
        return;
      }
      chunks.push(buf);
    });

    req.on('end', () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks));
    });

    req.on('error', (err) => {
      fail(err);
    });
  });
}

export async function readJsonBody(req, maxBytes = 262144) {
  const rawBuf = await readRawBody(req, maxBytes);
  const raw = rawBuf.toString('utf8');
  if (!raw || !raw.trim()) return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AppError('El cuerpo de la petición contiene JSON malformado.', 400);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new AppError('El cuerpo de la petición debe ser un objeto JSON válido.', 400);
  }
  return parsed;
}

export function parseMultipartBuffer(bodyBuffer, contentTypeHeader) {
  if (!contentTypeHeader || typeof contentTypeHeader !== 'string') {
    throw new AppError('Falta cabecera Content-Type en la petición multipart.', 400);
  }

  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentTypeHeader);
  const boundary = boundaryMatch ? boundaryMatch[1] || boundaryMatch[2] : null;
  if (!boundary) {
    throw new AppError('Cabecera Content-Type multipart inválida: falta boundary.', 400);
  }

  const boundaryBuf = Buffer.from(`--${boundary}`, 'latin1');
  const fields = {};
  const files = [];

  let boundaryIdx = bodyBuffer.indexOf(boundaryBuf);
  if (boundaryIdx === -1) {
    throw new AppError('Cuerpo multipart/form-data inválido o incompleto.', 400);
  }

  while (boundaryIdx !== -1) {
    const afterBoundary = boundaryIdx + boundaryBuf.length;
    if (
      afterBoundary + 2 <= bodyBuffer.length &&
      bodyBuffer[afterBoundary] === 0x2d &&
      bodyBuffer[afterBoundary + 1] === 0x2d
    ) {
      break;
    }

    let partStart = afterBoundary;
    let postBoundaryCrlf = false;
    if (bodyBuffer[partStart] === 0x0d && bodyBuffer[partStart + 1] === 0x0a) {
      partStart += 2;
      postBoundaryCrlf = true;
    } else if (bodyBuffer[partStart] === 0x0a) {
      partStart += 1;
    } else {
      throw new AppError('Delimitador multipart malformado.', 400);
    }

    const nextBoundaryIdx = bodyBuffer.indexOf(boundaryBuf, partStart);
    if (nextBoundaryIdx === -1) {
      throw new AppError('Falta delimitador de cierre en cuerpo multipart.', 400);
    }

    const crlfEnd = bodyBuffer.indexOf(Buffer.from('\r\n\r\n', 'latin1'), partStart);
    const lfEnd = bodyBuffer.indexOf(Buffer.from('\n\n', 'latin1'), partStart);

    const candidates = [];
    if (crlfEnd !== -1 && crlfEnd < nextBoundaryIdx) {
      candidates.push({ idx: crlfEnd, sepLen: 4 });
    }
    if (lfEnd !== -1 && lfEnd < nextBoundaryIdx) {
      candidates.push({ idx: lfEnd, sepLen: 2 });
    }

    if (candidates.length === 0) {
      throw new AppError('Petición multipart inválida: encabezados incompletos.', 400);
    }

    candidates.sort((a, b) => a.idx - b.idx);
    const { idx: headerEnd, sepLen } = candidates[0];

    const headerText = bodyBuffer.subarray(partStart, headerEnd).toString('utf8');
    const partBodyStart = headerEnd + sepLen;

    let partBodyEnd = nextBoundaryIdx;
    if (
      postBoundaryCrlf &&
      partBodyEnd >= partBodyStart + 2 &&
      bodyBuffer[partBodyEnd - 2] === 0x0d &&
      bodyBuffer[partBodyEnd - 1] === 0x0a
    ) {
      partBodyEnd -= 2;
    } else if (partBodyEnd >= partBodyStart + 1 && bodyBuffer[partBodyEnd - 1] === 0x0a) {
      partBodyEnd -= 1;
    }

    const partBody = bodyBuffer.subarray(partBodyStart, partBodyEnd);

    let fieldName = null;
    let filename;
    let partMime = '';

    for (const line of headerText.split(/\r?\n/)) {
      const lower = line.toLowerCase();
      if (lower.startsWith('content-disposition:')) {
        const nameMatch = /;\s*name="([^"]*)"/i.exec(line);
        if (nameMatch) fieldName = nameMatch[1];
        const fileMatch = /;\s*filename="([^"]*)"/i.exec(line);
        if (fileMatch) filename = fileMatch[1];
      } else if (lower.startsWith('content-type:')) {
        partMime = line.slice('content-type:'.length).trim();
      }
    }

    if (fieldName) {
      if (filename === undefined) {
        fields[fieldName] = partBody.toString('utf8');
      } else if (partBody.length > 0 || filename.length > 0) {
        files.push({
          fieldname: fieldName,
          originalname: filename,
          mimetype: partMime,
          buffer: Buffer.from(partBody),
          size: partBody.length
        });
      }
    }

    boundaryIdx = nextBoundaryIdx;
  }

  return { fields, files };
}

export async function extractUploadedMedia(
  req,
  {
    fieldNames = ['imagen', 'image'],
    base64Field = 'imagen_base64',
    category = 'products',
    maxTotalBytes = 6 * 1024 * 1024,
    maxJsonBytes = 8 * 1024 * 1024
  } = {}
) {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();

  if (contentType.startsWith('multipart/form-data')) {
    const rawBuffer = await readRawBody(req, maxTotalBytes);
    const { fields, files } = parseMultipartBuffer(rawBuffer, req.headers['content-type']);
    req.body = fields;
    req.files = files;

    const selected = files.find((f) => fieldNames.includes(f.fieldname)) || null;
    if (selected && (selected.size > 0 || selected.originalname)) {
      validateMediaBuffer({
        buffer: selected.buffer,
        mimetype: selected.mimetype,
        category
      });
      req.uploadedMedia = selected;
    } else {
      req.uploadedMedia = null;
    }
    return req.uploadedMedia;
  }

  if (req.body === undefined) {
    req.body = await readJsonBody(req, maxJsonBytes);
  } else if (req.body === null || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new AppError('El cuerpo de la petición debe ser un objeto JSON válido.', 400);
  }

  if (base64Field && typeof req.body[base64Field] === 'string') {
    const rawBase64 = req.body[base64Field].trim();
    delete req.body[base64Field];
    if (rawBase64 !== '') {
      const { buffer, mimetype } = decodeBase64DataUrl(rawBase64);
      validateMediaBuffer({ buffer, mimetype, category });
      req.uploadedMedia = {
        fieldname: base64Field,
        originalname: 'upload',
        mimetype,
        buffer,
        size: buffer.length
      };
      return req.uploadedMedia;
    }
  }

  req.uploadedMedia = null;
  return null;
}

export function createUploadMiddleware(options = {}) {
  return (req, _res, next) => {
    extractUploadedMedia(req, options)
      .then(() => next())
      .catch(next);
  };
}

export async function serveStaticUpload(req, res, pathname, origin = '*', extraHeaders = {}) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    throw new AppError(`Método no permitido para activos estáticos: ${method}`, 405);
  }

  const { resolved, mime } = resolveSafeUploadPath(pathname);
  if (!mime) {
    throw new AppError('Archivo no encontrado.', 404);
  }

  let stat;
  try {
    stat = await fs.stat(resolved);
  } catch (err) {
    if (err?.code === 'ENOENT') {
      throw new AppError('Archivo no encontrado.', 404);
    }
    throw err;
  }

  if (!stat.isFile()) {
    throw new AppError('Archivo no encontrado.', 404);
  }

  const baseHeaders = {
    'Content-Type': mime,
    'Cache-Control': 'public, max-age=86400',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': origin,
    ...extraHeaders
  };

  const rangeHeader = req.headers.range;
  if (rangeHeader && typeof rangeHeader === 'string') {
    const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
    if (!match || (match[1] === '' && match[2] === '')) {
      res.writeHead(416, {
        ...baseHeaders,
        'Content-Range': `bytes */${stat.size}`
      });
      res.end();
      return;
    }

    let start = match[1] !== '' ? Number.parseInt(match[1], 10) : 0;
    let end = match[2] !== '' ? Number.parseInt(match[2], 10) : stat.size - 1;

    if (match[1] === '' && match[2] !== '') {
      const suffixLength = Number.parseInt(match[2], 10);
      start = Math.max(0, stat.size - suffixLength);
      end = stat.size - 1;
    }

    if (start >= stat.size || end >= stat.size || start > end) {
      res.writeHead(416, {
        ...baseHeaders,
        'Content-Range': `bytes */${stat.size}`
      });
      res.end();
      return;
    }

    const chunkSize = end - start + 1;
    res.writeHead(206, {
      ...baseHeaders,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Content-Length': String(chunkSize)
    });

    if (method === 'HEAD') {
      res.end();
      return;
    }

    await new Promise((resolve, reject) => {
      const stream = fsSync.createReadStream(resolved, { start, end });
      stream.on('error', reject);
      stream.on('end', resolve);
      stream.pipe(res);
    });
    return;
  }

  res.writeHead(200, {
    ...baseHeaders,
    'Content-Length': String(stat.size)
  });

  if (method === 'HEAD') {
    res.end();
    return;
  }

  await new Promise((resolve, reject) => {
    const stream = fsSync.createReadStream(resolved);
    stream.on('error', reject);
    stream.on('end', resolve);
    stream.pipe(res);
  });
}
