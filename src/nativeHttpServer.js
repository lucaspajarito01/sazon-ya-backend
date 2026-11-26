import http from 'node:http';
import { URL } from 'node:url';
import { ENV } from './config/env.js';
import { container } from './container.js';
import { verifyJwt } from './utils/cryptoAuth.js';
import { AppError } from './utils/AppError.js';
import { ROLES } from './entities/UserEntity.js';
import { openApiSpec } from './docs/openapi.js';
import { validateRegisterInput, validateLoginInput } from './validators/authValidator.js';
import {
  validateCondimentPayload,
  validateOrderPayload,
  validateContactPayload,
  validateEventStatusPayload
} from './validators/domainValidator.js';
import { extractUploadedMedia, readJsonBody, serveStaticUpload } from './middlewares/uploadMiddleware.js';
import {
  persistProductCreate,
  persistProductUpdate,
  persistEventCreate,
  persistEventUpdate
} from './utils/mediaWorkflow.js';

const PRODUCT_UPLOAD_OPTIONS = Object.freeze({
  fieldNames: ['imagen', 'image'],
  base64Field: 'imagen_base64',
  category: 'products',
  maxTotalBytes: 6 * 1024 * 1024,
  maxJsonBytes: 8 * 1024 * 1024
});

const EVENT_UPLOAD_OPTIONS = Object.freeze({
  fieldNames: ['media_file', 'archivo', 'file'],
  base64Field: 'media_base64',
  category: 'events',
  maxTotalBytes: 16 * 1024 * 1024,
  maxJsonBytes: 8 * 1024 * 1024
});

function sendJson(res, statusCode, payload, origin = '*') {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-API-Version': ENV.API_VERSION,
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Min-Major'
  });
  res.end(JSON.stringify(payload));
}

function getAuthUser(req, required = true) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (required) throw new AppError('Acceso no autorizado. Inicia sesión para continuar.', 401);
    return null;
  }
  const token = authHeader.slice(7).trim();
  try {
    const decoded = verifyJwt(token);
    return {
      id: Number(decoded.sub),
      correo: decoded.correo,
      rol: decoded.rol,
      nombre: decoded.nombre
    };
  } catch (err) {
    if (required) throw err;
    return null;
  }
}

function assertAdmin(user) {
  if (!user || user.rol !== ROLES.ADMIN) {
    throw new AppError('Permisos insuficientes. Esta acción requiere rol: ADMIN.', 403);
  }
}

