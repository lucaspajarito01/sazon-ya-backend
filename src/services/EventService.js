import { EventEntity } from '../entities/EventEntity.js';

export class EventService {
  #eventRepository;

  constructor({ eventRepository }) {
    this.#eventRepository = eventRepository;
  }

  async listEvents({ onlyActive = false, userId = null } = {}) {
    return this.#eventRepository.findAll({ onlyActive, userId });
  }

  async createEvent(payload, adminId) {
    const entity = new EventEntity({
      ...payload,
      creado_por_admin_id: adminId
    });
    return this.#eventRepository.create(entity);
  }

  async updateEventStatus(id, estado) {
    return this.#eventRepository.updateStatus(id, estado);
  }

  async participateInEvent({ eventoId, usuarioId }) {
    return this.#eventRepository.participate({ eventoId, usuarioId });
  }
}
