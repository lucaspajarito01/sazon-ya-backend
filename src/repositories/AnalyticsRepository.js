import { BaseRepository } from './BaseRepository.js';

export class AnalyticsRepository extends BaseRepository {
  constructor(db) {
    super(db, 'pedidos');
  }

  async getWeeklySalesAnalytics({ days = 7 } = {}, conn = null) {
    const state = this.executor(conn).state;
    const parsedDays = Number(days);
    const truncDays = Number.isFinite(parsedDays) ? Math.trunc(parsedDays) : 0;
    const windowDays = truncDays >= 1 ? Math.min(truncDays, 90) : 7;
    const now = new Date();
    const cutoff = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (windowDays - 1));

    const validOrders = state.pedidos.filter((p) => {
      if (p.estado !== 'ENTREGADO') return false;
      const createdAtMs = new Date(p.creado_en).getTime();
      return Number.isFinite(createdAtMs) && createdAtMs >= cutoff;
    });
    const validOrderIds = new Set(validOrders.map((o) => o.id));

    const dailyMap = new Map();
    for (let i = windowDays - 1; i >= 0; i -= 1) {
      const bucketMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i);
      const fecha = new Date(bucketMs).toISOString().slice(0, 10);
      dailyMap.set(fecha, {
        fecha,
        pedidos: 0,
        unidades: 0,
        ingresos: 0,
        ganancia_neta: 0
      });
    }

    const orderDateById = new Map();
    for (const order of validOrders) {
      const fecha = new Date(order.creado_en).toISOString().slice(0, 10);
      orderDateById.set(order.id, fecha);
      if (!dailyMap.has(fecha)) {
        dailyMap.set(fecha, {
          fecha,
          pedidos: 0,
          unidades: 0,
          ingresos: 0,
          ganancia_neta: 0
        });
      }
      dailyMap.get(fecha).pedidos += 1;
    }

    const productStatsMap = new Map();

    for (const prod of state.productos) {
      const cat = state.categorias.find((c) => c.id === prod.categoria_id);
      productStatsMap.set(prod.id, {
        producto_id: prod.id,
        producto_nombre: prod.nombre,
        categoria_nombre: cat ? cat.nombre : 'General',
        precio_actual: prod.precio_venta,
        costo_actual: prod.costo_unitario,
        unidades_vendidas: 0,
        ingresos_totales: 0,
        costo_total: 0,
        ganancia_neta: 0
      });
    }

    for (const detail of state.detalle_pedidos) {
      if (!validOrderIds.has(detail.pedido_id)) continue;
      if (!productStatsMap.has(detail.producto_id)) continue;

      const entry = productStatsMap.get(detail.producto_id);
      const lineCost = Number((detail.costo_unitario_snapshot * detail.cantidad).toFixed(2));
      entry.unidades_vendidas += detail.cantidad;
      entry.ingresos_totales = Number((entry.ingresos_totales + detail.subtotal_venta).toFixed(2));
      entry.costo_total = Number((entry.costo_total + lineCost).toFixed(2));
      entry.ganancia_neta = Number((entry.ganancia_neta + detail.ganancia_neta_linea).toFixed(2));

      const fecha = orderDateById.get(detail.pedido_id);
      const dayEntry = dailyMap.get(fecha);
      if (dayEntry) {
        dayEntry.unidades += detail.cantidad;
        dayEntry.ingresos = Number((dayEntry.ingresos + detail.subtotal_venta).toFixed(2));
        dayEntry.ganancia_neta = Number((dayEntry.ganancia_neta + detail.ganancia_neta_linea).toFixed(2));
      }
    }

    const productosRanking = Array.from(productStatsMap.values())
      .map((item) => ({
        ...item,
        margen_porcentaje:
          item.ingresos_totales > 0
            ? Number(((item.ganancia_neta / item.ingresos_totales) * 100).toFixed(2))
            : 0
      }))
      .sort((a, b) => b.unidades_vendidas - a.unidades_vendidas || b.ganancia_neta - a.ganancia_neta);

    const productoMasVendido =
      productosRanking.length > 0 && productosRanking[0].unidades_vendidas > 0 ? productosRanking[0] : null;

    const productoMayorGanancia =
      productosRanking
        .slice()
        .sort((a, b) => b.ganancia_neta - a.ganancia_neta)[0] || null;

    const resumenGlobal = productosRanking.reduce(
      (acc, item) => {
        acc.total_unidades_vendidas += item.unidades_vendidas;
        acc.ingresos_semanales = Number((acc.ingresos_semanales + item.ingresos_totales).toFixed(2));
        acc.costos_semanales = Number((acc.costos_semanales + item.costo_total).toFixed(2));
        acc.ganancia_neta_semanal = Number((acc.ganancia_neta_semanal + item.ganancia_neta).toFixed(2));
        return acc;
      },
      {
        total_pedidos_entregados: validOrders.length,
        total_unidades_vendidas: 0,
        ingresos_semanales: 0,
        costos_semanales: 0,
        ganancia_neta_semanal: 0
      }
    );

    const alertasInventario = [
      ...state.productos
        .filter((p) => p.estado === 'STOCK_BAJO' || p.estado === 'AGOTADO')
        .map((p) => ({
          tipo_item: 'PRODUCTO',
          id: p.id,
          nombre: p.nombre,
          stock_actual: p.stock_actual,
          stock_minimo: p.stock_minimo,
          estado: p.estado
        })),
      ...state.condimentos_insumos
        .filter((c) => c.estado === 'STOCK_BAJO' || c.estado === 'AGOTADO')
        .map((c) => ({
          tipo_item: 'CONDIMENTO',
          id: c.id,
          nombre: c.nombre,
          stock_actual: c.stock_actual,
          stock_minimo: c.stock_minimo,
          estado: c.estado
        }))
    ];

    const serieDiaria = Array.from(dailyMap.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));

    return {
      periodo_dias: windowDays,
      resumen_global: resumenGlobal,
      producto_mas_vendido: productoMasVendido,
      producto_mayor_ganancia: productoMayorGanancia,
      ganancias_por_producto: productosRanking,
      alertas_inventario: alertasInventario,
      serie_diaria: serieDiaria
    };
  }
}
