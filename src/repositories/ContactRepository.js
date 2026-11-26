import { BaseRepository } from './BaseRepository.js';

export class ContactRepository extends BaseRepository {
  constructor(db) {
    super(db, 'mensajes_contacto');
  }

  async findAll(conn = null) {
    const state = this.executor(conn).state;
    return [...state.mensajes_contacto].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));
  }

  async create(contactEntity, conn = null) {
    const store = this.executor(conn).state.mensajes_contacto;
    const data = contactEntity.getData();
    const nextId = store.length > 0 ? Math.max(...store.map((c) => c.id)) + 1 : 1;
    const record = { ...data, id: nextId };
    store.push(record);
    contactEntity.id = nextId;
    return record;
  }
}
