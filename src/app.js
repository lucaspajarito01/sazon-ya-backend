import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ENV } from './config/env.js';
import { container } from './container.js';
import { createApiRouter } from './routes/apiRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { openApiSpec } from './docs/openapi.js';

export function createApp(customContainer = container) {
  const app = express();
  app.set('trust proxy', 1);

  // Seguridad perimetral
  app.use(helmet());
  app.use(
    cors({
      origin: ENV.CORS_ORIGIN === '*' ? true : [ENV.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true
    })
  );
  app.use(express.json({ limit: '256kb' }));

  // Cabecera SemVer en todas las respuestas
  app.use((req, res, next) => {
    res.setHeader('X-API-Version', ENV.API_VERSION);
    const clientRequiredMajor = req.headers['x-client-min-major'];
    if (clientRequiredMajor && Number(clientRequiredMajor) > Number(ENV.API_VERSION.split('.')[0])) {
      return res.status(426).json({
        success: false,
        message: `Versión de API incompatible. Servidor en ${ENV.API_VERSION}.`,
        errors: []
      });
    }
    return next();
  });

  // Rate limiting
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false
  });
  app.use('/api', apiLimiter);

  // Endpoints de salud, versión y documentación OpenAPI 3
  app.get('/version', (_req, res) => {
    res.status(200).json({
      success: true,
      name: 'sazon-ya-backend',
      version: ENV.API_VERSION
    });
  });

  app.get('/api/v1/health', (_req, res) => {
    res.status(200).json({
      success: true,
      status: 'OK',
      service: 'SazónYA Backend API',
      version: ENV.API_VERSION,
      dbMode: ENV.DB_MODE
    });
  });

  app.get('/api/docs', (_req, res) => {
    res.status(200).json(openApiSpec);
  });

  // Rutas de dominio
  app.use('/api/v1', createApiRouter(customContainer.controllers));

  // 404 uniforme
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
      errors: []
    });
  });

  // Manejador centralizado de errores
  app.use(errorHandler);

  return app;
}
