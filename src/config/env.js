import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || String(value).trim() === '') {
    throw new Error(`[ENV_BOOT_ERROR] Falta la variable de entorno obligatoria: ${name}`);
  }
  return String(value).trim();
}

const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;
const apiVersion = required('API_VERSION', '1.0.0');
if (!SEMVER_REGEX.test(apiVersion)) {
  throw new Error(`[ENV_BOOT_ERROR] API_VERSION debe cumplir SemVer (X.Y.Z). Recibido: ${apiVersion}`);
}

export const ENV = Object.freeze({
  PORT: Number.parseInt(required('PORT', '3001'), 10),
  NODE_ENV: required('NODE_ENV', 'development'),
  API_VERSION: apiVersion,
  CORS_ORIGIN: required('CORS_ORIGIN', 'http://localhost:5173'),
  DB_MODE: required('DB_MODE', 'memory'),
  DB_HOST: required('DB_HOST', '127.0.0.1'),
  DB_PORT: Number.parseInt(required('DB_PORT', '3307'), 10),
  DB_USER: required('DB_USER', 'sazon_app'),
  DB_PASSWORD: required('DB_PASSWORD', 'SazonYa_App_2026!'),
  DB_NAME: required('DB_NAME', 'sazon_ya'),
  JWT_SECRET: required('JWT_SECRET', 'sazon_ya_super_secret_hmac_key_2026_clean_architecture'),
  JWT_EXPIRES_IN_SECONDS: Number.parseInt(required('JWT_EXPIRES_IN_SECONDS', '7200'), 10)
});
