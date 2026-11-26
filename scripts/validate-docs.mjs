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
  '/uploads/{folder}/{filename}',
  '/condiments',
  '/condiments/{id}',
  '/events',
  '/events/{id}',
  '/events/{id}/status',
  '/events/{id}/participate',
  '/orders',
  '/orders/my',
  '/reviews',
  '/favorites',
  '/favorites/{productoId}/toggle',
  '/recommendations',
  '/analytics/weekly',
  '/contacts'
];

for (const pathKey of requiredPaths) {
  assert.ok(openApiSpec.paths[pathKey], `Falta el endpoint obligatorio en OpenAPI: ${pathKey}`);
}

assert.ok(openApiSpec.paths['/uploads/{folder}/{filename}'].get, 'Falta método GET en /uploads/{folder}/{filename}');
assert.ok(openApiSpec.paths['/events/{id}'].put, 'Falta método PUT en /events/{id}');
assert.ok(openApiSpec.paths['/events/{id}/status'].patch, 'Falta método PATCH en /events/{id}/status');
assert.ok(openApiSpec.paths['/contacts'].post, 'Falta método POST en /contacts');
assert.ok(openApiSpec.paths['/contacts'].get, 'Falta método GET en /contacts');

console.log(`[DOCS:CHECK] Contrato OpenAPI 3 validado exitosamente (${requiredPaths.length} rutas verificadas).`);
