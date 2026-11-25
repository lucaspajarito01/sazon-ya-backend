import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { BaseEntity } from '../src/entities/BaseEntity.js';
import { BaseRepository } from '../src/repositories/BaseRepository.js';
import { DatabaseAdapter } from '../src/config/db.js';
import { buildContainer } from '../src/container.js';

describe('SazónYA — Pruebas Integrales por Sprint (Arquitectura Limpia & Reglas de Negocio)', () => {
  let testDb;
  let testContainer;

  beforeEach(() => {
    testDb = new DatabaseAdapter();
    testContainer = buildContainer(testDb);
  });

  it('Verifica que BaseEntity y BaseRepository sean clases abstractas no instanciables directamente', () => {
    assert.throws(() => new BaseEntity(1, {}), /clase abstracta/);
    assert.throws(() => new BaseRepository(testDb, 'tabla'), /clase abstracta/);
  });

  it('Sprint 1: Registro con validaciones (nombre, edad, correo, contraseña) y Login con JWT', async () => {
    const { authService } = testContainer.services;

    // 1. Registro exitoso
    const reg = await authService.register({
      nombre: 'Sofía Martínez',
      edad: 24,
      correo: 'sofia@cliente.com',
      password: 'Password2026!'
    });

    assert.equal(reg.user.nombre, 'Sofía Martínez');
    assert.equal(reg.user.rol, 'USER');
    assert.ok(reg.token.split('.').length === 3);

    // 2. Rechazo de correo duplicado (409)
    await assert.rejects(
      () =>
        authService.register({
          nombre: 'Sofía Duplicada',
          edad: 25,
          correo: 'sofia@cliente.com',
          password: 'Password2026!'
        }),
      (err) => err.statusCode === 409
    );

    // 3. Login de Administrador semilla
    const adminLogin = await authService.login({
      correo: 'admin@sazonya.com',
      password: 'Admin123!'
    });
    assert.equal(adminLogin.user.rol, 'ADMIN');
  });

  it('Sprint 2: CRUD de Productos, Estados de Inventario de Condimentos y Auditoría de Precios', async () => {
    const { inventoryService } = testContainer.services;

    // 1. Crear nuevo producto con costo_unitario y precio_venta
    const nuevoProd = await inventoryService.createProduct({
      categoria_id: 1,
      nombre: 'Hamburguesa Volcán Jalapeño',
      descripcion: 'Carne a la parrilla 180g con queso pepper jack, jalapeños asados y salsa chipotle.',
      costo_unitario: 4.2,
      precio_venta: 10.5,
      stock_actual: 4,
      stock_minimo: 5
    });

    // Como stock_actual (4) <= stock_minimo (5), el estado se sincroniza automáticamente a STOCK_BAJO
    assert.equal(nuevoProd.estado, 'STOCK_BAJO');
    assert.equal(nuevoProd.ganancia_unitaria, 6.3);

    // 2. Actualizar precio dispara auditoría de precios y stock 0 cambia estado a AGOTADO
    const editado = await inventoryService.updateProduct(nuevoProd.id, {
      precio_venta: 11.5,
      stock_actual: 0
    });
    assert.equal(editado.estado, 'AGOTADO');
    assert.equal(testDb.state.auditoria_precios_productos.length, 1);

    // 3. Intentar eliminar producto con ventas históricas (#1) aplica borrado lógico (INACTIVO)
    const delHistorico = await inventoryService.deleteProduct(1);
    assert.equal(delHistorico.action, 'DEACTIVATED');
    assert.equal(delHistorico.product.estado, 'INACTIVO');

    // 4. Organización de inventario de condimentos
    const cond = await inventoryService.updateCondiment(2, { stock_actual: 0 });
    assert.equal(cond.estado, 'AGOTADO');
  });

  it('Sprint 3: Pedidos Transaccionales ACID (con Rollback ante falta de stock), Favoritos, Reseñas y Sorteos', async () => {
    const { orderService, communityService, eventService, inventoryService } = testContainer.services;

    const prodAntes = await inventoryService.getProductById(1);
    const stockInicial = prodAntes.stock_actual;

    // 1. Realizar pedido válido descuenta stock de producto y condimentos de receta
    const pedido = await orderService.createOrder({
      usuarioId: 2,
      items: [{ producto_id: 1, cantidad: 2 }],
      notasEntrega: 'Bien dorada la tocineta'
    });

    assert.equal(pedido.total_venta, 19.8);
    assert.equal(pedido.ganancia_neta_pedido, 10.8);

    const prodDespues = await inventoryService.getProductById(1);
    assert.equal(prodDespues.stock_actual, stockInicial - 2);

    // 2. Rollback transaccional ACID: si el segundo ítem falla por stock insuficiente, el primero no se descuenta
    const stockAntesFallo = prodDespues.stock_actual;
    await assert.rejects(
      () =>
        orderService.createOrder({
          usuarioId: 2,
          items: [
            { producto_id: 1, cantidad: 1 },
            { producto_id: 5, cantidad: 2 } // Producto #5 está AGOTADO
          ]
        }),
      (err) => err.statusCode === 409
    );

    const prodTrasRollback = await inventoryService.getProductById(1);
    assert.equal(prodTrasRollback.stock_actual, stockAntesFallo);

    // 3. Calificar con estrellas y asignar reseña recalcula promedio del producto
    const resena = await communityService.submitReview({
      usuarioId: 3,
      productoId: 2,
      estrellas: 5,
      comentario: 'El pollo crujiente con mayonesa chipotle está espectacular.'
    });
    assert.equal(resena.producto_promedio_estrellas, 5);

    // 4. Toggle de favoritos
    const toggle1 = await communityService.toggleFavorite({ usuarioId: 3, productoId: 2 });
    assert.equal(toggle1.isFavorite, true);

    // 5. Recomendar nuevo producto
    const rec = await communityService.submitRecommendation({
      usuarioId: 3,
      nombreSugerido: 'Papas Bravas con Chorizo Artesanal',
      descripcionIngredientes: 'Papas rústicas con chorizo santarrosano al grill, alioli de ajo asado y paprika.'
    });
    assert.equal(rec.estado, 'PENDIENTE');

    // 6. Participar en sorteo activo
    const boleto = await eventService.participateInEvent({ eventoId: 2, usuarioId: 3 });
    assert.ok(boleto.codigo_boleto.startsWith('SZY-EVT2-U3-'));
  });

  it('Sprint 4: Estadísticas de Ventas Semanales (Producto más vendido y Ganancia por producto)', async () => {
    const { analyticsService } = testContainer.services;

    const stats = await analyticsService.getWeeklyDashboard({ days: 7 });
    assert.ok(stats.producto_mas_vendido);
    assert.equal(stats.producto_mas_vendido.producto_id, 1);
    assert.equal(stats.producto_mas_vendido.producto_nombre, 'Sazón Brasa Doble Cheddar');
    assert.equal(stats.producto_mas_vendido.unidades_vendidas, 5);
    assert.equal(stats.producto_mas_vendido.ganancia_neta, 27);
    assert.ok(stats.resumen_global.ganancia_neta_semanal > 0);
  });
});
