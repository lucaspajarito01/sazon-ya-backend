import { verifyJwt } from '../utils/cryptoAuth.js';
import { AppError } from '../utils/AppError.js';

export function authenticate(req, _res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }

    if (!token) {
      throw new AppError('Acceso no autorizado. Inicia sesión para continuar.', 401);
    }

    const decoded = verifyJwt(token);
    req.user = {
      id: Number(decoded.sub),
      correo: decoded.correo,
      rol: decoded.rol,
      nombre: decoded.nombre
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Autenticación requerida.', 401));
    }
    if (!allowedRoles.includes(req.user.rol)) {
      return next(
        new AppError(`Permisos insuficientes. Esta acción requiere rol: ${allowedRoles.join(' o ')}.`, 403)
      );
    }
    return next();
  };
}
