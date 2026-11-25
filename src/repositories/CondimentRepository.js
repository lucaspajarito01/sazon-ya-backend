import { BaseRepository } from './BaseRepository.js';
import { CondimentEntity } from '../entities/CondimentEntity.js';
import { AppError } from '../utils/AppError.js';

export class CondimentRepository extends BaseRepository {
  constructor(db) {
    super(db, 'condimentos_insumos');
  }

  async findAll(conn = null) {
    return [...this.executor(conn).state.condimentos_insumos];
  }

  async findById(id, conn = null) {
    return this.executor(conn).state.condimentos_insumos.find((c) => c.id === Number(id)) || null;
  }

  async create(condimentEntity, conn = null) {
    const store = this.executor(conn).state.condimentos_insumos;
    const data = condimentEntity.getData();
    const exists = store.some((c) => c.nombre.toLowerCase() === data.nombre.toLowerCase());
    if (exists) {
      throw new AppError('Ya existe un condimento o insumo con ese nombre.', 409, [
        { field: 'nombre', message: 'Condimento duplicado.' }
      ]);
    }
    const nextId = store.length > 0 ? Math.max(...store.map((c) => c.id)) + 1 : 1;
    const record = { ...data, id: nextId };
    store.push(record);
    return record;
  }

  async update(id, changes, conn = null) {
    const store = this.executor(conn).state.condimentos_insumos;
    const index = store.findIndex((c) => c.id === Number(id));
    if (index === -1) {
      throw new AppError('Condimento o insumo no encontrado.', 404);
    }
    const current = store[index];
    const entity = new CondimentEntity({
      ...current,
      ...changes,
      actualizado_en: new Date().toISOString()
    });
    store[index] = entity.getData();
    return store[index];
  }
}
