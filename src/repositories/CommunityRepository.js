import { BaseRepository } from './BaseRepository.js';
import { AppError } from '../utils/AppError.js';

export class CommunityRepository extends BaseRepository {
  constructor(db) {
    super(db, 'resenas_calificaciones');
  }

  // 1. Reseñas y Calificaciones (Estrellas 1-5)
  async listReviews({ productoId = null } = {}, conn = null) {
    const state = this.executor(conn).state;
    let list = [...state.resenas_calificaciones];
    if (productoId) {
      list = list.filter((r) => r.producto_id === Number(productoId));
    }
    return list
      .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
      .map((r) => {
        const user = state.usuarios.find((u) => u.id === r.usuario_id);
        const prod = state.productos.find((p) => p.id === r.producto_id);
        return {
          ...r,
          usuario_nombre: user ? user.nombre : 'Cliente SazónYA',
          producto_nombre: prod ? prod.nombre : 'Producto'
        };
      });
  }

  async upsertReview(reviewEntity, conn = null) {
    const state = this.executor(conn).state;
    const data = reviewEntity.getData();

    const product = state.productos.find((p) => p.id === data.producto_id);
    if (!product) {
      throw new AppError('El producto que intentas calificar no existe.', 404);
    }

    const existingIdx = state.resenas_calificaciones.findIndex(
      (r) => r.usuario_id === data.usuario_id && r.producto_id === data.producto_id
    );

    let saved;
    if (existingIdx !== -1) {
      state.resenas_calificaciones[existingIdx] = {
        ...state.resenas_calificaciones[existingIdx],
        estrellas: data.estrellas,
        comentario: data.comentario,
        creado_en: new Date().toISOString()
      };
      saved = state.resenas_calificaciones[existingIdx];
    } else {
      const nextId =
        state.resenas_calificaciones.length > 0
          ? Math.max(...state.resenas_calificaciones.map((r) => r.id)) + 1
          : 1;
      saved = { ...data, id: nextId };
      state.resenas_calificaciones.push(saved);
    }

    // Recalcular promedio_estrellas y total_resenas del producto (equivalente al trigger SQL)
    const productReviews = state.resenas_calificaciones.filter((r) => r.producto_id === data.producto_id);
    const avg =
      productReviews.reduce((acc, item) => acc + Number(item.estrellas), 0) /
      Math.max(1, productReviews.length);
    product.promedio_estrellas = Number(avg.toFixed(2));
    product.total_resenas = productReviews.length;

    return {
      review: saved,
      producto_promedio_estrellas: product.promedio_estrellas,
      producto_total_resenas: product.total_resenas
    };
  }

  // 2. Favoritos (Toggle idempotente)
  async listFavoritesByUser(usuarioId, conn = null) {
    const state = this.executor(conn).state;
    const favs = state.favoritos.filter((f) => f.usuario_id === Number(usuarioId));
    return favs
      .map((f) => {
        const prod = state.productos.find((p) => p.id === f.producto_id);
        return prod ? { ...prod, agregado_en: f.agregado_en } : null;
      })
      .filter(Boolean);
  }

  async toggleFavorite({ usuarioId, productoId }, conn = null) {
    const state = this.executor(conn).state;
    const prod = state.productos.find((p) => p.id === Number(productoId));
    if (!prod) {
      throw new AppError('El producto no existe.', 404);
    }

    const idx = state.favoritos.findIndex(
      (f) => f.usuario_id === Number(usuarioId) && f.producto_id === Number(productoId)
    );

    if (idx !== -1) {
      state.favoritos.splice(idx, 1);
      return { isFavorite: false, producto_id: Number(productoId), message: 'Eliminado de tus favoritos.' };
    }

    state.favoritos.push({
      usuario_id: Number(usuarioId),
      producto_id: Number(productoId),
      agregado_en: new Date().toISOString()
    });
    return { isFavorite: true, producto_id: Number(productoId), message: 'Agregado a tus favoritos.' };
  }

  // 3. Recomendaciones de nuevos productos
  async listRecommendations(conn = null) {
    const state = this.executor(conn).state;
    return state.recomendaciones_productos
      .slice()
      .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
      .map((rec) => {
        const u = state.usuarios.find((usr) => usr.id === rec.usuario_id);
        return {
          ...rec,
          usuario_nombre: u ? u.nombre : 'Cliente'
        };
      });
  }

  async createRecommendation(recommendationEntity, conn = null) {
    const state = this.executor(conn).state;
    const data = recommendationEntity.getData();

    const pendingByUser = state.recomendaciones_productos.filter(
      (r) => r.usuario_id === data.usuario_id && r.estado === 'PENDIENTE'
    );
    if (pendingByUser.length >= 3) {
      throw new AppError(
        'Ya tienes 3 recomendaciones de productos pendientes de revisión por el administrador.',
        429
      );
    }

    const nextId =
      state.recomendaciones_productos.length > 0
        ? Math.max(...state.recomendaciones_productos.map((r) => r.id)) + 1
        : 1;
    const record = { ...data, id: nextId };
    state.recomendaciones_productos.push(record);
    return record;
  }

  async updateRecommendationStatus(id, estado, conn = null) {
    const state = this.executor(conn).state;
    const rec = state.recomendaciones_productos.find((r) => r.id === Number(id));
    if (!rec) {
      throw new AppError('Recomendación no encontrada.', 404);
    }
    const valid = ['PENDIENTE', 'EN_REVISION', 'APROBADA', 'DESCARTADA'];
    if (!valid.includes(estado)) {
      throw new AppError('Estado de recomendación inválido.', 400);
    }
    rec.estado = estado;
    return rec;
  }
}
