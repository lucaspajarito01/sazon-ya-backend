import { ValidationError } from '../utils/AppError.js';

export function pickFields(source = {}, allowedFields = []) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return {};
  }
  const clean = {};
  for (const key of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      clean[key] = source[key];
    }
  }
  return clean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/;

export function validateRegisterInput(body = {}) {
  const payload = pickFields(body, ['nombre', 'edad', 'correo', 'password']);
  const errors = [];

  const nombre = typeof payload.nombre === 'string' ? payload.nombre.trim().replace(/\s+/g, ' ') : '';
  if (!nombre || nombre.length < 2 || nombre.length > 100) {
    errors.push({ field: 'nombre', message: 'El nombre es obligatorio y debe tener entre 2 y 100 caracteres.' });
  }

  const edad = Number(payload.edad);
  if (!Number.isSafeInteger(edad) || edad < 13 || edad > 120) {
    errors.push({ field: 'edad', message: 'La edad debe ser un número entero entre 13 y 120 años.' });
  }

  const correo = typeof payload.correo === 'string' ? payload.correo.trim().toLowerCase() : '';
  if (!correo || !EMAIL_REGEX.test(correo)) {
    errors.push({ field: 'correo', message: 'Ingresa un correo electrónico válido.' });
  }

  const password = typeof payload.password === 'string' ? payload.password : '';
  if (!STRONG_PASSWORD_REGEX.test(password)) {
    errors.push({
      field: 'password',
      message:
        'La contraseña debe tener mínimo 8 caracteres, incluyendo mayúscula, minúscula, número y carácter especial.'
    });
  }

  if (errors.length > 0) {
    throw new ValidationError('Datos de registro inválidos (Barrera 1).', errors);
  }

  return { nombre, edad, correo, password };
}

export function validateLoginInput(body = {}) {
  const payload = pickFields(body, ['correo', 'password']);
  const errors = [];

  const correo = typeof payload.correo === 'string' ? payload.correo.trim().toLowerCase() : '';
  if (!correo || !EMAIL_REGEX.test(correo)) {
    errors.push({ field: 'correo', message: 'Ingresa un correo electrónico válido.' });
  }

  const password = typeof payload.password === 'string' ? payload.password : '';
  if (!password || password.length < 4) {
    errors.push({ field: 'password', message: 'La contraseña es obligatoria.' });
  }

  if (errors.length > 0) {
    throw new ValidationError('Datos de inicio de sesión inválidos (Barrera 1).', errors);
  }

  return { correo, password };
}
