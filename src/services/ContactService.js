import { ContactEntity } from '../entities/ContactEntity.js';

export class ContactService {
  #contactRepository;

  constructor({ contactRepository }) {
    this.#contactRepository = contactRepository;
  }

  async submitContact(payload) {
    const entity = new ContactEntity(payload);
    return this.#contactRepository.create(entity);
  }

  async listContacts() {
    return this.#contactRepository.findAll();
  }
}