export function createNativeHttpServer(customContainer = container) {
  const {
    authService,
    inventoryService,
    eventService,
    orderService,
    communityService,
    analyticsService,
    contactService
  } = customContainer.services;

  return http.createServer(async (req, res) => {
    const requestOrigin = req.headers.origin || '*';

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': requestOrigin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Min-Major',
        'X-API-Version': ENV.API_VERSION
      });
      res.end();
      return;
    }

    try {
      const clientMinMajor = req.headers['x-client-min-major'];
      if (clientMinMajor && Number(clientMinMajor) > Number(ENV.API_VERSION.split('.')[0])) {
        throw new AppError(`Versión de API incompatible. Servidor en ${ENV.API_VERSION}.`, 426);
      }

      const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const pathname = parsedUrl.pathname;
      const method = req.method || 'GET';

      if (method === 'GET' && pathname === '/version') {
        return sendJson(res, 200, { success: true, name: 'sazon-ya-backend', version: ENV.API_VERSION }, requestOrigin);
      }

      if (method === 'GET' && pathname === '/api/v1/health') {
        return sendJson(
          res,
          200,
          {
            success: true,
            status: 'OK',
            service: 'SazónYA Backend API',
            version: ENV.API_VERSION,
            dbMode: ENV.DB_MODE
          },
          requestOrigin
        );
      }

      if (method === 'GET' && pathname === '/api/docs') {
        return sendJson(res, 200, openApiSpec, requestOrigin);
      }

      if ((method === 'GET' || method === 'HEAD') && pathname.startsWith('/uploads/')) {
        await serveStaticUpload(req, res, pathname, requestOrigin, {
          'X-API-Version': ENV.API_VERSION
        });
        return;
      }

      // 1. Auth
      if (method === 'POST' && pathname === '/api/v1/auth/register') {
        const body = await readJsonBody(req);
        const clean = validateRegisterInput(body);
        const result = await authService.register(clean);
        return sendJson(
          res,
          201,
          { success: true, message: 'Cuenta creada exitosamente en SazónYA.', data: result },
          requestOrigin
        );
      }

      if (method === 'POST' && pathname === '/api/v1/auth/login') {
        const body = await readJsonBody(req);
        const clean = validateLoginInput(body);
        const result = await authService.login(clean);
        return sendJson(
          res,
          200,
          { success: true, message: `Bienvenido a SazónYA, ${result.user.nombre}.`, data: result },
          requestOrigin
        );
      }

      if (method === 'GET' && pathname === '/api/v1/auth/me') {
        const user = getAuthUser(req, true);
        const profile = await authService.getProfile(user.id);
        return sendJson(res, 200, { success: true, data: { user: profile } }, requestOrigin);
      }

      // 2. Productos
      if (method === 'GET' && pathname === '/api/v1/products') {
        const includeInactive = parsedUrl.searchParams.get('includeInactive') === 'true';
        const categoriaId = parsedUrl.searchParams.get('categoria_id');
        const estado = parsedUrl.searchParams.get('estado');
        const products = await inventoryService.listProducts({ includeInactive, categoriaId, estado });
        const categories = await inventoryService.listCategories();
        return sendJson(res, 200, { success: true, data: { products, categories } }, requestOrigin);
      }

      if (method === 'POST' && pathname === '/api/v1/products') {
        const user = getAuthUser(req, true);
        assertAdmin(user);
        await extractUploadedMedia(req, PRODUCT_UPLOAD_OPTIONS);
        const product = await persistProductCreate({
          body: req.body,
          uploadedMedia: req.uploadedMedia || null,
          inventoryService
        });
        return sendJson(
          res,
          201,
          { success: true, message: 'Producto registrado exitosamente en el inventario.', data: { product } },
          requestOrigin
        );
      }

      const prodMatch = pathname.match(/^\/api\/v1\/products\/(\d+)$/);
      if (prodMatch) {
        const prodId = Number(prodMatch[1]);
        const user = getAuthUser(req, true);
        assertAdmin(user);
        if (method === 'PUT') {
          await extractUploadedMedia(req, PRODUCT_UPLOAD_OPTIONS);
          const product = await persistProductUpdate({
            id: prodId,
            body: req.body,
            uploadedMedia: req.uploadedMedia || null,
            inventoryService
          });
          return sendJson(
            res,
            200,
            { success: true, message: 'Producto actualizado correctamente.', data: { product } },
            requestOrigin
          );
        }
        if (method === 'DELETE') {
          const result = await inventoryService.deleteProduct(prodId);
          return sendJson(res, 200, { success: true, message: result.message, data: result }, requestOrigin);
        }
      }

      // 3. Condimentos
      if (method === 'GET' && pathname === '/api/v1/condiments') {
        const condiments = await inventoryService.listCondiments();
        return sendJson(res, 200, { success: true, data: { condiments } }, requestOrigin);
      }

      if (method === 'POST' && pathname === '/api/v1/condiments') {
        const user = getAuthUser(req, true);
        assertAdmin(user);
        const body = await readJsonBody(req);
        const clean = validateCondimentPayload(body, false);
        const condiment = await inventoryService.createCondiment(clean);
        return sendJson(
          res,
          201,
          { success: true, message: 'Condimento/insumo registrado en inventario.', data: { condiment } },
          requestOrigin
        );
      }

      const condMatch = pathname.match(/^\/api\/v1\/condiments\/(\d+)$/);
      if (condMatch && method === 'PUT') {
        const user = getAuthUser(req, true);
        assertAdmin(user);
        const body = await readJsonBody(req);
        const clean = validateCondimentPayload(body, true);
        const condiment = await inventoryService.updateCondiment(Number(condMatch[1]), clean);
        return sendJson(
          res,
          200,
          { success: true, message: 'Estado y stock de condimento actualizado.', data: { condiment } },
          requestOrigin
        );
      }

      // 4. Eventos y Sorteos
      if (method === 'GET' && pathname === '/api/v1/events') {
        const user = getAuthUser(req, false);
        const onlyActive = parsedUrl.searchParams.get('onlyActive') === 'true';
        const events = await eventService.listEvents({ onlyActive, userId: user ? user.id : null });
        return sendJson(res, 200, { success: true, data: { events } }, requestOrigin);
      }

      if (method === 'POST' && pathname === '/api/v1/events') {
        const user = getAuthUser(req, true);
        assertAdmin(user);
        await extractUploadedMedia(req, EVENT_UPLOAD_OPTIONS);
        const event = await persistEventCreate({
          body: req.body,
          uploadedMedia: req.uploadedMedia || null,
          adminId: user.id,
          eventService
        });
        return sendJson(
          res,
          201,
          { success: true, message: 'Evento / promoción registrado por el administrador.', data: { event } },
          requestOrigin
        );
      }

      const evUpdateMatch = pathname.match(/^\/api\/v1\/events\/(\d+)$/);
      if (evUpdateMatch && method === 'PUT') {
        const user = getAuthUser(req, true);
        assertAdmin(user);
        await extractUploadedMedia(req, EVENT_UPLOAD_OPTIONS);
        const event = await persistEventUpdate({
          id: Number(evUpdateMatch[1]),
          body: req.body,
          uploadedMedia: req.uploadedMedia || null,
          eventService
        });
        return sendJson(
          res,
          200,
          { success: true, message: 'Evento / promoción actualizado correctamente.', data: { event } },
          requestOrigin
        );
      }

      const evStatusMatch = pathname.match(/^\/api\/v1\/events\/(\d+)\/status$/);
      if (evStatusMatch && method === 'PATCH') {
        const user = getAuthUser(req, true);
        assertAdmin(user);
        const body = await readJsonBody(req);
        const { estado } = validateEventStatusPayload(body);
        const event = await eventService.updateEventStatus(Number(evStatusMatch[1]), estado);
        return sendJson(
          res,
          200,
          { success: true, message: 'Estado del evento actualizado.', data: { event } },
          requestOrigin
        );
      }

      const evParticipateMatch = pathname.match(/^\/api\/v1\/events\/(\d+)\/participate$/);
      if (evParticipateMatch && method === 'POST') {
        const user = getAuthUser(req, true);
        const participation = await eventService.participateInEvent({
          eventoId: Number(evParticipateMatch[1]),
          usuarioId: user.id
        });
        return sendJson(
          res,
          201,
          {
            success: true,
            message: `¡Inscripción confirmada! Tu código de participación es ${participation.codigo_boleto}.`,
            data: { participation }
          },
          requestOrigin
        );
      }

      // 5. Pedidos
      if (method === 'GET' && pathname === '/api/v1/orders/my') {
        const user = getAuthUser(req, true);
        const orders = await orderService.listUserOrders(user.id);
        return sendJson(res, 200, { success: true, data: { orders } }, requestOrigin);
      }

      if (method === 'POST' && pathname === '/api/v1/orders') {
        const user = getAuthUser(req, true);
        const body = await readJsonBody(req);
        const clean = validateOrderPayload(body);
        const order = await orderService.createOrder({
          usuarioId: user.id,
          items: clean.items,
          notasEntrega: clean.notasEntrega
        });
        return sendJson(
          res,
          201,
          {
            success: true,
            message: `¡Pedido #${order.id} confirmado y en preparación! Stock e insumos actualizados.`,
            data: { order }
          },
          requestOrigin
        );
      }

      // 6. Reseñas, Favoritos y Recomendaciones
      if (method === 'GET' && pathname === '/api/v1/reviews') {
        const productoId = parsedUrl.searchParams.get('producto_id');
        const reviews = await communityService.listReviews({ productoId });
        return sendJson(res, 200, { success: true, data: { reviews } }, requestOrigin);
      }

      if (method === 'POST' && pathname === '/api/v1/reviews') {
        const user = getAuthUser(req, true);
        const body = await readJsonBody(req);
        const result = await communityService.submitReview({
          usuarioId: user.id,
          productoId: body.producto_id,
          estrellas: body.estrellas,
          comentario: body.comentario
        });
        return sendJson(
          res,
          201,
          { success: true, message: 'Calificación y reseña registradas exitosamente.', data: result },
          requestOrigin
        );
      }

      if (method === 'GET' && pathname === '/api/v1/favorites') {
        const user = getAuthUser(req, true);
        const favorites = await communityService.listFavorites(user.id);
        return sendJson(res, 200, { success: true, data: { favorites } }, requestOrigin);
      }

      const favToggleMatch = pathname.match(/^\/api\/v1\/favorites\/(\d+)\/toggle$/);
      if (favToggleMatch && method === 'POST') {
        const user = getAuthUser(req, true);
        const result = await communityService.toggleFavorite({
          usuarioId: user.id,
          productoId: Number(favToggleMatch[1])
        });
        return sendJson(res, 200, { success: true, message: result.message, data: result }, requestOrigin);
      }

      if (method === 'GET' && pathname === '/api/v1/recommendations') {
        getAuthUser(req, true);
        const recommendations = await communityService.listRecommendations();
        return sendJson(res, 200, { success: true, data: { recommendations } }, requestOrigin);
      }

      if (method === 'POST' && pathname === '/api/v1/recommendations') {
        const user = getAuthUser(req, true);
        const body = await readJsonBody(req);
        const recommendation = await communityService.submitRecommendation({
          usuarioId: user.id,
          nombreSugerido: body.nombre_sugerido,
          descripcionIngredientes: body.descripcion_ingredientes
        });
        return sendJson(
          res,
          201,
          {
            success: true,
            message: '¡Gracias! Tu recomendación de nuevo producto fue enviada al equipo de SazónYA.',
            data: { recommendation }
          },
          requestOrigin
        );
      }

      const recStatusMatch = pathname.match(/^\/api\/v1\/recommendations\/(\d+)\/status$/);
      if (recStatusMatch && method === 'PATCH') {
        const user = getAuthUser(req, true);
        assertAdmin(user);
        const body = await readJsonBody(req);
        const recommendation = await communityService.updateRecommendationStatus(
          Number(recStatusMatch[1]),
          body.estado
        );
        return sendJson(
          res,
          200,
          { success: true, message: 'Estado de la recomendación actualizado.', data: { recommendation } },
          requestOrigin
        );
      }

      // 7. Estadísticas Semanales (Admin)
      if (method === 'GET' && pathname === '/api/v1/analytics/weekly') {
        const user = getAuthUser(req, true);
        assertAdmin(user);
        const days = parsedUrl.searchParams.get('days') ? Number(parsedUrl.searchParams.get('days')) : 7;
        const stats = await analyticsService.getWeeklyDashboard({ days });
        return sendJson(res, 200, { success: true, data: stats }, requestOrigin);
      }

      // 8. Mensajes de Contacto (Público envía / Admin consulta)
      if (method === 'POST' && pathname === '/api/v1/contacts') {
        const body = await readJsonBody(req);
        const clean = validateContactPayload(body);
        const created = await contactService.submitContact(clean);
        return sendJson(
          res,
          201,
          {
            success: true,
            message: 'Mensaje de contacto enviado correctamente. Pronto nos comunicaremos contigo.',
            data: {
              id: created.id,
              nombre: created.nombre,
              correo: created.correo,
              asunto: created.asunto,
              estado: created.estado,
              creado_en: created.creado_en,
              contact: created
            }
          },
          requestOrigin
        );
      }

      if (method === 'GET' && pathname === '/api/v1/contacts') {
        const user = getAuthUser(req, true);
        assertAdmin(user);
        const contacts = await contactService.listContacts();
        return sendJson(res, 200, { success: true, data: { contacts } }, requestOrigin);
      }

      return sendJson(
        res,
        404,
        { success: false, message: `Ruta no encontrada: ${method} ${pathname}`, errors: [] },
        requestOrigin
      );
    } catch (err) {
      if (err instanceof AppError) {
        return sendJson(res, err.statusCode, err.toJSON(), requestOrigin);
      }
      return sendJson(
        res,
        500,
        { success: false, message: 'Error interno del servidor en SazónYA.', errors: [] },
        requestOrigin
      );
    }
  });
}
