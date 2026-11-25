import { ValidationError } from '../utils/AppError.js';

export class BaseEntity {
  #id;
  #data;

  constructor(id, data = {}) {
    if (new.target === BaseEntity) {
      throw new TypeError('BaseEntity es una clase abstracta y no puede instanciarse directamente.');
    }
    this.#id = id !== undefined && id !== null ? Number(id) : null;
    this.#data = { ...data };
  }

  get id() {
    return this.#id;
  }

  set id(newId) {
    this.#id = Number(newId);
  }

  getData() {
    return { id: this.#id, ...this.#data };
  }

  getField(key) {
    return this.#data[key];
  }

  setField(key, value) {
    this.#data[key] = value;
  }

  /**
   * Aplica cambios validados y devuelve únicamente el diff de campos modificados
   */
  edit(fields = {}, allowedKeys = []) {
    const diff = {};
    for (const key of allowedKeys) {
      if (Object.prototype.hasOwnProperty.call(fields, key) && fields[key] !== undefined) {
        if (this.#data[key] !== fields[key]) {
          this.#data[key] = fields[key];
          diff[key] = fields[key];
        }
      }
    }
    this.validate();
    return diff;
  }

  validate() {
    throw new ValidationError('El método validate() debe ser implementado por la entidad hija.');
  }
}
