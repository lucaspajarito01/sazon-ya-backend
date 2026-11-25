import { UserEntity, ROLES } from '../entities/UserEntity.js';
import { hashPassword, verifyPassword, signJwt } from '../utils/cryptoAuth.js';
import { AppError } from '../utils/AppError.js';

export class AuthService {
  #userRepository;

  constructor({ userRepository }) {
    this.#userRepository = userRepository;
  }

  async register({ nombre, edad, correo, password }) {
    const existing = await this.#userRepository.findByEmail(correo);
    if (existing) {
      throw new AppError('El correo electrónico ya se encuentra registrado.', 409, [
        { field: 'correo', message: 'El correo electrónico ya está registrado.' }
      ]);
    }

    const passwordHash = hashPassword(password);
    const userEntity = new UserEntity({
      nombre,
      edad,
      correo,
      password_hash: passwordHash,
      rol: ROLES.USER,
      activo: 1
    });

    await this.#userRepository.create(userEntity);
    const publicUser = userEntity.toPublicDTO();
    const token = signJwt({ sub: publicUser.id, correo: publicUser.correo, rol: publicUser.rol, nombre: publicUser.nombre });

    return {
      user: publicUser,
      token
    };
  }

  async login({ correo, password }) {
    const record = await this.#userRepository.findByEmail(correo);
    if (!record || !record.activo) {
      throw new AppError('Credenciales inválidas. Verifica tu correo y contraseña.', 401);
    }

    const isValid = verifyPassword(password, record.password_hash);
    if (!isValid) {
      throw new AppError('Credenciales inválidas. Verifica tu correo y contraseña.', 401);
    }

    const entity = new UserEntity(record);
    const publicUser = entity.toPublicDTO();
    const token = signJwt({ sub: publicUser.id, correo: publicUser.correo, rol: publicUser.rol, nombre: publicUser.nombre });

    return {
      user: publicUser,
      token
    };
  }

  async getProfile(userId) {
    const record = await this.#userRepository.findById(userId);
    if (!record || !record.activo) {
      throw new AppError('Usuario no encontrado o inactivo.', 401);
    }
    return new UserEntity(record).toPublicDTO();
  }
}
