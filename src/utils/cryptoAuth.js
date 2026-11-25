import crypto from 'node:crypto';
import { ENV } from '../config/env.js';
import { AppError } from './AppError.js';

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';

export function hashPassword(plainPassword, customSalt = null) {
  const salt = customSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto
    .pbkdf2Sync(String(plainPassword), salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST)
    .toString('hex');
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${derived}`;
}

export function verifyPassword(plainPassword, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number.parseInt(parts[1], 10);
  const salt = parts[2];
  const originalHex = parts[3];
  const candidateHex = crypto
    .pbkdf2Sync(String(plainPassword), salt, iterations, KEY_LENGTH, DIGEST)
    .toString('hex');

  const bufA = Buffer.from(originalHex, 'hex');
  const bufB = Buffer.from(candidateHex, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input) {
  let str = input.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

export function signJwt(payload, expiresInSeconds = ENV.JWT_EXPIRES_IN_SECONDS) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', ENV.JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${data}.${signature}`;
}

export function verifyJwt(token) {
  if (!token || typeof token !== 'string') {
    throw new AppError('Token de autenticación no proporcionado.', 401);
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AppError('Formato de token JWT inválido.', 401);
  }
  const [encodedHeader, encodedPayload, signature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac('sha256', ENV.JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const sigA = Buffer.from(signature);
  const sigB = Buffer.from(expectedSignature);
  if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
    throw new AppError('Firma de token JWT inválida.', 401);
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now > payload.exp) {
    throw new AppError('La sesión ha expirado. Inicia sesión nuevamente.', 401);
  }
  return payload;
}
