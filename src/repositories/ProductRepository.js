import { BaseRepository } from './BaseRepository.js';
import { ProductEntity, PRODUCT_STATES } from '../entities/ProductEntity.js';
import { AppError } from '../utils/AppError.js';

export class ProductRepository extends BaseRepository {
  constructor(db) {
    super(db, 'productos');
  }

  async findAll({ includeInactive = false, categoriaId = null, estado = null } = {}, conn = null) {
    const state = this.executor(conn).state;
    let items = [...state.productos];

    if (!includeInactive) {
      items = items.filter((p) => p.estado !== PRODUCT_STATES.INACTIVO);
    }
    if (categoriaId) {
      items = items.filter((p) => p.categoria_id === Number(categoriaId));
    }
    if (estado) {
      items = items.filter((p) => p.estado === estado);
    }

    return items.map((p) => {
      const cat = state.categorias.find((c) => c.id === p.categoria_id);
      const receta = state.producto_condimentos
        .filter((pc) => pc.producto_id === p.id)
        .map((pc) => {
          const cond = state.condimentos_insumos.find((ci) => ci.id === pc.condimento_id);
          return {
            condimento_id: pc.condimento_id,
            nombre: cond ? cond.nombre : 'Insumo',
            cantidad_requerida: pc.cantidad_requerida,
            estado: cond ? cond.estado : 'DISPONIBLE'
          };
        });
      return {
        ...p,
        categoria_nombre: cat ? cat.nombre : 'General',
        ganancia_unitaria: Number((p.precio_venta - p.costo_unitario).toFixed(2)),
        condimentos_receta: receta
      };
    });
  }

  async findById(id, conn = null) {
    const state = this.executor(conn).state;
    const item = state.productos.find((p) => p.id === Number(id));
    if (!item) return null;
    const cat = state.categorias.find((c) => c.id === item.categoria_id);
    return {
      ...item,
      categoria_nombre: cat ? cat.nombre : 'General',
      ganancia_unitaria: Number((item.precio_venta - item.costo_unitario).toFixed(2))
    };
  }

  async findByIdForUpdate(id, conn = null) {
    // Bloqueo pesimista dentro de transacción ACID
    const store = this.executor(conn).state.productos;
    return store.find((p) => p.id === Number(id)) || null;
  }

  async listCategories(conn = null) {
    return [...this.executor(conn).state.categorias];
  }

  async create(productEntity, conn = null) {
    const store = this.executor(conn).state.productos;
    const data = productEntity.getData();
    const duplicate = store.some((p) => p.nombre.toLowerCase() === data.nombre.toLowerCase());
    if (duplicate) {
      throw new AppError('Ya existe un producto registrado con ese nombre.', 409, [
        { field: 'nombre', message: 'El nombre del producto ya existe.' }
      ]);
    }

    const nextId = store.length > 0 ? Math.max(...store.map((p) => p.id)) + 1 : 1;
    const record = { ...data, id: nextId };
    store.push(record);
    productEntity.id = nextId;
    return this.findById(nextId, conn);
  }

  async update(id, changes, conn = null) {
    const state = this.executor(conn).state;
    const index = state.productos.findIndex((p) => p.id === Number(id));
    if (index === -1) {
      throw new AppError('Producto no encontrado.', 404);
    }

    const current = state.productos[index];
    if (
      changes.nombre &&
      state.productos.some((p) => p.id !== Number(id) && p.nombre.toLowerCase() === changes.nombre.toLowerCase())
    ) {
      throw new AppError('Ya existe otro producto con ese nombre.', 409, [
        { field: 'nombre', message: 'Nombre de producto duplicado.' }
      ]);
    }

    const merged = {
      ...current,
      ...changes
    };
    const entity = new ProductEntity(merged);
    const updatedData = entity.getData();

    // Auditoría de cambio de precios (igual que el trigger SQL trg_productos_auditoria_precios_after_update)
    if (current.precio_venta !== updatedData.precio_venta || current.costo_unitario !== updatedData.costo_unitario) {
      state.auditoria_precios_productos.push({
        id: state.auditoria_precios_productos.length + 1,
        producto_id: Number(id),
        costo_anterior: current.costo_unitario,
        costo_nuevo: updatedData.costo_unitario,
        precio_anterior: current.precio_venta,
        precio_nuevo: updatedData.precio_venta,
        cambiado_en: new Date().toISOString()
      });
    }

    state.productos[index] = updatedData;
    return this.findById(id, conn);
  }

  async deleteOrDeactivate(id, conn = null) {
    const state = this.executor(conn).state;
    const index = state.productos.findIndex((p) => p.id === Number(id));
    if (index === -1) {
      throw new AppError('Producto no encontrado.', 404);
    }

    const hasHistoricalSales = state.detalle_pedidos.some((dp) => dp.producto_id === Number(id));
    if (hasHistoricalSales) {
      // ON DELETE RESTRICT / Borrado lógico para preservar integridad de estadísticas semanales
      state.productos[index].estado = PRODUCT_STATES.INACTIVO;
      return {
        action: 'DEACTIVATED',
        message: 'El producto tiene ventas históricas registradas; se cambió su estado a INACTIVO para preservar las estadísticas semanales.',
        product: state.productos[index]
      };
    }

    const [removed] = state.productos.splice(index, 1);
    return {
      action: 'DELETED',
      message: 'Producto eliminado físicamente del catálogo.',
      product: removed
    };
  }
}
