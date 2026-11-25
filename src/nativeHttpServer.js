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
  validateProductPayload,
  validateCondimentPayload,
  validateEventPayload,
  validateOrderPayload
} from './validators/domainValidator.js';

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 262144) {
        reject(new AppError('El cuerpo de la petición excede el límite de 256KB.', 413));
      }
    });
    req.on('end', () => {
      if (!raw || !raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new AppError('El cuerpo de la petición contiene JSON malformado.', 400));
      }
    });
    req.on('error', reject);
  });
}

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
  const decoded = verifyJwt(token);
  return {
    id: Number(decoded.sub),
    correo: decoded.correo,
    rol: decoded.rol,
    nombre: decoded.nombre
  };
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
    analyticsService
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
        const body = await readJsonBody(req);
        const clean = validateProductPayload(body, false);
        const product = await inventoryService.createProduct(clean);
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
          const body = await readJsonBody(req);
          const clean = validateProductPayload(body, true);
          const product = await inventoryService.updateProduct(prodId, clean);
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
        const body = await readJsonBody(req);
        const clean = validateEventPayload(body);
        const event = await eventService.createEvent(clean, user.id);
        return sendJson(
          res,
          201,
          { success: true, message: 'Evento / promoción registrado por el administrador.', data: { event } },
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
