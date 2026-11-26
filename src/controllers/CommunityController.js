export class CommunityController {
  #communityService;

  constructor({ communityService }) {
    this.#communityService = communityService;
  }

  listReviews = async (req, res, next) => {
    try {
      const productoId = req.query.producto_id || null;
      const reviews = await this.#communityService.listReviews({ productoId });
      res.status(200).json({
        success: true,
        data: { reviews }
      });
    } catch (err) {
      next(err);
    }
  };

  submitReview = async (req, res, next) => {
    try {
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
      const result = await this.#communityService.submitReview({
        usuarioId: req.user.id,
        productoId: body.producto_id,
        estrellas: body.estrellas,
        comentario: body.comentario
      });
      res.status(201).json({
        success: true,
        message: 'Calificación y reseña registradas exitosamente.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  listFavorites = async (req, res, next) => {
    try {
      const favorites = await this.#communityService.listFavorites(req.user.id);
      res.status(200).json({
        success: true,
        data: { favorites }
      });
    } catch (err) {
      next(err);
    }
  };

  toggleFavorite = async (req, res, next) => {
    try {
      const result = await this.#communityService.toggleFavorite({
        usuarioId: req.user.id,
        productoId: Number(req.params.productoId)
      });
      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  listRecommendations = async (_req, res, next) => {
    try {
      const recommendations = await this.#communityService.listRecommendations();
      res.status(200).json({
        success: true,
        data: { recommendations }
      });
    } catch (err) {
      next(err);
    }
  };

  submitRecommendation = async (req, res, next) => {
    try {
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
      const recommendation = await this.#communityService.submitRecommendation({
        usuarioId: req.user.id,
        nombreSugerido: body.nombre_sugerido,
        descripcionIngredientes: body.descripcion_ingredientes
      });
      res.status(201).json({
        success: true,
        message: '¡Gracias! Tu recomendación de nuevo producto fue enviada al equipo de SazónYA.',
        data: { recommendation }
      });
    } catch (err) {
      next(err);
    }
  };

  updateRecommendationStatus = async (req, res, next) => {
    try {
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
      const recommendation = await this.#communityService.updateRecommendationStatus(
        req.params.id,
        body.estado
      );
      res.status(200).json({
        success: true,
        message: 'Estado de la recomendación actualizado.',
        data: { recommendation }
      });
    } catch (err) {
      next(err);
    }
  };
}
