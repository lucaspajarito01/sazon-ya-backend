-- =============================================================================
-- PROYECTO: SazónYA (sazon-ya-backend)
-- ARCHIVO: database/ddl/01_schema.sql
-- DESCRIPCIÓN: Esquema relacional en 3FN para gestión de comida rápida
-- MOTOR: MySQL 8.0+ (InnoDB, utf8mb4)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS sazon_ya
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sazon_ya;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS participaciones_eventos;
DROP TABLE IF EXISTS eventos_promociones;
DROP TABLE IF EXISTS recomendaciones_productos;
DROP TABLE IF EXISTS favoritos;
DROP TABLE IF EXISTS resenas_calificaciones;
DROP TABLE IF EXISTS detalle_pedidos;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS producto_condimentos;
DROP TABLE IF EXISTS condimentos_insumos;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS auditoria_precios_productos;
DROP TABLE IF EXISTS usuarios;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. TABLA: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  edad TINYINT UNSIGNED NOT NULL,
  correo VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_usuarios PRIMARY KEY (id),
  CONSTRAINT uq_usuarios_correo UNIQUE (correo),
  CONSTRAINT chk_usuarios_edad CHECK (edad >= 13 AND edad <= 120),
  CONSTRAINT chk_usuarios_nombre CHECK (CHAR_LENGTH(TRIM(nombre)) >= 2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABLA: categorias
CREATE TABLE IF NOT EXISTS categorias (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(80) NOT NULL,
  descripcion VARCHAR(255) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_categorias PRIMARY KEY (id),
  CONSTRAINT uq_categorias_nombre UNIQUE (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABLA: productos
CREATE TABLE IF NOT EXISTS productos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  categoria_id INT UNSIGNED NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  descripcion TEXT NOT NULL,
  costo_unitario DECIMAL(10, 2) UNSIGNED NOT NULL,
  precio_venta DECIMAL(10, 2) UNSIGNED NOT NULL,
  stock_actual INT UNSIGNED NOT NULL DEFAULT 0,
  stock_minimo INT UNSIGNED NOT NULL DEFAULT 5,
  estado ENUM('DISPONIBLE', 'STOCK_BAJO', 'AGOTADO', 'INACTIVO') NOT NULL DEFAULT 'DISPONIBLE',
  imagen_url VARCHAR(500) NULL DEFAULT NULL,
  promedio_estrellas DECIMAL(3, 2) UNSIGNED NOT NULL DEFAULT 0.00,
  total_resenas INT UNSIGNED NOT NULL DEFAULT 0,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_productos PRIMARY KEY (id),
  CONSTRAINT uq_productos_nombre UNIQUE (nombre),
  CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id)
    REFERENCES categorias (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_productos_margen CHECK (precio_venta > costo_unitario),
  CONSTRAINT chk_productos_estrellas CHECK (promedio_estrellas >= 0.00 AND promedio_estrellas <= 5.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABLA: auditoria_precios_productos
CREATE TABLE IF NOT EXISTS auditoria_precios_productos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  producto_id INT UNSIGNED NOT NULL,
  costo_anterior DECIMAL(10, 2) UNSIGNED NOT NULL,
  costo_nuevo DECIMAL(10, 2) UNSIGNED NOT NULL,
  precio_anterior DECIMAL(10, 2) UNSIGNED NOT NULL,
  precio_nuevo DECIMAL(10, 2) UNSIGNED NOT NULL,
  cambiado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_auditoria_precios PRIMARY KEY (id),
  CONSTRAINT fk_auditoria_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABLA: condimentos_insumos
CREATE TABLE IF NOT EXISTS condimentos_insumos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  tipo ENUM('CONDIMENTO', 'SALSA', 'INGREDIENTE', 'EMPAQUE') NOT NULL DEFAULT 'CONDIMENTO',
  unidad_medida VARCHAR(30) NOT NULL DEFAULT 'porcion',
  stock_actual DECIMAL(10, 2) UNSIGNED NOT NULL DEFAULT 0.00,
  stock_minimo DECIMAL(10, 2) UNSIGNED NOT NULL DEFAULT 10.00,
  estado ENUM('DISPONIBLE', 'STOCK_BAJO', 'AGOTADO', 'INACTIVO') NOT NULL DEFAULT 'DISPONIBLE',
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_condimentos_insumos PRIMARY KEY (id),
  CONSTRAINT uq_condimentos_nombre UNIQUE (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABLA: producto_condimentos (Receta e insumos por producto)
CREATE TABLE IF NOT EXISTS producto_condimentos (
  producto_id INT UNSIGNED NOT NULL,
  condimento_id INT UNSIGNED NOT NULL,
  cantidad_requerida DECIMAL(8, 2) UNSIGNED NOT NULL DEFAULT 1.00,
  es_opcional TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT pk_producto_condimentos PRIMARY KEY (producto_id, condimento_id),
  CONSTRAINT fk_prodcond_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_prodcond_condimento FOREIGN KEY (condimento_id)
    REFERENCES condimentos_insumos (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_prodcond_cantidad CHECK (cantidad_requerida > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABLA: pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  estado ENUM('PENDIENTE', 'EN_PREPARACION', 'ENTREGADO', 'CANCELADO') NOT NULL DEFAULT 'ENTREGADO',
  total_venta DECIMAL(10, 2) UNSIGNED NOT NULL DEFAULT 0.00,
  total_costo DECIMAL(10, 2) UNSIGNED NOT NULL DEFAULT 0.00,
  notas_entrega VARCHAR(255) NULL DEFAULT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_pedidos PRIMARY KEY (id),
  CONSTRAINT fk_pedidos_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TABLA: detalle_pedidos
CREATE TABLE IF NOT EXISTS detalle_pedidos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id INT UNSIGNED NOT NULL,
  producto_id INT UNSIGNED NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  precio_unitario_snapshot DECIMAL(10, 2) UNSIGNED NOT NULL,
  costo_unitario_snapshot DECIMAL(10, 2) UNSIGNED NOT NULL,
  subtotal_venta DECIMAL(10, 2) UNSIGNED NOT NULL,
  ganancia_neta_linea DECIMAL(10, 2) NOT NULL,
  CONSTRAINT pk_detalle_pedidos PRIMARY KEY (id),
  CONSTRAINT fk_detalle_pedido FOREIGN KEY (pedido_id)
    REFERENCES pedidos (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_detalle_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_detalle_cantidad CHECK (cantidad > 0 AND cantidad <= 50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. TABLA: resenas_calificaciones
CREATE TABLE IF NOT EXISTS resenas_calificaciones (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  producto_id INT UNSIGNED NOT NULL,
  estrellas TINYINT UNSIGNED NOT NULL,
  comentario VARCHAR(500) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_resenas PRIMARY KEY (id),
  CONSTRAINT uq_resena_usuario_producto UNIQUE (usuario_id, producto_id),
  CONSTRAINT fk_resenas_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_resenas_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_resenas_estrellas CHECK (estrellas BETWEEN 1 AND 5),
  CONSTRAINT chk_resenas_comentario CHECK (CHAR_LENGTH(TRIM(comentario)) >= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. TABLA: favoritos
CREATE TABLE IF NOT EXISTS favoritos (
  usuario_id INT UNSIGNED NOT NULL,
  producto_id INT UNSIGNED NOT NULL,
  agregado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_favoritos PRIMARY KEY (usuario_id, producto_id),
  CONSTRAINT fk_favoritos_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_favoritos_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. TABLA: recomendaciones_productos
CREATE TABLE IF NOT EXISTS recomendaciones_productos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  nombre_sugerido VARCHAR(120) NOT NULL,
  descripcion_ingredientes VARCHAR(600) NOT NULL,
  estado ENUM('PENDIENTE', 'EN_REVISION', 'APROBADA', 'DESCARTADA') NOT NULL DEFAULT 'PENDIENTE',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_recomendaciones PRIMARY KEY (id),
  CONSTRAINT fk_recomendaciones_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. TABLA: eventos_promociones
CREATE TABLE IF NOT EXISTS eventos_promociones (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  creado_por_admin_id INT UNSIGNED NULL,
  titulo VARCHAR(150) NOT NULL,
  descripcion TEXT NOT NULL,
  tipo ENUM('EVENTO', 'PROMOCION', 'SORTEO') NOT NULL DEFAULT 'PROMOCION',
  porcentaje_descuento DECIMAL(5, 2) UNSIGNED NOT NULL DEFAULT 0.00,
  premio_sorteo VARCHAR(150) NULL DEFAULT NULL,
  cupo_maximo INT UNSIGNED NULL DEFAULT NULL,
  fecha_inicio DATETIME NOT NULL,
  fecha_fin DATETIME NOT NULL,
  estado ENUM('PROGRAMADO', 'ACTIVO', 'FINALIZADO', 'CANCELADO') NOT NULL DEFAULT 'ACTIVO',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_eventos_promociones PRIMARY KEY (id),
  CONSTRAINT fk_eventos_admin FOREIGN KEY (creado_por_admin_id)
    REFERENCES usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_eventos_descuento CHECK (porcentaje_descuento >= 0.00 AND porcentaje_descuento <= 100.00),
  CONSTRAINT chk_eventos_fechas CHECK (fecha_fin > fecha_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. TABLA: participaciones_eventos
CREATE TABLE IF NOT EXISTS participaciones_eventos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  evento_id INT UNSIGNED NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  codigo_boleto VARCHAR(40) NOT NULL,
  es_ganador TINYINT(1) NOT NULL DEFAULT 0,
  inscrito_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_participaciones PRIMARY KEY (id),
  CONSTRAINT uq_participacion_evento_usuario UNIQUE (evento_id, usuario_id),
  CONSTRAINT uq_participacion_boleto UNIQUE (codigo_boleto),
  CONSTRAINT fk_participacion_evento FOREIGN KEY (evento_id)
    REFERENCES eventos_promociones (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_participacion_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
