-- =============================================================================
-- PROYECTO: SazónYA (sazon-ya-backend)
-- ARCHIVO: database/ddl/02_indices.sql
-- DESCRIPCIÓN: Índices B-Tree y FULLTEXT para rendimiento de reportes y catálogo
-- =============================================================================

USE sazon_ya;

-- Índices para filtros frecuentes de catálogo e inventario
CREATE INDEX idx_productos_estado_categoria ON productos (estado, categoria_id);
CREATE INDEX idx_condimentos_estado_tipo ON condimentos_insumos (estado, tipo);

-- Índices para reportes y estadísticas semanales de ventas
CREATE INDEX idx_pedidos_fecha_estado ON pedidos (creado_en DESC, estado);
CREATE INDEX idx_detalle_producto_pedido ON detalle_pedidos (producto_id, pedido_id);

-- Índices para reseñas, recomendaciones y sorteos
CREATE INDEX idx_resenas_producto_fecha ON resenas_calificaciones (producto_id, creado_en DESC);
CREATE INDEX idx_recomendaciones_usuario_estado ON recomendaciones_productos (usuario_id, estado);
CREATE INDEX idx_eventos_estado_fechas ON eventos_promociones (estado, fecha_inicio, fecha_fin);
