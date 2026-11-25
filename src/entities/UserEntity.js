import { BaseEntity } from './BaseEntity.js';
import { ValidationError } from '../utils/AppError.js';

export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  USER: 'USER'
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class UserEntity extends BaseEntity {
  constructor({ id = null, nombre, edad, correo, password_hash, rol = ROLES.USER, activo = 1, creado_en = null }) {
    super(id, {
      nombre: typeof nombre === 'string' ? nombre.trim().replace(/\s+/g, ' ') : '',
      edad: Number(edad),
      correo: typeof correo === 'string' ? correo.trim().toLowerCase() : '',
      password_hash,
      rol: rol || ROLES.USER,
      activo: activo !== undefined ? Number(Boolean(activo)) : 1,
      creado_en: creado_en || new Date().toISOString()
    });
    this.validate();
  }

  validate() {
    const errors = [];
    const data = this.getData();

    if (!data.nombre || data.nombre.length < 2 || data.nombre.length > 100) {
      errors.push({ field: 'nombre', message: 'El nombre debe tener entre 2 y 100 caracteres.' });
    }

    if (!Number.isSafeInteger(data.edad) || data.edad < 13 || data.edad > 120) {
      errors.push({ field: 'edad', message: 'La edad debe ser un número entero entre 13 y 120 años.' });
    }

    if (!data.correo || !EMAIL_REGEX.test(data.correo)) {
      errors.push({ field: 'correo', message: 'El correo electrónico no tiene un formato válido.' });
    }

    if (!data.password_hash || typeof data.password_hash !== 'string') {
      errors.push({ field: 'password', message: 'El hash de contraseña es obligatorio.' });
    }

    if (!Object.values(ROLES).includes(data.rol)) {
      errors.push({ field: 'rol', message: 'El rol debe ser ADMIN o USER.' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Error de validación en la entidad Usuario (Barrera 2).', errors);
    }
  }

  toPublicDTO() {
    const d = this.getData();
    return {
      id: d.id,
      nombre: d.nombre,
      edad: d.edad,
      correo: d.correo,
      rol: d.rol,
      activo: Boolean(d.activo),
      creado_en: d.creado_en
    };
  }
}
