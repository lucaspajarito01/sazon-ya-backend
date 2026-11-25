import assert from 'node:assert/strict';
import { openApiSpec } from '../src/docs/openapi.js';

assert.equal(openApiSpec.openapi, '3.0.3', 'La versión de OpenAPI debe ser 3.0.3');
assert.ok(openApiSpec.info?.title, 'El contrato OpenAPI debe tener título');
assert.ok(openApiSpec.info?.version, 'El contrato OpenAPI debe tener versión SemVer');

const requiredPaths = [
  '/health',
  '/auth/register',
  '/auth/login',
  '/auth/me',
  '/products',
  '/products/{id}',
  '/condiments',
  '/condiments/{id}',
  '/events',
  '/events/{id}/participate',
  '/orders',
  '/orders/my',
  '/reviews',
  '/favorites',
  '/favorites/{productoId}/toggle',
  '/recommendations',
  '/analytics/weekly'
];

for (const pathKey of requiredPaths) {
  assert.ok(openApiSpec.paths[pathKey], `Falta el endpoint obligatorio en OpenAPI: ${pathKey}`);
}

console.log(`[DOCS:CHECK] Contrato OpenAPI 3 validado exitosamente (${requiredPaths.length} rutas verificadas).`);
