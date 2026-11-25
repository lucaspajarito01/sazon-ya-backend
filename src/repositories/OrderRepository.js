import { BaseRepository } from './BaseRepository.js';
import { ProductEntity, PRODUCT_STATES } from '../entities/ProductEntity.js';
import { AppError } from '../utils/AppError.js';

export class OrderRepository extends BaseRepository {
  constructor(db) {
    super(db, 'pedidos');
  }

  async findByUserId(usuarioId, conn = null) {
    const state = this.executor(conn).state;
    const orders = state.pedidos
      .filter((p) => p.usuario_id === Number(usuarioId))
      .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));

    return orders.map((order) => {
      const items = state.detalle_pedidos
        .filter((dp) => dp.pedido_id === order.id)
        .map((dp) => {
          const prod = state.productos.find((pr) => pr.id === dp.producto_id);
          return {
            ...dp,
            producto_nombre: prod ? prod.nombre : 'Producto'
          };
        });
      return { ...order, items };
    });
  }

  async createTransactionalOrder({ usuarioId, items, notasEntrega = null }, conn) {
    const state = this.executor(conn).state;
    let totalVenta = 0;
    let totalCosto = 0;
    const preparedLines = [];

    for (const line of items) {
      const productIndex = state.productos.findIndex((p) => p.id === Number(line.producto_id));
      if (productIndex === -1) {
        throw new AppError(`El producto con ID ${line.producto_id} no existe.`, 404);
      }

      const product = state.productos[productIndex];
      if (product.estado === PRODUCT_STATES.INACTIVO || product.estado === PRODUCT_STATES.AGOTADO) {
        throw new AppError(`El producto "${product.nombre}" no está disponible en este momento.`, 409);
      }

      if (product.stock_actual < line.cantidad) {
        throw new AppError(
          `Stock insuficiente para "${product.nombre}". Disponible: ${product.stock_actual}, solicitado: ${line.cantidad}.`,
          409
        );
      }

      // Verificar y descontar stock de condimentos obligatorios de la receta (SELECT ... FOR UPDATE)
      const recipeLinks = state.producto_condimentos.filter(
        (pc) => pc.producto_id === product.id && !pc.es_opcional
      );

      for (const link of recipeLinks) {
        const condiment = state.condimentos_insumos.find((ci) => ci.id === link.condimento_id);
        const needed = Number((link.cantidad_requerida * line.cantidad).toFixed(2));
        if (condiment && condiment.stock_actual < needed) {
          throw new AppError(
            `Insumo insuficiente (${condiment.nombre}) para preparar "${product.nombre}".`,
            409
          );
        }
      }

      // Descontar producto y sincronizar estado de inventario
      const newStock = product.stock_actual - line.cantidad;
      state.productos[productIndex].stock_actual = newStock;
      state.productos[productIndex].estado = ProductEntity.resolveInventoryState(
        newStock,
        product.stock_minimo,
        product.estado
      );

      // Descontar condimentos y sincronizar su estado
      for (const link of recipeLinks) {
        const condIdx = state.condimentos_insumos.findIndex((ci) => ci.id === link.condimento_id);
        if (condIdx !== -1) {
          const cond = state.condimentos_insumos[condIdx];
          const remaining = Math.max(0, Number((cond.stock_actual - link.cantidad_requerida * line.cantidad).toFixed(2)));
          cond.stock_actual = remaining;
          cond.estado =
            remaining <= 0
              ? PRODUCT_STATES.AGOTADO
              : remaining <= cond.stock_minimo
                ? PRODUCT_STATES.STOCK_BAJO
                : PRODUCT_STATES.DISPONIBLE;
        }
      }

      const subtotalVenta = Number((product.precio_venta * line.cantidad).toFixed(2));
      const subtotalCosto = Number((product.costo_unitario * line.cantidad).toFixed(2));
      const gananciaNetaLinea = Number((subtotalVenta - subtotalCosto).toFixed(2));

      totalVenta = Number((totalVenta + subtotalVenta).toFixed(2));
      totalCosto = Number((totalCosto + subtotalCosto).toFixed(2));

      preparedLines.push({
        producto_id: product.id,
        producto_nombre: product.nombre,
        cantidad: line.cantidad,
        precio_unitario_snapshot: product.precio_venta,
        costo_unitario_snapshot: product.costo_unitario,
        subtotal_venta: subtotalVenta,
        ganancia_neta_linea: gananciaNetaLinea
      });
    }

    const nextOrderId = state.pedidos.length > 0 ? Math.max(...state.pedidos.map((o) => o.id)) + 1 : 1;
    const orderRecord = {
      id: nextOrderId,
      usuario_id: Number(usuarioId),
      estado: 'ENTREGADO',
      total_venta: totalVenta,
      total_costo: totalCosto,
      notas_entrega: notasEntrega ? String(notasEntrega).trim() : null,
      creado_en: new Date().toISOString()
    };

    state.pedidos.push(orderRecord);

    let nextDetailId =
      state.detalle_pedidos.length > 0 ? Math.max(...state.detalle_pedidos.map((d) => d.id)) + 1 : 1;

    const insertedDetails = preparedLines.map((line) => {
      const detailRecord = {
        id: nextDetailId++,
        pedido_id: nextOrderId,
        producto_id: line.producto_id,
        cantidad: line.cantidad,
        precio_unitario_snapshot: line.precio_unitario_snapshot,
        costo_unitario_snapshot: line.costo_unitario_snapshot,
        subtotal_venta: line.subtotal_venta,
        ganancia_neta_linea: line.ganancia_neta_linea
      };
      state.detalle_pedidos.push(detailRecord);
      return {
        ...detailRecord,
        producto_nombre: line.producto_nombre
      };
    });

    return {
      ...orderRecord,
      ganancia_neta_pedido: Number((totalVenta - totalCosto).toFixed(2)),
      items: insertedDetails
    };
  }
}
