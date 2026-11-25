-- =============================================================================
-- PROYECTO: SazónYA (sazon-ya-backend)
-- ARCHIVO: database/dql/trigger.sql
-- DESCRIPCIÓN: Triggers de invariantes de inventario, auditoría de precios,
--              recálculo de promedio de estrellas y control de cupo en sorteos.
-- =============================================================================

USE sazon_ya;

DROP TRIGGER IF EXISTS trg_productos_sincronizar_estado_before_update;
DROP TRIGGER IF EXISTS trg_productos_auditoria_precios_after_update;
DROP TRIGGER IF EXISTS trg_condimentos_sincronizar_estado_before_update;
DROP TRIGGER IF EXISTS trg_resenas_recalcular_promedio_after_insert;
DROP TRIGGER IF EXISTS trg_resenas_recalcular_promedio_after_update;
DROP TRIGGER IF EXISTS trg_participaciones_validar_cupo_before_insert;

DELIMITER $$

-- 1. Trigger: Sincroniza automáticamente el estado de inventario del producto
CREATE TRIGGER trg_productos_sincronizar_estado_before_update
BEFORE UPDATE ON productos
FOR EACH ROW
BEGIN
  IF NEW.estado <> 'INACTIVO' THEN
    IF NEW.stock_actual = 0 THEN
      SET NEW.estado = 'AGOTADO';
    ELSEIF NEW.stock_actual <= NEW.stock_minimo THEN
      SET NEW.estado = 'STOCK_BAJO';
    ELSE
      SET NEW.estado = 'DISPONIBLE';
    END IF;
  END IF;
END$$

-- 2. Trigger: Registra auditoría cuando cambia el costo o precio de venta
CREATE TRIGGER trg_productos_auditoria_precios_after_update
AFTER UPDATE ON productos
FOR EACH ROW
BEGIN
  IF OLD.precio_venta <> NEW.precio_venta OR OLD.costo_unitario <> NEW.costo_unitario THEN
    INSERT INTO auditoria_precios_productos
      (producto_id, costo_anterior, costo_nuevo, precio_anterior, precio_nuevo)
    VALUES
      (NEW.id, OLD.costo_unitario, NEW.costo_unitario, OLD.precio_venta, NEW.precio_venta);
  END IF;
END$$

-- 3. Trigger: Sincroniza automáticamente el estado de inventario de condimentos
CREATE TRIGGER trg_condimentos_sincronizar_estado_before_update
BEFORE UPDATE ON condimentos_insumos
FOR EACH ROW
BEGIN
  IF NEW.estado <> 'INACTIVO' THEN
    IF NEW.stock_actual = 0 THEN
      SET NEW.estado = 'AGOTADO';
    ELSEIF NEW.stock_actual <= NEW.stock_minimo THEN
      SET NEW.estado = 'STOCK_BAJO';
    ELSE
      SET NEW.estado = 'DISPONIBLE';
    END IF;
  END IF;
END$$

-- 4. Trigger: Recalcula promedio de estrellas del producto al insertar reseña
CREATE TRIGGER trg_resenas_recalcular_promedio_after_insert
AFTER INSERT ON resenas_calificaciones
FOR EACH ROW
BEGIN
  UPDATE productos
  SET
    promedio_estrellas = (
      SELECT ROUND(IFNULL(AVG(estrellas), 0), 2)
      FROM resenas_calificaciones
      WHERE producto_id = NEW.producto_id
    ),
    total_resenas = (
      SELECT COUNT(*)
      FROM resenas_calificaciones
      WHERE producto_id = NEW.producto_id
    )
  WHERE id = NEW.producto_id;
END$$

-- 5. Trigger: Recalcula promedio de estrellas del producto al actualizar reseña
CREATE TRIGGER trg_resenas_recalcular_promedio_after_update
AFTER UPDATE ON resenas_calificaciones
FOR EACH ROW
BEGIN
  UPDATE productos
  SET
    promedio_estrellas = (
      SELECT ROUND(IFNULL(AVG(estrellas), 0), 2)
      FROM resenas_calificaciones
      WHERE producto_id = NEW.producto_id
    ),
    total_resenas = (
      SELECT COUNT(*)
      FROM resenas_calificaciones
      WHERE producto_id = NEW.producto_id
    )
  WHERE id = NEW.producto_id;
END$$

-- 6. Trigger: Controla cupo máximo en eventos y sorteos con SIGNAL SQLSTATE '45000'
CREATE TRIGGER trg_participaciones_validar_cupo_before_insert
BEFORE INSERT ON participaciones_eventos
FOR EACH ROW
BEGIN
  DECLARE v_cupo_maximo INT UNSIGNED;
  DECLARE v_estado VARCHAR(20);
  DECLARE v_inscritos INT UNSIGNED;

  SELECT cupo_maximo, estado
    INTO v_cupo_maximo, v_estado
  FROM eventos_promociones
  WHERE id = NEW.evento_id;

  IF v_estado <> 'ACTIVO' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El evento o sorteo no se encuentra ACTIVO para inscripciones.';
  END IF;

  IF v_cupo_maximo IS NOT NULL THEN
    SELECT COUNT(*) INTO v_inscritos
    FROM participaciones_eventos
    WHERE evento_id = NEW.evento_id;

    IF v_inscritos >= v_cupo_maximo THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Se alcanzó el cupo máximo disponible para este sorteo/evento.';
    END IF;
  END IF;
END$$

DELIMITER ;

-- ===== PRUEBA =====
-- 1. Probar actualización de stock de un producto para disparar cambio de estado:
-- UPDATE productos SET stock_actual = 3 WHERE id = 1;
-- SELECT id, nombre, stock_actual, stock_minimo, estado FROM productos WHERE id = 1;
-- 2. Probar auditoría de precios:
-- UPDATE productos SET precio_venta = 10.50 WHERE id = 1;
-- SELECT * FROM auditoria_precios_productos WHERE producto_id = 1;
