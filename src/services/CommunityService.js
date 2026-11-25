import { ReviewEntity } from '../entities/ReviewEntity.js';
import { RecommendationEntity } from '../entities/RecommendationEntity.js';

export class CommunityService {
  #communityRepository;

  constructor({ communityRepository }) {
    this.#communityRepository = communityRepository;
  }

  async listReviews({ productoId = null } = {}) {
    return this.#communityRepository.listReviews({ productoId });
  }

  async submitReview({ usuarioId, productoId, estrellas, comentario }) {
    const entity = new ReviewEntity({
      usuario_id: usuarioId,
      producto_id: productoId,
      estrellas,
      comentario
    });
    return this.#communityRepository.upsertReview(entity);
  }

  async listFavorites(usuarioId) {
    return this.#communityRepository.listFavoritesByUser(usuarioId);
  }

  async toggleFavorite({ usuarioId, productoId }) {
    return this.#communityRepository.toggleFavorite({ usuarioId, productoId });
  }

  async listRecommendations() {
    return this.#communityRepository.listRecommendations();
  }

  async submitRecommendation({ usuarioId, nombreSugerido, descripcionIngredientes }) {
    const entity = new RecommendationEntity({
      usuario_id: usuarioId,
      nombre_sugerido: nombreSugerido,
      descripcion_ingredientes: descripcionIngredientes
    });
    return this.#communityRepository.createRecommendation(entity);
  }

  async updateRecommendationStatus(id, estado) {
    return this.#communityRepository.updateRecommendationStatus(id, estado);
  }
}
