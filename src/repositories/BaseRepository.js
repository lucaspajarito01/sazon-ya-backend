export class BaseRepository {
  #db;
  #tableName;

  constructor(db, tableName) {
    if (new.target === BaseRepository) {
      throw new TypeError('BaseRepository es una clase abstracta y no puede instanciarse directamente.');
    }
    if (!db) {
      throw new Error('BaseRepository requiere una instancia de base de datos.');
    }
    this.#db = db;
    this.#tableName = tableName;
  }

  get tableName() {
    return this.#tableName;
  }

  executor(conn = null) {
    return conn ?? this.#db;
  }
}
