-- =============================================================================
-- PROYECTO: SazónYA (sazon-ya-backend)
-- ARCHIVO: database/dml/01_seed_inicial.sql
-- DESCRIPCIÓN: Datos iniciales idempotentes (Admin, Clientes, Productos,
--              Condimentos, Eventos, Reseñas y Ventas Semanales)
-- =============================================================================

USE sazon_ya;

-- 1. Usuarios iniciales (Password hash PBKDF2/SHA-512 determinista para demo/seed)
INSERT IGNORE INTO usuarios (id, nombre, edad, correo, password_hash, rol, activo)
VALUES
  (1, 'Lucas Administrador SazónYA', 25, 'admin@sazonya.com', 'pbkdf2$100000$sazon_ya_salt_admin$e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'ADMIN', 1),
  (2, 'Camila Rodríguez', 22, 'camila@cliente.com', 'pbkdf2$100000$sazon_ya_salt_user1$e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'USER', 1),
  (3, 'Mateo Hernández', 29, 'mateo@cliente.com', 'pbkdf2$100000$sazon_ya_salt_user2$e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'USER', 1);

-- 2. Categorías gastronómicas
INSERT IGNORE INTO categorias (id, nombre, descripcion)
VALUES
  (1, 'Hamburguesas Artesanales', 'Hamburguesas a la parrilla con carne 100% res seleccionada y pan brioche artesanal.'),
  (2, 'Papas Fritas & Acompañamientos', 'Papas rústicas, criollas y bastón con toppings fundidos.'),
  (3, 'Combos & Especiales', 'Combos completos con hamburguesa, papas fritas y bebida artesanal.'),
  (4, 'Bebidas & Malteadas', 'Limonadas frappé, gaseosas y malteadas cremosas.');

-- 3. Productos del menú (con costo_unitario y precio_venta para cálculo exacto de ganancia)
INSERT IGNORE INTO productos
  (id, categoria_id, nombre, descripcion, costo_unitario, precio_venta, stock_actual, stock_minimo, estado, imagen_url, promedio_estrellas, total_resenas)
VALUES
  (1, 1, 'Sazón Brasa Doble Cheddar', 'Doble carne smash 150g, cuádruple queso cheddar madurado, tocineta ahumada, cebolla caramelizada y salsa secreta SazónYA en pan brioche dorado.', 4.50, 9.90, 42, 10, 'DISPONIBLE', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', 4.90, 2),
  (2, 1, 'Crispy Pollo Chipotle', 'Pechuga de pollo crujiente empanizada en especias cajún, ensalada coleslaw fresca, pepinillos y mayonesa chipotle.', 3.80, 8.50, 28, 8, 'DISPONIBLE', 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=800&q=80', 4.75, 1),
  (3, 2, 'Papas Supremas Bacon & Cheddar', 'Porción grande de papas fritas corte rústico bañadas en salsa de queso cheddar fundido, lluvia de tocineta crocante y cebollín.', 2.10, 5.90, 8, 10, 'STOCK_BAJO', 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=800&q=80', 4.80, 1),
  (4, 3, 'Combo Parrillero Imperial', 'Incluye 1 Sazón Brasa Doble Cheddar + 1 Papas Fritas Clásicas + 1 Limonada Cerezada 16oz.', 5.90, 13.50, 35, 8, 'DISPONIBLE', 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=80', 5.00, 1),
  (5, 1, 'Veggie Portobello Grill', 'Hongo portobello marinado al grill, queso provolone, aguacate hass, tomate confitado y alioli de ajo.', 4.00, 8.90, 0, 5, 'AGOTADO', 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=800&q=80', 4.50, 1),
  (6, 4, 'Malteada Oreo Crunch', 'Malteada artesanal de helado de vainilla bourbon con trozos de galleta Oreo y crema chantilly.', 1.95, 4.90, 30, 6, 'DISPONIBLE', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80', 4.85, 1);

-- 4. Organización de inventario de condimentos e insumos
INSERT IGNORE INTO condimentos_insumos
  (id, nombre, tipo, unidad_medida, stock_actual, stock_minimo, estado)
VALUES
  (1, 'Salsa Secreta SazónYA', 'SALSA', 'porcion', 120.00, 25.00, 'DISPONIBLE'),
  (2, 'Queso Cheddar Fundido', 'CONDIMENTO', 'porcion', 18.00, 20.00, 'STOCK_BAJO'),
  (3, 'Mayonesa Chipotle Ahumada', 'SALSA', 'porcion', 85.00, 15.00, 'DISPONIBLE'),
  (4, 'Tocineta Crocante Ahumada', 'INGREDIENTE', 'porcion', 64.00, 15.00, 'DISPONIBLE'),
  (5, 'Pepinillos Encurtidos', 'CONDIMENTO', 'porcion', 0.00, 10.00, 'AGOTADO'),
  (6, 'Pan Brioche Artesanal', 'INGREDIENTE', 'unidad', 95.00, 20.00, 'DISPONIBLE');

-- 5. Relación Producto <-> Condimentos
INSERT IGNORE INTO producto_condimentos (producto_id, condimento_id, cantidad_requerida, es_opcional)
VALUES
  (1, 1, 1.00, 0),
  (1, 2, 2.00, 0),
  (1, 4, 1.00, 0),
  (1, 6, 1.00, 0),
  (2, 3, 1.00, 0),
  (3, 2, 1.00, 0),
  (3, 4, 1.00, 0),
  (4, 1, 1.00, 0);

-- 6. Eventos, Promociones y Sorteos creados por el Administrador
INSERT IGNORE INTO eventos_promociones
  (id, creado_por_admin_id, titulo, descripcion, tipo, porcentaje_descuento, premio_sorteo, cupo_maximo, fecha_inicio, fecha_fin, estado)
VALUES
  (1, 1, 'Festival de la Hamburguesa Brasa 2x1', 'Disfruta de nuestras hamburguesas artesanales seleccionadas con 25% de descuento directo durante toda la semana del festival.', 'PROMOCION', 25.00, NULL, NULL, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 14 DAY), 'ACTIVO'),
  (2, 1, 'Gran Sorteo: 1 Mes de Burgers Gratis', 'Participa con tu cuenta activa de SazónYA en el sorteo mensual de 4 Combos Parrillero Imperial totalmente gratis.', 'SORTEO', 0.00, 'Bono de 4 Combos Parrillero Imperial', 100, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_ADD(NOW(), INTERVAL 20 DAY), 'ACTIVO'),
  (3, 1, 'Noche de Música & Grill en Vivo', 'Evento presencial en nuestra sede principal con degustación de nuevas salsas picantes y DJ invitado.', 'EVENTO', 10.00, 'Pase VIP + Degustación de Salsas', 50, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 10 DAY), 'ACTIVO');

-- 7. Pedidos históricos de la semana actual (para Estadísticas Semanales)
INSERT IGNORE INTO pedidos (id, usuario_id, estado, total_venta, total_costo, notas_entrega, creado_en)
VALUES
  (1, 2, 'ENTREGADO', 25.70, 11.10, 'Sin cebolla en una hamburguesa, por favor.', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (2, 3, 'ENTREGADO', 33.30, 14.90, 'Entregar en portería principal.', DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (3, 2, 'ENTREGADO', 28.30, 12.35, 'Extra servilletas y salsa chipotle.', NOW());

INSERT IGNORE INTO detalle_pedidos
  (id, pedido_id, producto_id, cantidad, precio_unitario_snapshot, costo_unitario_snapshot, subtotal_venta, ganancia_neta_linea)
VALUES
  (1, 1, 1, 2, 9.90, 4.50, 19.80, 10.80),
  (2, 1, 3, 1, 5.90, 2.10, 5.90, 3.80),
  (3, 2, 1, 2, 9.90, 4.50, 19.80, 10.80),
  (4, 2, 4, 1, 13.50, 5.90, 13.50, 7.60),
  (5, 3, 1, 1, 9.90, 4.50, 9.90, 5.40),
  (6, 3, 2, 1, 8.50, 3.80, 8.50, 4.70),
  (7, 3, 6, 1, 4.90, 1.95, 4.90, 2.95);

-- 8. Reseñas, Favoritos, Recomendaciones y Participaciones iniciales
INSERT IGNORE INTO resenas_calificaciones (id, usuario_id, producto_id, estrellas, comentario)
VALUES
  (1, 2, 1, 5, 'La mejor hamburguesa doble cheddar que he probado, el pan brioche llega súper suave y caliente.'),
  (2, 3, 1, 5, 'La salsa secreta y la tocineta ahumada hacen una diferencia brutal. 100% recomendada.'),
  (3, 2, 3, 5, 'Las papas supremas traen muchísimo queso cheddar real y tocineta crocante.');

INSERT IGNORE INTO favoritos (usuario_id, producto_id)
VALUES
  (2, 1),
  (2, 3),
  (3, 4);

INSERT IGNORE INTO recomendaciones_productos (id, usuario_id, nombre_sugerido, descripcion_ingredientes, estado)
VALUES
  (1, 2, 'Burger Hawaiana Picante', 'Carne de res 150g con piña asada al carbón, jalapeños caramelizados, queso mozzarella y salsa teriyaki.', 'PENDIENTE');

INSERT IGNORE INTO participaciones_eventos (id, evento_id, usuario_id, codigo_boleto, es_ganador)
VALUES
  (1, 2, 2, 'SZY-EVT2-U2-2026', 0);
