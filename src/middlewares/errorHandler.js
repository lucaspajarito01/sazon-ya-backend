import { AppError } from '../utils/AppError.js';
import { ENV } from '../config/env.js';

export function errorHandler(err, _req, res, _next) {
  if (res.headersSent) {
    return _next(err);
  }

  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'El cuerpo de la petición contiene JSON malformado.',
      errors: [{ field: 'body', message: 'SyntaxError en JSON' }]
    });
  }

  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'El archivo o cuerpo de la petición excede el límite permitido.',
      errors: []
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  if (err && err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Registro duplicado en la base de datos.',
      errors: [{ field: 'database', message: 'Conflicto de clave única.' }]
    });
  }

  if (err && err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      message: 'Referencia foránea inexistente.',
      errors: [{ field: 'database', message: 'La entidad relacionada no existe.' }]
    });
  }

  const statusCode = err?.statusCode || 500;
  const response = {
    success: false,
    message: statusCode === 500 ? 'Error interno del servidor en SazónYA.' : err.message,
    errors: []
  };

  if (ENV.NODE_ENV !== 'production' && err?.stack) {
    response.debug_message = err.message;
  }

  return res.status(statusCode).json(response);
}
