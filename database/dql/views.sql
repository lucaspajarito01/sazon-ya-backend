-- =============================================================================
-- PROYECTO: SazónYA (sazon-ya-backend)
-- ARCHIVO: database/dql/views.sql
-- DESCRIPCIÓN: Vistas analíticas para Estadísticas de Ventas Semanales
--              (Producto más vendido, ganancias por producto e inventario)
-- =============================================================================

USE sazon_ya;

-- 1. Vista de Estadísticas de Ventas Semanales por Producto
CREATE OR REPLACE VIEW vw_estadisticas_ventas_semanales AS
SELECT
  YEARWEEK(p.creado_en, 1) AS anio_semana,
  DATE(DATE_SUB(p.creado_en, INTERVAL WEEKDAY(p.creado_en) DAY)) AS inicio_semana,
  DATE(DATE_ADD(DATE_SUB(p.creado_en, INTERVAL WEEKDAY(p.creado_en) DAY), INTERVAL 6 DAY)) AS fin_semana,
  pr.id AS producto_id,
  pr.nombre AS producto_nombre,
  c.nombre AS categoria_nombre,
  SUM(dp.cantidad) AS unidades_vendidas,
  ROUND(SUM(dp.subtotal_venta), 2) AS ingresos_totales,
  ROUND(SUM(dp.costo_unitario_snapshot * dp.cantidad), 2) AS costo_total,
  ROUND(SUM(dp.ganancia_neta_linea), 2) AS ganancia_neta,
  ROUND(
    (SUM(dp.ganancia_neta_linea) / NULLIF(SUM(dp.subtotal_venta), 0)) * 100,
    2
  ) AS margen_porcentaje
FROM pedidos p
INNER JOIN detalle_pedidos dp ON dp.pedido_id = p.id
INNER JOIN productos pr ON pr.id = dp.producto_id
INNER JOIN categorias c ON c.id = pr.categoria_id
WHERE p.estado = 'ENTREGADO'
GROUP BY
  YEARWEEK(p.creado_en, 1),
  DATE(DATE_SUB(p.creado_en, INTERVAL WEEKDAY(p.creado_en) DAY)),
  DATE(DATE_ADD(DATE_SUB(p.creado_en, INTERVAL WEEKDAY(p.creado_en) DAY), INTERVAL 6 DAY)),
  pr.id,
  pr.nombre,
  c.nombre;

-- 2. Vista de Estado Consolidado de Inventario (Productos y Condimentos)
CREATE OR REPLACE VIEW vw_alertas_inventario AS
SELECT
  'PRODUCTO' AS tipo_item,
  id AS item_id,
  nombre,
  stock_actual,
  stock_minimo,
  estado
FROM productos
WHERE estado IN ('STOCK_BAJO', 'AGOTADO')
UNION ALL
SELECT
  'CONDIMENTO' AS tipo_item,
  id AS item_id,
  nombre,
  stock_actual,
  stock_minimo,
  estado
FROM condimentos_insumos
WHERE estado IN ('STOCK_BAJO', 'AGOTADO');

-- ===== PRUEBA =====
-- Consultar el producto más vendido y la ganancia por producto en la semana actual:
-- SELECT * FROM vw_estadisticas_ventas_semanales ORDER BY anio_semana DESC, unidades_vendidas DESC, ganancia_neta DESC;
-- Consultar alertas de inventario:
-- SELECT * FROM vw_alertas_inventario;
