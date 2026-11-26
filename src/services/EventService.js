import { EventEntity } from '../entities/EventEntity.js';
import { deleteLocalUpload } from '../utils/imageStorage.js';

export class EventService {
  #eventRepository;

  constructor({ eventRepository }) {
    this.#eventRepository = eventRepository;
  }

  async listEvents({ onlyActive = false, userId = null } = {}) {
    return this.#eventRepository.findAll({ onlyActive, userId });
  }

  async getEventById(id) {
    return this.#eventRepository.findById(id);
  }

  async createEvent(payload, adminId) {
    const entity = new EventEntity({
      ...payload,
      creado_por_admin_id: adminId
    });
    return this.#eventRepository.create(entity);
  }

  async updateEvent(id, payload) {
    const existing = await this.#eventRepository.findById(id);
    const updated = await this.#eventRepository.update(id, payload);
    if (
      existing?.media_url &&
      existing.media_url.startsWith('/uploads/events/') &&
      updated.media_url !== existing.media_url
    ) {
      await deleteLocalUpload(existing.media_url);
    }
    return updated;
  }

  async updateEventStatus(id, estado) {
    return this.#eventRepository.updateStatus(id, estado);
  }

  async participateInEvent({ eventoId, usuarioId }) {
    return this.#eventRepository.participate({ eventoId, usuarioId });
  }
}
