import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { DatabaseAdapter } from '../src/config/db.js';
import { buildContainer } from '../src/container.js';
import { createNativeHttpServer } from '../src/nativeHttpServer.js';

const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82
]);

const JPEG_BYTES = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
  0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xd9
]);

const MP4_BYTES = Buffer.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
  0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
  0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
  0x00, 0x00, 0x00, 0x08, 0x6d, 0x64, 0x61, 0x74
]);

let createAppFn = null;
try {
  ({ createApp: createAppFn } = await import('../src/app.js'));
} catch {
  createAppFn = null;
}

async function startServer(handler) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
}

async function startNativeServer(customContainer) {
  const server = createNativeHttpServer(customContainer);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
}

async function stopServer(server) {
  if (!server) return;
  await new Promise((resolve) => server.close(resolve));
}

async function login(baseUrl, correo, password) {
  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, password })
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  return json.data.token;
}

async function listDirSafe(dirPath) {
  try {
    return await fs.readdir(dirPath);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

function registerRuntimeSuite(runtimeName, serverFactory, getSkipReason = () => false) {
  describe(`M1 HTTP Integration (${runtimeName})`, { skip: getSkipReason() }, () => {
    let tmpUploadsDir;
    let prevUploadsDir;
    let testDb;
    let testContainer;
    let server;
    let baseUrl;
    let adminToken;
    let userToken;

    before(async () => {
      prevUploadsDir = process.env.UPLOADS_DIR;
      tmpUploadsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sazon-ya-uploads-'));
      process.env.UPLOADS_DIR = tmpUploadsDir;
      testDb = new DatabaseAdapter();
      testContainer = buildContainer(testDb);
      ({ server, baseUrl } = await serverFactory(testContainer));
    });

    after(async () => {
      await stopServer(server);
      if (prevUploadsDir === undefined) {
        delete process.env.UPLOADS_DIR;
      } else {
        process.env.UPLOADS_DIR = prevUploadsDir;
      }
      await fs.rm(tmpUploadsDir, { recursive: true, force: true });
    });

    beforeEach(async () => {
      testDb.reset();
      await fs.rm(path.join(tmpUploadsDir, 'products'), { recursive: true, force: true });
      await fs.rm(path.join(tmpUploadsDir, 'events'), { recursive: true, force: true });
      adminToken = await login(baseUrl, 'admin@sazonya.com', 'Admin123!');
      userToken = await login(baseUrl, 'camila@cliente.com', 'Cliente123!');
    });

    it('R4: sube imagen multipart PNG al crear producto, sirve /uploads/* con cabeceras CORP y reemplaza limpiando archivo anterior en PUT', async () => {
      const createForm = new FormData();
      createForm.append('categoria_id', '1');
      createForm.append('nombre', 'Burger Upload Brasa');
      createForm.append('descripcion', 'Hamburguesa artesanal con carne a la parrilla y salsa especial.');
      createForm.append('costo_unitario', '4.2');
      createForm.append('precio_venta', '11.5');
      createForm.append('stock_actual', '15');
      createForm.append('stock_minimo', '5');
      createForm.append('imagen', new Blob([PNG_BYTES], { type: 'image/png' }), 'burger.png');

      const createRes = await fetch(`${baseUrl}/api/v1/products`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          Origin: 'http://localhost:5173'
        },
        body: createForm
      });
      assert.equal(createRes.status, 201);
      const createdJson = await createRes.json();
      assert.equal(createdJson.success, true);
      const product = createdJson.data.product;
      assert.match(product.imagen_url, /^\/uploads\/products\/prod-\d+-[a-f0-9]+\.png$/);

      const firstFile = path.join(tmpUploadsDir, 'products', path.basename(product.imagen_url));
      const storedBytes = await fs.readFile(firstFile);
      assert.deepEqual(storedBytes, PNG_BYTES);

      // GET /uploads/products/<filename>
      const assetRes = await fetch(`${baseUrl}${product.imagen_url}`, {
        headers: { Origin: 'http://localhost:5173' }
      });
      assert.equal(assetRes.status, 200);
      assert.equal(assetRes.headers.get('content-type'), 'image/png');
      assert.equal(assetRes.headers.get('cross-origin-resource-policy'), 'cross-origin');
      assert.equal(assetRes.headers.get('x-content-type-options'), 'nosniff');
      assert.match(assetRes.headers.get('cache-control') || '', /max-age=86400/);
      const servedBytes = Buffer.from(await assetRes.arrayBuffer());
      assert.deepEqual(servedBytes, PNG_BYTES);

      // PUT con nueva imagen JPEG usando alias 'image' reemplaza y elimina el PNG anterior
      const updateForm = new FormData();
      updateForm.append('nombre', 'Burger Upload Brasa Editada');
      updateForm.append('imagen_url', '');
      updateForm.append('image', new Blob([JPEG_BYTES], { type: 'image/jpeg' }), 'burger.jpg');

      const updateRes = await fetch(`${baseUrl}/api/v1/products/${product.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: updateForm
      });
      assert.equal(updateRes.status, 200);
      const updatedJson = await updateRes.json();
      const updatedProd = updatedJson.data.product;
      assert.match(updatedProd.imagen_url, /^\/uploads\/products\/prod-\d+-[a-f0-9]+\.jpg$/);

      await assert.rejects(() => fs.access(firstFile), { code: 'ENOENT' });
      const secondFile = path.join(tmpUploadsDir, 'products', path.basename(updatedProd.imagen_url));
      assert.deepEqual(await fs.readFile(secondFile), JPEG_BYTES);

      // PUT sin nueva imagen ni imagen_url (JSON y FormData vacío) preserva imagen_url existente
      const preserveForm = new FormData();
      preserveForm.append('precio_venta', '12.5');
      preserveForm.append('imagen_url', '');
      const preserveRes = await fetch(`${baseUrl}/api/v1/products/${product.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: preserveForm
      });
      assert.equal(preserveRes.status, 200);
      const preservedJson = await preserveRes.json();
      assert.equal(preservedJson.data.product.imagen_url, updatedProd.imagen_url);
      assert.equal(preservedJson.data.product.precio_venta, 12.5);
      await fs.access(secondFile);
    });

    it('R4: soporta fallback JSON imagen_base64 y rechaza archivos inválidos, oversize, sin permisos, errores con rollback y path traversal', async () => {
      // 1. JSON imagen_base64
      const base64Url = `data:image/png;base64,${PNG_BYTES.toString('base64')}`;
      const b64Res = await fetch(`${baseUrl}/api/v1/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          categoria_id: 1,
          nombre: 'Burger Base64 Test',
          descripcion: 'Hamburguesa cargada mediante fallback Base64 JSON.',
          costo_unitario: 3.5,
          precio_venta: 9.5,
          stock_actual: 10,
          imagen_base64: base64Url
        })
      });
      assert.equal(b64Res.status, 201);
      const b64Json = await b64Res.json();
      assert.match(b64Json.data.product.imagen_url, /^\/uploads\/products\/prod-.*\.png$/);
      assert.ok(b64Json.data.product.imagen_url.length < 500);

      // 2. Unauthenticated (401) & USER (403)
      const unauthRes = await fetch(`${baseUrl}/api/v1/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: 'Sin Auth' })
      });
      assert.equal(unauthRes.status, 401);

      const userRes = await fetch(`${baseUrl}/api/v1/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({ nombre: 'Sin Permisos' })
      });
      assert.equal(userRes.status, 403);

      const countBeforeRejections = (await listDirSafe(path.join(tmpUploadsDir, 'products'))).length;

      // 3. Fake PNG magic bytes -> 415
      const spoofForm = new FormData();
      spoofForm.append('categoria_id', '1');
      spoofForm.append('nombre', 'Burger Spoof');
      spoofForm.append('descripcion', 'Producto con archivo falso para probar seguridad.');
      spoofForm.append('costo_unitario', '3');
      spoofForm.append('precio_venta', '8');
      spoofForm.append('imagen', new Blob([Buffer.from('MZ-fake-executable')], { type: 'image/png' }), 'fake.png');

      const spoofRes = await fetch(`${baseUrl}/api/v1/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: spoofForm
      });
      assert.equal(spoofRes.status, 415);

      // 4. SVG upload -> 415
      const svgForm = new FormData();
      svgForm.append('categoria_id', '1');
      svgForm.append('nombre', 'Burger SVG');
      svgForm.append('descripcion', 'Producto con SVG malicioso bloqueado.');
      svgForm.append('costo_unitario', '3');
      svgForm.append('precio_venta', '8');
      svgForm.append('imagen', new Blob([Buffer.from('<svg onload=alert(1)></svg>')], { type: 'image/svg+xml' }), 'evil.svg');

      const svgRes = await fetch(`${baseUrl}/api/v1/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: svgForm
      });
      assert.equal(svgRes.status, 415);

      // 5. Oversize (> 5 MB) -> 413
      const bigBuffer = Buffer.concat([PNG_BYTES, Buffer.alloc(5 * 1024 * 1024 + 256, 0x41)]);
      const bigForm = new FormData();
      bigForm.append('categoria_id', '1');
      bigForm.append('nombre', 'Burger Gigante');
      bigForm.append('descripcion', 'Producto con imagen mayor a 5 MB.');
      bigForm.append('costo_unitario', '3');
      bigForm.append('precio_venta', '8');
      bigForm.append('imagen', new Blob([bigBuffer], { type: 'image/png' }), 'huge.png');

      const bigRes = await fetch(`${baseUrl}/api/v1/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: bigForm
      });
      assert.equal(bigRes.status, 413);

      // 6. Error de negocio (409 nombre duplicado) con PNG válido -> 409 y cero archivos huérfanos
      const dupForm = new FormData();
      dupForm.append('categoria_id', '1');
      dupForm.append('nombre', 'Sazón Brasa Doble Cheddar');
      dupForm.append('descripcion', 'Nombre duplicado para verificar rollback de imagen.');
      dupForm.append('costo_unitario', '4');
      dupForm.append('precio_venta', '9');
      dupForm.append('imagen', new Blob([PNG_BYTES], { type: 'image/png' }), 'rollback.png');

      const dupRes = await fetch(`${baseUrl}/api/v1/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: dupForm
      });
      assert.equal(dupRes.status, 409);

      const countAfterRejections = (await listDirSafe(path.join(tmpUploadsDir, 'products'))).length;
      assert.equal(countAfterRejections, countBeforeRejections);

      // 7. Path traversal & dotfile protection
      const travRes = await fetch(`${baseUrl}/uploads/products/%2e%2e/%2e%2e/.env`);
      assert.ok(travRes.status === 400 || travRes.status === 404);

      const dotRes = await fetch(`${baseUrl}/uploads/products/.gitkeep`);
      assert.ok(dotRes.status === 400 || dotRes.status === 404);
    });

    it('R3: gestiona eventos con media VIDEO/POSTING multipart, Range 206, reemplazo con limpieza y PATCH /status', async () => {
      // 1. POST /api/v1/events con video MP4
      const evForm = new FormData();
      evForm.append('titulo', 'Lanzamiento Burger Ahumada');
      evForm.append('descripcion', 'Video promocional del nuevo lanzamiento de temporada en SazónYA.');
      evForm.append('tipo', 'EVENTO');
      evForm.append('fecha_inicio', new Date(Date.now() - 3600000).toISOString());
      evForm.append('fecha_fin', new Date(Date.now() + 86400000 * 5).toISOString());
      evForm.append('media_tipo', 'VIDEO');
      evForm.append('media_file', new Blob([MP4_BYTES], { type: 'video/mp4' }), 'promo.mp4');

      const createEvRes = await fetch(`${baseUrl}/api/v1/events`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: evForm
      });
      assert.equal(createEvRes.status, 201);
      const createdEv = (await createEvRes.json()).data.event;
      assert.equal(createdEv.media_tipo, 'VIDEO');
      assert.match(createdEv.media_url, /^\/uploads\/events\/evt-\d+-[a-f0-9]+\.mp4$/);

      const mp4File = path.join(tmpUploadsDir, 'events', path.basename(createdEv.media_url));
      assert.deepEqual(await fs.readFile(mp4File), MP4_BYTES);

      // Range 206 check
      const rangeRes = await fetch(`${baseUrl}${createdEv.media_url}`, {
        headers: { Range: 'bytes=0-15' }
      });
      assert.equal(rangeRes.status, 206);
      assert.equal(rangeRes.headers.get('content-type'), 'video/mp4');
      assert.equal(rangeRes.headers.get('cross-origin-resource-policy'), 'cross-origin');
      assert.equal((await rangeRes.arrayBuffer()).byteLength, 16);

      // 2. PUT /api/v1/events/:id reemplazando VIDEO por POSTING con imagen PNG
      const editEvForm = new FormData();
      editEvForm.append('media_tipo', 'POSTING');
      editEvForm.append('posting_contenido', '¡Este viernes disfruta 2x1 en nuestra terraza!');
      editEvForm.append('media_file', new Blob([PNG_BYTES], { type: 'image/png' }), 'poster.png');

      const putEvRes = await fetch(`${baseUrl}/api/v1/events/${createdEv.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: editEvForm
      });
      assert.equal(putEvRes.status, 200);
      const updatedEv = (await putEvRes.json()).data.event;
      assert.equal(updatedEv.media_tipo, 'POSTING');
      assert.equal(updatedEv.posting_contenido, '¡Este viernes disfruta 2x1 en nuestra terraza!');
      assert.match(updatedEv.media_url, /^\/uploads\/events\/evt-\d+-[a-f0-9]+\.png$/);
      await assert.rejects(() => fs.access(mp4File), { code: 'ENOENT' });

      // 3. Mismatch media_tipo VIDEO con PNG -> 400 sin huérfanos
      const eventsFilesBefore = (await listDirSafe(path.join(tmpUploadsDir, 'events'))).length;
      const mismatchForm = new FormData();
      mismatchForm.append('media_tipo', 'VIDEO');
      mismatchForm.append('media_file', new Blob([PNG_BYTES], { type: 'image/png' }), 'not-video.png');
      const mismatchRes = await fetch(`${baseUrl}/api/v1/events/${createdEv.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: mismatchForm
      });
      assert.equal(mismatchRes.status, 400);
      assert.equal((await listDirSafe(path.join(tmpUploadsDir, 'events'))).length, eventsFilesBefore);

      // 4. PATCH /api/v1/events/:id/status parity
      const patchRes = await fetch(`${baseUrl}/api/v1/events/${createdEv.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ estado: 'FINALIZADO' })
      });
      assert.equal(patchRes.status, 200);
      assert.equal((await patchRes.json()).data.event.estado, 'FINALIZADO');

      // 5. GET /api/v1/events expone los nuevos campos
      const listRes = await fetch(`${baseUrl}/api/v1/events`);
      assert.equal(listRes.status, 200);
      const found = (await listRes.json()).data.events.find((e) => e.id === createdEv.id);
      assert.equal(found.media_tipo, 'POSTING');
      assert.equal(found.media_url, updatedEv.media_url);
      assert.equal(found.posting_contenido, '¡Este viernes disfruta 2x1 en nuestra terraza!');
    });

    it('R3: GET /api/v1/analytics/weekly retorna serie_diaria cronológica coherente con resumen_global', async () => {
      const res = await fetch(`${baseUrl}/api/v1/analytics/weekly?days=7`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const { data } = await res.json();

      assert.ok(data.resumen_global);
      assert.ok(data.producto_mas_vendido);
      assert.ok(data.producto_mayor_ganancia);
      assert.ok(Array.isArray(data.ganancias_por_producto));
      assert.ok(Array.isArray(data.alertas_inventario));
      assert.ok(Array.isArray(data.serie_diaria));
      assert.equal(data.serie_diaria.length, 7);

      for (let i = 0; i < data.serie_diaria.length; i += 1) {
        const point = data.serie_diaria[i];
        assert.match(point.fecha, /^\d{4}-\d{2}-\d{2}$/);
        if (i > 0) {
          assert.ok(data.serie_diaria[i - 1].fecha < point.fecha);
        }
      }

      const totals = data.serie_diaria.reduce(
        (acc, d) => {
          acc.pedidos += d.pedidos;
          acc.unidades += d.unidades;
          acc.ingresos = Number((acc.ingresos + d.ingresos).toFixed(2));
          acc.ganancia_neta = Number((acc.ganancia_neta + d.ganancia_neta).toFixed(2));
          return acc;
        },
        { pedidos: 0, unidades: 0, ingresos: 0, ganancia_neta: 0 }
      );

      assert.equal(totals.pedidos, data.resumen_global.total_pedidos_entregados);
      assert.equal(totals.unidades, data.resumen_global.total_unidades_vendidas);
      assert.equal(totals.ingresos, data.resumen_global.ingresos_semanales);
      assert.equal(totals.ganancia_neta, data.resumen_global.ganancia_neta_semanal);
    });

    it('R2: POST /api/v1/contacts (público) y GET /api/v1/contacts (ADMIN) validan y persisten mensajes', async () => {
      // 1. Inválido / XSS HTML -> 400
      const badRes = await fetch(`${baseUrl}/api/v1/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: 'A',
          correo: 'no-es-correo',
          asunto: 'Hi',
          mensaje: '<script>alert(1)</script>'
        })
      });
      assert.equal(badRes.status, 400);

      // 2. Público válido -> 201
      const okRes = await fetch(`${baseUrl}/api/v1/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: 'Laura Gómez',
          correo: 'laura@ejemplo.com',
          asunto: 'Reserva para evento privado',
          mensaje: 'Hola equipo de SazónYA, quisiera cotizar un evento para 25 personas este sábado.'
        })
      });
      assert.equal(okRes.status, 201);
      const okJson = await okRes.json();
      assert.equal(okJson.success, true);
      assert.equal(okJson.data.nombre, 'Laura Gómez');
      assert.equal(okJson.data.correo, 'laura@ejemplo.com');
      assert.equal(okJson.data.estado, 'PENDIENTE');

      // 3. GET /api/v1/contacts -> 401 / 403 / 200
      const unauthList = await fetch(`${baseUrl}/api/v1/contacts`);
      assert.equal(unauthList.status, 401);

      const userList = await fetch(`${baseUrl}/api/v1/contacts`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      assert.equal(userList.status, 403);

      const adminList = await fetch(`${baseUrl}/api/v1/contacts`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(adminList.status, 200);
      const listJson = await adminList.json();
      assert.equal(listJson.data.contacts.length, 1);
      assert.equal(listJson.data.contacts[0].id, okJson.data.id);
    });

    it('Regresión Fix 1: multipart LF (\\n) con secuencia 0x0D 0x0A 0x0D 0x0A dentro de PNG preserva campos y bytes exactos', async () => {
      const pngWithDoubleCrlf = Buffer.concat([
        PNG_BYTES.subarray(0, 41),
        Buffer.from([0x0d, 0x0a, 0x0d, 0x0a]),
        PNG_BYTES.subarray(41)
      ]);
      const boundary = '----SazonLFProbeBoundary9876';
      const lfPart = (headers, valueBuf) =>
        Buffer.concat([
          Buffer.from(`--${boundary}\n${headers}\n\n`, 'utf8'),
          Buffer.isBuffer(valueBuf) ? valueBuf : Buffer.from(String(valueBuf), 'utf8'),
          Buffer.from('\n', 'utf8')
        ]);

      const rawMultipart = Buffer.concat([
        lfPart('Content-Disposition: form-data; name="categoria_id"', '1'),
        lfPart('Content-Disposition: form-data; name="nombre"', 'Burger LF CRLF Intacto'),
        lfPart(
          'Content-Disposition: form-data; name="descripcion"',
          'Producto enviado con delimitadores LF y secuencia CRLF binaria.'
        ),
        lfPart('Content-Disposition: form-data; name="costo_unitario"', '4.0'),
        lfPart('Content-Disposition: form-data; name="precio_venta"', '10.0'),
        lfPart(
          'Content-Disposition: form-data; name="imagen"; filename="lf-crlf.png"\nContent-Type: image/png',
          pngWithDoubleCrlf
        ),
        Buffer.from(`--${boundary}--\n`, 'utf8')
      ]);

      const res = await fetch(`${baseUrl}/api/v1/products`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: rawMultipart
      });
      assert.equal(res.status, 201);
      const { product } = (await res.json()).data;
      assert.equal(product.nombre, 'Burger LF CRLF Intacto');
      assert.match(product.imagen_url, /^\/uploads\/products\/prod-\d+-[a-f0-9]+\.png$/);

      const storedFile = path.join(tmpUploadsDir, 'products', path.basename(product.imagen_url));
      assert.equal(Buffer.compare(await fs.readFile(storedFile), pngWithDoubleCrlf), 0);

      const served = await fetch(`${baseUrl}${product.imagen_url}`);
      assert.equal(served.status, 200);
      assert.equal(Buffer.compare(Buffer.from(await served.arrayBuffer()), pngWithDoubleCrlf), 0);
    });

    it('Regresión Fix 2 y 3: PUT /events/:id VIDEO->POSTING limpia media_url y borra .mp4; POSTING(.png)->VIDEO sin video falla 400', async () => {
      // Caso A: VIDEO (.mp4) -> POSTING solo texto con media_url: '' limpia media_url y borra .mp4
      const vForm1 = new FormData();
      vForm1.append('titulo', 'Video a Posting Vacio');
      vForm1.append('descripcion', 'Evento inicial en video que pasará a posting de solo texto.');
      vForm1.append('fecha_inicio', new Date(Date.now() - 3600000).toISOString());
      vForm1.append('fecha_fin', new Date(Date.now() + 86400000 * 3).toISOString());
      vForm1.append('media_tipo', 'VIDEO');
      vForm1.append('media_file', new Blob([MP4_BYTES], { type: 'video/mp4' }), 'v1.mp4');

      const vRes1 = await fetch(`${baseUrl}/api/v1/events`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: vForm1
      });
      assert.equal(vRes1.status, 201);
      const videoEv1 = (await vRes1.json()).data.event;
      const mp4Path1 = path.join(tmpUploadsDir, 'events', path.basename(videoEv1.media_url));
      await fs.access(mp4Path1);

      const toPostingRes1 = await fetch(`${baseUrl}/api/v1/events/${videoEv1.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          media_tipo: 'POSTING',
          media_url: '',
          posting_contenido: 'Comunicado solo texto sin video anterior.'
        })
      });
      assert.equal(toPostingRes1.status, 200);
      const updatedPosting1 = (await toPostingRes1.json()).data.event;
      assert.equal(updatedPosting1.media_tipo, 'POSTING');
      assert.equal(updatedPosting1.media_url, null);
      assert.equal(updatedPosting1.posting_contenido, 'Comunicado solo texto sin video anterior.');
      await assert.rejects(() => fs.access(mp4Path1), { code: 'ENOENT' });

      // Caso B: VIDEO (.mp4) -> POSTING solo texto omitiendo media_url también limpia media_url y borra .mp4
      const vForm2 = new FormData();
      vForm2.append('titulo', 'Video a Posting Omitido');
      vForm2.append('descripcion', 'Segundo evento video que cambia a posting omitiendo media_url.');
      vForm2.append('fecha_inicio', new Date(Date.now() - 3600000).toISOString());
      vForm2.append('fecha_fin', new Date(Date.now() + 86400000 * 3).toISOString());
      vForm2.append('media_tipo', 'VIDEO');
      vForm2.append('media_file', new Blob([MP4_BYTES], { type: 'video/mp4' }), 'v2.mp4');

      const vRes2 = await fetch(`${baseUrl}/api/v1/events`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: vForm2
      });
      assert.equal(vRes2.status, 201);
      const videoEv2 = (await vRes2.json()).data.event;
      const mp4Path2 = path.join(tmpUploadsDir, 'events', path.basename(videoEv2.media_url));

      const toPostingRes2 = await fetch(`${baseUrl}/api/v1/events/${videoEv2.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          media_tipo: 'POSTING',
          posting_contenido: 'Solo texto con media_url omitido.'
        })
      });
      assert.equal(toPostingRes2.status, 200);
      const updatedPosting2 = (await toPostingRes2.json()).data.event;
      assert.equal(updatedPosting2.media_tipo, 'POSTING');
      assert.equal(updatedPosting2.media_url, null);
      await assert.rejects(() => fs.access(mp4Path2), { code: 'ENOENT' });

      // Caso C (Fix 3): POSTING con imagen local (.png) -> VIDEO sin nuevo video ni media_url falla con 400
      const pForm = new FormData();
      pForm.append('titulo', 'Posting Imagen a Video');
      pForm.append('descripcion', 'Evento posting con imagen PNG que no debe cambiar a VIDEO sin video.');
      pForm.append('fecha_inicio', new Date(Date.now() - 3600000).toISOString());
      pForm.append('fecha_fin', new Date(Date.now() + 86400000 * 3).toISOString());
      pForm.append('media_tipo', 'POSTING');
      pForm.append('posting_contenido', 'Poster del evento.');
      pForm.append('media_file', new Blob([PNG_BYTES], { type: 'image/png' }), 'poster.png');

      const pRes = await fetch(`${baseUrl}/api/v1/events`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: pForm
      });
      assert.equal(pRes.status, 201);
      const postingEv = (await pRes.json()).data.event;
      const pngPath = path.join(tmpUploadsDir, 'events', path.basename(postingEv.media_url));

      const badSwitchRes = await fetch(`${baseUrl}/api/v1/events/${postingEv.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ media_tipo: 'VIDEO' })
      });
      assert.equal(badSwitchRes.status, 400);

      const badExplicitPngRes = await fetch(`${baseUrl}/api/v1/events/${postingEv.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ media_tipo: 'VIDEO', media_url: postingEv.media_url })
      });
      assert.equal(badExplicitPngRes.status, 400);
      await fs.access(pngPath);
    });

    it('Regresión Fix 4: PATCH /api/v1/events/:id/status con {} o { estado: "" } responde 400 sin resetear a ACTIVO', async () => {
      const finalizeRes = await fetch(`${baseUrl}/api/v1/events/1/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ estado: 'FINALIZADO' })
      });
      assert.equal(finalizeRes.status, 200);
      assert.equal((await finalizeRes.json()).data.event.estado, 'FINALIZADO');

      for (const invalidBody of [{}, { estado: '' }, { estado: '   ' }, { estado: 'NO_EXISTE' }]) {
        const res = await fetch(`${baseUrl}/api/v1/events/1/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`
          },
          body: JSON.stringify(invalidBody)
        });
        assert.equal(res.status, 400);
      }

      const listRes = await fetch(`${baseUrl}/api/v1/events`);
      assert.equal(listRes.status, 200);
      const ev1 = (await listRes.json()).data.events.find((e) => e.id === 1);
      assert.equal(ev1.estado, 'FINALIZADO');
    });

    it('Regresión Fix 5: GET /api/v1/analytics/weekly?days=1 alinea ventana a medianoche UTC sin desbordar serie_diaria', async () => {
      const now = new Date();
      const todayUtcMidnightMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      const prevUtcOrderIso = new Date(todayUtcMidnightMs - 1000).toISOString();

      const nextOrderId = Math.max(...testDb.state.pedidos.map((p) => p.id)) + 1;
      const nextDetailId = Math.max(...testDb.state.detalle_pedidos.map((d) => d.id)) + 1;
      testDb.state.pedidos.push({
        id: nextOrderId,
        usuario_id: 2,
        estado: 'ENTREGADO',
        total_venta: 19.8,
        total_costo: 9.0,
        notas_entrega: 'Pedido justo antes de medianoche UTC.',
        creado_en: prevUtcOrderIso
      });
      testDb.state.detalle_pedidos.push({
        id: nextDetailId,
        pedido_id: nextOrderId,
        producto_id: 1,
        cantidad: 2,
        precio_unitario_snapshot: 9.9,
        costo_unitario_snapshot: 4.5,
        subtotal_venta: 19.8,
        ganancia_neta_linea: 10.8
      });

      const res = await fetch(`${baseUrl}/api/v1/analytics/weekly?days=1`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const { data } = await res.json();

      assert.equal(data.periodo_dias, 1);
      assert.equal(data.serie_diaria.length, 1);
      assert.equal(data.serie_diaria[0].fecha, now.toISOString().slice(0, 10));
      assert.equal(data.serie_diaria[0].pedidos, data.resumen_global.total_pedidos_entregados);
      assert.equal(data.serie_diaria[0].unidades, data.resumen_global.total_unidades_vendidas);
      assert.equal(data.serie_diaria[0].ingresos, data.resumen_global.ingresos_semanales);
      assert.equal(data.serie_diaria[0].ganancia_neta, data.resumen_global.ganancia_neta_semanal);
    });

    it('Regresión M1-I3 (1G/1H/1E): PUT POSTING con media_url="" preserva .png; VIDEO->POSTING limpia .mp4; VIDEO con /uploads/products/*.png falla 400', async () => {
      const startIso = new Date(Date.now() - 3600000).toISOString();
      const endIso = new Date(Date.now() + 86400000 * 5).toISOString();

      // Subcaso A: POSTING texto+imagen -> PUT FormData con media_tipo='POSTING' y media_url='' preserva .png
      const form1 = new FormData();
      form1.append('titulo', 'Posting Texto+Imagen Original');
      form1.append('descripcion', 'Evento posting con texto e imagen para probar preservación.');
      form1.append('fecha_inicio', startIso);
      form1.append('fecha_fin', endIso);
      form1.append('media_tipo', 'POSTING');
      form1.append('posting_contenido', 'Contenido textual inicial.');
      form1.append('media_file', new Blob([PNG_BYTES], { type: 'image/png' }), 'poster-txt.png');

      const res1 = await fetch(`${baseUrl}/api/v1/events`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: form1
      });
      assert.equal(res1.status, 201);
      const ev1 = (await res1.json()).data.event;
      const pngPath1 = path.join(tmpUploadsDir, 'events', path.basename(ev1.media_url));
      await fs.access(pngPath1);

      const editForm1 = new FormData();
      editForm1.append('titulo', 'Posting Texto+Imagen Editado');
      editForm1.append('media_tipo', 'POSTING');
      editForm1.append('media_url', '');
      const editRes1 = await fetch(`${baseUrl}/api/v1/events/${ev1.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: editForm1
      });
      assert.equal(editRes1.status, 200);
      const updated1 = (await editRes1.json()).data.event;
      assert.equal(updated1.media_tipo, 'POSTING');
      assert.equal(updated1.media_url, ev1.media_url);
      assert.equal(updated1.titulo, 'Posting Texto+Imagen Editado');
      await fs.access(pngPath1);

      // Subcaso B: POSTING solo imagen (posting_contenido null) -> PUT con media_url='' preserva .png y responde 200
      const form2 = new FormData();
      form2.append('titulo', 'Posting Solo Imagen Original');
      form2.append('descripcion', 'Evento posting únicamente con imagen para probar preservación.');
      form2.append('fecha_inicio', startIso);
      form2.append('fecha_fin', endIso);
      form2.append('media_tipo', 'POSTING');
      form2.append('media_file', new Blob([PNG_BYTES], { type: 'image/png' }), 'poster-img.png');

      const res2 = await fetch(`${baseUrl}/api/v1/events`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: form2
      });
      assert.equal(res2.status, 201);
      const ev2 = (await res2.json()).data.event;
      assert.equal(ev2.posting_contenido, null);
      const pngPath2 = path.join(tmpUploadsDir, 'events', path.basename(ev2.media_url));
      await fs.access(pngPath2);

      const editForm2 = new FormData();
      editForm2.append('titulo', 'Posting Solo Imagen Editado');
      editForm2.append('media_tipo', 'POSTING');
      editForm2.append('media_url', '');
      const editRes2 = await fetch(`${baseUrl}/api/v1/events/${ev2.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: editForm2
      });
      assert.equal(editRes2.status, 200);
      const updated2 = (await editRes2.json()).data.event;
      assert.equal(updated2.media_url, ev2.media_url);
      assert.equal(updated2.posting_contenido, null);
      await fs.access(pngPath2);

      // Subcaso C: JSON explícito media_url: null y media_tipo: 'NONE' limpian media y borran archivo
      const clearNullRes = await fetch(`${baseUrl}/api/v1/events/${ev1.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ media_url: null })
      });
      assert.equal(clearNullRes.status, 200);
      assert.equal((await clearNullRes.json()).data.event.media_url, null);
      await assert.rejects(() => fs.access(pngPath1), { code: 'ENOENT' });

      const clearNoneRes = await fetch(`${baseUrl}/api/v1/events/${ev2.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          media_tipo: 'NONE',
          media_url: 'https://stale.example/x.mp4',
          posting_contenido: 'Texto residual'
        })
      });
      assert.equal(clearNoneRes.status, 200);
      const clearedNone = (await clearNoneRes.json()).data.event;
      assert.equal(clearedNone.media_tipo, 'NONE');
      assert.equal(clearedNone.media_url, null);
      assert.equal(clearedNone.posting_contenido, null);
      await assert.rejects(() => fs.access(pngPath2), { code: 'ENOENT' });

      // Subcaso D (1E): /uploads/products/*.png y extensión inválida en /uploads/events/* fallan 400
      for (const badMediaUrl of ['/uploads/products/prod-123.png', '/uploads/events/bad.txt']) {
        const badRes = await fetch(`${baseUrl}/api/v1/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`
          },
          body: JSON.stringify({
            titulo: 'Video con ruta local inválida',
            descripcion: 'Intento inválido usando ruta local fuera de events o extensión incorrecta.',
            fecha_inicio: startIso,
            fecha_fin: endIso,
            media_tipo: 'VIDEO',
            media_url: badMediaUrl
          })
        });
        assert.equal(badRes.status, 400);
      }
    });

    it('Regresión M1-I3 (2A/4A): JSON body null o [] en PATCH /events/:id/status y POST /contacts responde 400 (no 500)', async () => {
      for (const rawBody of ['null', '[]']) {
        const patchRes = await fetch(`${baseUrl}/api/v1/events/1/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`
          },
          body: rawBody
        });
        assert.equal(patchRes.status, 400);
        assert.equal((await patchRes.json()).success, false);

        const contactRes = await fetch(`${baseUrl}/api/v1/contacts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: rawBody
        });
        assert.equal(contactRes.status, 400);
        assert.equal((await contactRes.json()).success, false);
      }
    });

    it('Regresión M1-I3 (3C): GET /api/v1/analytics/weekly?days=0.5 normaliza a periodo_dias 7 y serie_diaria de 7 días', async () => {
      const res = await fetch(`${baseUrl}/api/v1/analytics/weekly?days=0.5`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const { data } = await res.json();
      assert.equal(data.periodo_dias, 7);
      assert.ok(Array.isArray(data.serie_diaria));
      assert.equal(data.serie_diaria.length, 7);
      assert.ok(data.resumen_global.total_pedidos_entregados >= 0);
    });

    it('Regresión M1-I3 (optionalAuthenticate parity): GET /api/v1/events con Bearer token inválido responde 200', async () => {
      const res = await fetch(`${baseUrl}/api/v1/events`, {
        headers: { Authorization: 'Bearer token.invalido.expirado' }
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data.events));
      for (const ev of json.data.events) {
        assert.equal(ev.usuario_inscrito, false);
        assert.equal(ev.codigo_boleto, null);
      }
    });

    it('Regresión M1-I3 (A5): multipart LF (\\n) con payload binario WEBP terminado en 0x0D preserva longitud exacta y byte final 0x0D', async () => {
      const WEBP_TRAILING_CR_BYTES = Buffer.from([
        0x52, 0x49, 0x46, 0x46,
        0x13, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50,
        0x56, 0x50, 0x38, 0x20,
        0x07, 0x00, 0x00, 0x00,
        0x9d, 0x01, 0x2a, 0x01,
        0x00, 0x01, 0x0d
      ]);
      const boundary = '----SazonLFWebpTrailingCR1234';
      const lfPart = (headers, valueBuf) =>
        Buffer.concat([
          Buffer.from(`--${boundary}\n${headers}\n\n`, 'utf8'),
          Buffer.isBuffer(valueBuf) ? valueBuf : Buffer.from(String(valueBuf), 'utf8'),
          Buffer.from('\n', 'utf8')
        ]);

      const rawMultipart = Buffer.concat([
        lfPart('Content-Disposition: form-data; name="categoria_id"', '1'),
        lfPart('Content-Disposition: form-data; name="nombre"', 'Burger LF WEBP Trailing CR'),
        lfPart(
          'Content-Disposition: form-data; name="descripcion"',
          'Producto enviado con multipart LF y WEBP finalizado en 0x0D.'
        ),
        lfPart('Content-Disposition: form-data; name="costo_unitario"', '4.0'),
        lfPart('Content-Disposition: form-data; name="precio_venta"', '10.0'),
        lfPart(
          'Content-Disposition: form-data; name="imagen"; filename="trailing-cr.webp"\nContent-Type: image/webp',
          WEBP_TRAILING_CR_BYTES
        ),
        Buffer.from(`--${boundary}--\n`, 'utf8')
      ]);

      const res = await fetch(`${baseUrl}/api/v1/products`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: rawMultipart
      });
      assert.equal(res.status, 201);
      const { product } = (await res.json()).data;
      assert.match(product.imagen_url, /^\/uploads\/products\/prod-\d+-[a-f0-9]+\.webp$/);

      const storedFile = path.join(tmpUploadsDir, 'products', path.basename(product.imagen_url));
      const stored = await fs.readFile(storedFile);
      assert.equal(stored.length, WEBP_TRAILING_CR_BYTES.length);
      assert.equal(stored[stored.length - 1], 0x0d);
      assert.equal(Buffer.compare(stored, WEBP_TRAILING_CR_BYTES), 0);

      const served = await fetch(`${baseUrl}${product.imagen_url}`);
      assert.equal(served.status, 200);
      assert.equal(served.headers.get('content-type'), 'image/webp');
      assert.equal(Buffer.compare(Buffer.from(await served.arrayBuffer()), WEBP_TRAILING_CR_BYTES), 0);
    });

    it('Regresión M1-I4: prefijo /uploads/ sensible a mayúsculas (400) y POST /events con media_tipo NONE limpia campos residuales preservando multipart auto-detect', async () => {
      const startIso = new Date(Date.now() - 3600000).toISOString();
      const endIso = new Date(Date.now() + 86400000 * 5).toISOString();

      // (a) Prefijo /UPLOADS/ en eventos (POSTING y VIDEO), paths con traversal/query y producto -> 400
      const badEventCases = [
        { media_tipo: 'POSTING', media_url: '/UPLOADS/events/foo.png' },
        { media_tipo: 'VIDEO', media_url: '/UPLOADS/events/foo.mp4' },
        { media_tipo: 'POSTING', media_url: '/uploads/events/foo.png?v=1' },
        { media_tipo: 'POSTING', media_url: '/uploads/events/../products/foo.png' }
      ];
      for (const tc of badEventCases) {
        const res = await fetch(`${baseUrl}/api/v1/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`
          },
          body: JSON.stringify({
            titulo: 'Evento URL Local Inválida',
            descripcion: 'Prueba de validación estricta del prefijo /uploads/ en eventos.',
            fecha_inicio: startIso,
            fecha_fin: endIso,
            ...tc
          })
        });
        assert.equal(res.status, 400);
      }

      const badProdRes = await fetch(`${baseUrl}/api/v1/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          categoria_id: 1,
          nombre: 'Burger Uppercase Uploads',
          descripcion: 'Producto con ruta /UPLOADS/ en mayúsculas debe rechazarse.',
          costo_unitario: 4,
          precio_venta: 10,
          stock_actual: 5,
          imagen_url: '/UPLOADS/products/foo.png'
        })
      });
      assert.equal(badProdRes.status, 400);

      // (b) POST /api/v1/events con media_tipo: 'NONE' limpia media_url y posting_contenido -> 201 con nulls
      const noneRes = await fetch(`${baseUrl}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          titulo: 'Evento Sin Multimedia Limpio',
          descripcion: 'Evento NONE que descarta media_url y posting_contenido residuales.',
          fecha_inicio: startIso,
          fecha_fin: endIso,
          media_tipo: 'NONE',
          media_url: '/uploads/events/bad.txt',
          posting_contenido: 'stale'
        })
      });
      assert.equal(noneRes.status, 201);
      const noneEv = (await noneRes.json()).data.event;
      assert.equal(noneEv.media_tipo, 'NONE');
      assert.equal(noneEv.media_url, null);
      assert.equal(noneEv.posting_contenido, null);

      // (c) POST multipart con media_tipo: 'NONE' y media_file sigue autodetectando POSTING y preservando posting_contenido
      const autoForm = new FormData();
      autoForm.append('titulo', 'Evento Multipart Autodetectado');
      autoForm.append('descripcion', 'Subida multipart con media_tipo NONE debe autodetectar POSTING.');
      autoForm.append('fecha_inicio', startIso);
      autoForm.append('fecha_fin', endIso);
      autoForm.append('media_tipo', 'NONE');
      autoForm.append('posting_contenido', 'Texto conservado al autodetectar.');
      autoForm.append('media_file', new Blob([PNG_BYTES], { type: 'image/png' }), 'auto.png');

      const autoRes = await fetch(`${baseUrl}/api/v1/events`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: autoForm
      });
      assert.equal(autoRes.status, 201);
      const autoEv = (await autoRes.json()).data.event;
      assert.equal(autoEv.media_tipo, 'POSTING');
      assert.match(autoEv.media_url, /^\/uploads\/events\/evt-\d+-[a-f0-9]+\.png$/);
      assert.equal(autoEv.posting_contenido, 'Texto conservado al autodetectar.');
    });

    it('Regresión M1-I5: multipart CRLF boundary con terminador \\n\\n preserva campos y PNG exacto, y ProductEntity valida rutas locales /uploads/products/', async () => {
      // 1. Mixed CRLF boundary (--b\r\n ... \r\n--b--\r\n) + LF header terminator (\n\n)
      const boundary = '----SazonMixedCrlfLf1234';
      const mixedPart = (headers, valueBuf) =>
        Buffer.concat([
          Buffer.from(`--${boundary}\r\n${headers}\n\n`, 'utf8'),
          Buffer.isBuffer(valueBuf) ? valueBuf : Buffer.from(String(valueBuf), 'utf8'),
          Buffer.from('\r\n', 'utf8')
        ]);

      const mixedMultipart = Buffer.concat([
        mixedPart('Content-Disposition: form-data; name="categoria_id"', '1'),
        mixedPart('Content-Disposition: form-data; name="nombre"', 'Burger Mixed CRLF LF Header'),
        mixedPart(
          'Content-Disposition: form-data; name="descripcion"',
          'Producto con boundary CRLF y terminador de encabezados LF doble.'
        ),
        mixedPart('Content-Disposition: form-data; name="costo_unitario"', '4.0'),
        mixedPart('Content-Disposition: form-data; name="precio_venta"', '10.5'),
        mixedPart(
          'Content-Disposition: form-data; name="imagen"; filename="mixed.png"\nContent-Type: image/png',
          PNG_BYTES
        ),
        Buffer.from(`--${boundary}--\r\n`, 'utf8')
      ]);

      const mixedRes = await fetch(`${baseUrl}/api/v1/products`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: mixedMultipart
      });
      assert.equal(mixedRes.status, 201);
      const { product: mixedProduct } = (await mixedRes.json()).data;
      assert.equal(mixedProduct.nombre, 'Burger Mixed CRLF LF Header');
      assert.match(mixedProduct.imagen_url, /^\/uploads\/products\/prod-\d+-[a-f0-9]+\.png$/);

      const storedMixedFile = path.join(tmpUploadsDir, 'products', path.basename(mixedProduct.imagen_url));
      const storedMixedBytes = await fs.readFile(storedMixedFile);
      assert.equal(storedMixedBytes.length, PNG_BYTES.length);
      assert.equal(Buffer.compare(storedMixedBytes, PNG_BYTES), 0);

      const servedMixed = await fetch(`${baseUrl}${mixedProduct.imagen_url}`);
      assert.equal(servedMixed.status, 200);
      assert.equal(Buffer.compare(Buffer.from(await servedMixed.arrayBuffer()), PNG_BYTES), 0);

      // 2. ProductEntity validación estricta de rutas locales /uploads/products/
      const invalidLocalUrls = [
        '/uploads/products/foo.png?v=1',
        '/uploads/products/../events/foo.png',
        '/uploads/products/.gitkeep',
        '/uploads/products/.hidden.png',
        '/uploads/events/evt-1.mp4',
        '/uploads/products/archivo.txt'
      ];
      for (const [idx, badUrl] of invalidLocalUrls.entries()) {
        const badPostRes = await fetch(`${baseUrl}/api/v1/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`
          },
          body: JSON.stringify({
            categoria_id: 1,
            nombre: `Burger Ruta Invalida ${idx}`,
            descripcion: 'Producto con ruta local /uploads/ inválida que debe fallar 400.',
            costo_unitario: 4.0,
            precio_venta: 10.0,
            stock_actual: 5,
            imagen_url: badUrl
          })
        });
        assert.equal(badPostRes.status, 400);

        const badPutRes = await fetch(`${baseUrl}/api/v1/products/${mixedProduct.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`
          },
          body: JSON.stringify({ imagen_url: badUrl })
        });
        assert.equal(badPutRes.status, 400);
      }
      await fs.access(storedMixedFile);

      // 3. Ruta local válida /uploads/products/prod-test.png aceptada (201)
      const validLocalRes = await fetch(`${baseUrl}/api/v1/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          categoria_id: 1,
          nombre: 'Burger Ruta Local Valida',
          descripcion: 'Producto con ruta local válida bajo /uploads/products/.',
          costo_unitario: 4.0,
          precio_venta: 10.0,
          stock_actual: 5,
          imagen_url: '/uploads/products/prod-test.png'
        })
      });
      assert.equal(validLocalRes.status, 201);
      const validLocalJson = await validLocalRes.json();
      assert.equal(validLocalJson.data.product.imagen_url, '/uploads/products/prod-test.png');
    });
  });
}

registerRuntimeSuite('NativeHTTP', startNativeServer);
registerRuntimeSuite(
  'ExpressApp',
  (customContainer) => startServer(createAppFn(customContainer)),
  () => (!createAppFn ? 'express no instalado en node_modules local' : false)
);
