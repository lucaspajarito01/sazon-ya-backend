import { BaseRepository } from './BaseRepository.js';
import { AppError } from '../utils/AppError.js';

export class UserRepository extends BaseRepository {
  constructor(db) {
    super(db, 'usuarios');
  }

  async findByEmail(correo, conn = null) {
    const store = this.executor(conn).state.usuarios;
    const normalized = String(correo).trim().toLowerCase();
    return store.find((u) => u.correo.toLowerCase() === normalized) || null;
  }

  async findById(id, conn = null) {
    const store = this.executor(conn).state.usuarios;
    return store.find((u) => u.id === Number(id)) || null;
  }

  async create(userEntity, conn = null) {
    const store = this.executor(conn).state.usuarios;
    const data = userEntity.getData();
    const exists = store.some((u) => u.correo.toLowerCase() === data.correo.toLowerCase());
    if (exists) {
      throw new AppError('El correo electrónico ya está registrado en SazónYA.', 409, [
        { field: 'correo', message: 'Este correo electrónico ya está en uso.' }
      ]);
    }
    const nextId = store.length > 0 ? Math.max(...store.map((u) => u.id)) + 1 : 1;
    const record = { ...data, id: nextId };
    store.push(record);
    userEntity.id = nextId;
    return record;
  }
}
