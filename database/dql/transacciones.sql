-- =============================================================================
-- PROYECTO: SazónYA (sazon-ya-backend)
-- ARCHIVO: database/dql/transacciones.sql
-- DESCRIPCIÓN: Procedimiento transaccional ACID con SELECT ... FOR UPDATE
--              para registrar pedidos descontando stock de productos y condimentos.
-- =============================================================================

USE sazon_ya;

DROP PROCEDURE IF EXISTS sp_registrar_pedido_item_unico;

DELIMITER $$

CREATE PROCEDURE sp_registrar_pedido_item_unico(
  IN p_usuario_id INT UNSIGNED,
  IN p_producto_id INT UNSIGNED,
  IN p_cantidad INT UNSIGNED,
  IN p_notas VARCHAR(255)
)
BEGIN
  DECLARE v_stock_actual INT UNSIGNED;
  DECLARE v_precio DECIMAL(10, 2);
  DECLARE v_costo DECIMAL(10, 2);
  DECLARE v_estado VARCHAR(20);
  DECLARE v_pedido_id INT UNSIGNED;
  DECLARE v_subtotal DECIMAL(10, 2);
  DECLARE v_ganancia DECIMAL(10, 2);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  -- Bloqueo pesimista sobre la fila del producto
  SELECT stock_actual, precio_venta, costo_unitario, estado
    INTO v_stock_actual, v_precio, v_costo, v_estado
  FROM productos
  WHERE id = p_producto_id
  FOR UPDATE;

  IF v_estado = 'INACTIVO' OR v_estado = 'AGOTADO' OR v_stock_actual < p_cantidad THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Stock insuficiente o producto no disponible para completar el pedido.';
  END IF;

  SET v_subtotal = ROUND(v_precio * p_cantidad, 2);
  SET v_ganancia = ROUND((v_precio - v_costo) * p_cantidad, 2);

  INSERT INTO pedidos (usuario_id, estado, total_venta, total_costo, notas_entrega)
  VALUES (p_usuario_id, 'ENTREGADO', v_subtotal, ROUND(v_costo * p_cantidad, 2), p_notas);

  SET v_pedido_id = LAST_INSERT_ID();

  INSERT INTO detalle_pedidos
    (pedido_id, producto_id, cantidad, precio_unitario_snapshot, costo_unitario_snapshot, subtotal_venta, ganancia_neta_linea)
  VALUES
    (v_pedido_id, p_producto_id, p_cantidad, v_precio, v_costo, v_subtotal, v_ganancia);

  -- Descontar stock del producto
  UPDATE productos
  SET stock_actual = stock_actual - p_cantidad
  WHERE id = p_producto_id;

  -- Descontar stock de condimentos obligatorios asociados a la receta del producto
  UPDATE condimentos_insumos ci
  INNER JOIN producto_condimentos pc ON pc.condimento_id = ci.id
  SET ci.stock_actual = GREATEST(0, ci.stock_actual - (pc.cantidad_requerida * p_cantidad))
  WHERE pc.producto_id = p_producto_id AND pc.es_opcional = 0;

  COMMIT;
END$$

DELIMITER ;

-- ===== PRUEBA =====
-- CALL sp_registrar_pedido_item_unico(2, 1, 1, 'Pedido transaccional de prueba');
-- SELECT id, total_venta, total_costo, estado FROM pedidos ORDER BY id DESC LIMIT 1;
