import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/authMiddleware.js';
import { createUploadMiddleware } from '../middlewares/uploadMiddleware.js';
import { ROLES } from '../entities/UserEntity.js';
import { verifyJwt } from '../utils/cryptoAuth.js';

const uploadProductImage = createUploadMiddleware({
  fieldNames: ['imagen', 'image'],
  base64Field: 'imagen_base64',
  category: 'products',
  maxTotalBytes: 6 * 1024 * 1024,
  maxJsonBytes: 8 * 1024 * 1024
});

const uploadEventMedia = createUploadMiddleware({
  fieldNames: ['media_file', 'archivo', 'file'],
  base64Field: 'media_base64',
  category: 'events',
  maxTotalBytes: 16 * 1024 * 1024,
  maxJsonBytes: 8 * 1024 * 1024
});

function optionalAuthenticate(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = verifyJwt(authHeader.slice(7).trim());
      req.user = {
        id: Number(decoded.sub),
        correo: decoded.correo,
        rol: decoded.rol,
        nombre: decoded.nombre
      };
    } catch {
      // Ignora token inválido en endpoints públicos opcionales
    }
  }
  next();
}

export function createApiRouter(controllers) {
  const router = Router();
  const {
    authController,
    inventoryController,
    eventController,
    orderController,
    communityController,
    analyticsController,
    contactController
  } = controllers;

  // 1. Autenticación (Público y Sesión)
  router.post('/auth/register', authController.register);
  router.post('/auth/login', authController.login);
  router.get('/auth/me', authenticate, authController.me);

  // 2. Productos y Categorías (Público lectura / Admin CRUD)
  router.get('/products', inventoryController.listProducts);
  router.post('/products', authenticate, requireRole(ROLES.ADMIN), uploadProductImage, inventoryController.createProduct);
  router.put(
    '/products/:id',
    authenticate,
    requireRole(ROLES.ADMIN),
    uploadProductImage,
    inventoryController.updateProduct
  );
  router.delete('/products/:id', authenticate, requireRole(ROLES.ADMIN), inventoryController.deleteProduct);

  // 3. Organización de Inventario de Condimentos e Insumos (Admin)
  router.get('/condiments', inventoryController.listCondiments);
  router.post('/condiments', authenticate, requireRole(ROLES.ADMIN), inventoryController.createCondiment);
  router.put('/condiments/:id', authenticate, requireRole(ROLES.ADMIN), inventoryController.updateCondiment);

  // 4. Eventos, Promociones y Sorteos (Público lectura / User participa / Admin registra y edita)
  router.get('/events', optionalAuthenticate, eventController.listEvents);
  router.post('/events', authenticate, requireRole(ROLES.ADMIN), uploadEventMedia, eventController.createEvent);
  router.put('/events/:id', authenticate, requireRole(ROLES.ADMIN), uploadEventMedia, eventController.updateEvent);
  router.patch('/events/:id/status', authenticate, requireRole(ROLES.ADMIN), eventController.updateStatus);
  router.post('/events/:id/participate', authenticate, eventController.participate);

  // 5. Pedidos Transaccionales ACID (User / Admin)
  router.get('/orders/my', authenticate, orderController.listMyOrders);
  router.post('/orders', authenticate, orderController.createOrder);

  // 6. Calificaciones (Estrellas), Reseñas, Favoritos y Recomendaciones
  router.get('/reviews', communityController.listReviews);
  router.post('/reviews', authenticate, communityController.submitReview);

  router.get('/favorites', authenticate, communityController.listFavorites);
  router.post('/favorites/:productoId/toggle', authenticate, communityController.toggleFavorite);

  router.get('/recommendations', authenticate, communityController.listRecommendations);
  router.post('/recommendations', authenticate, communityController.submitRecommendation);
  router.patch(
    '/recommendations/:id/status',
    authenticate,
    requireRole(ROLES.ADMIN),
    communityController.updateRecommendationStatus
  );

  // 7. Estadísticas de Ventas Semanales (Admin: Producto más vendido y Ganancia por producto)
  router.get('/analytics/weekly', authenticate, requireRole(ROLES.ADMIN), analyticsController.getWeeklyStats);

  // 8. Mensajes de Contacto (Público envía / Admin consulta)
  router.post('/contacts', contactController.submitContact);
  router.get('/contacts', authenticate, requireRole(ROLES.ADMIN), contactController.listContacts);

  return router;
}
