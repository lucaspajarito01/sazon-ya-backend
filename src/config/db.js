import { hashPassword } from '../utils/cryptoAuth.js';

export function createSeedState() {
  const now = new Date();
  const daysAgo = (d) => new Date(now.getTime() - d * 86400000).toISOString();
  const daysAhead = (d) => new Date(now.getTime() + d * 86400000).toISOString();

  return {
    usuarios: [
      {
        id: 1,
        nombre: 'Lucas Administrador SazónYA',
        edad: 25,
        correo: 'admin@sazonya.com',
        password_hash: hashPassword('Admin123!', 'sazon_ya_salt_admin'),
        rol: 'ADMIN',
        activo: 1,
        creado_en: daysAgo(15)
      },
      {
        id: 2,
        nombre: 'Camila Rodríguez',
        edad: 22,
        correo: 'camila@cliente.com',
        password_hash: hashPassword('Cliente123!', 'sazon_ya_salt_user1'),
        rol: 'USER',
        activo: 1,
        creado_en: daysAgo(10)
      },
      {
        id: 3,
        nombre: 'Mateo Hernández',
        edad: 29,
        correo: 'mateo@cliente.com',
        password_hash: hashPassword('Cliente123!', 'sazon_ya_salt_user2'),
        rol: 'USER',
        activo: 1,
        creado_en: daysAgo(8)
      }
    ],
    categorias: [
      {
        id: 1,
        nombre: 'Hamburguesas Artesanales',
        descripcion: 'Hamburguesas a la parrilla con carne 100% res seleccionada y pan brioche artesanal.'
      },
      {
        id: 2,
        nombre: 'Papas Fritas & Acompañamientos',
        descripcion: 'Papas rústicas, criollas y bastón con toppings fundidos.'
      },
      {
        id: 3,
        nombre: 'Combos & Especiales',
        descripcion: 'Combos completos con hamburguesa, papas fritas y bebida artesanal.'
      },
      {
        id: 4,
        nombre: 'Bebidas & Malteadas',
        descripcion: 'Limonadas frappé, gaseosas y malteadas cremosas.'
      }
    ],
    productos: [
      {
        id: 1,
        categoria_id: 1,
        nombre: 'Sazón Brasa Doble Cheddar',
        descripcion:
          'Doble carne smash 150g, cuádruple queso cheddar madurado, tocineta ahumada, cebolla caramelizada y salsa secreta SazónYA en pan brioche dorado.',
        costo_unitario: 4.5,
        precio_venta: 9.9,
        stock_actual: 42,
        stock_minimo: 10,
        estado: 'DISPONIBLE',
        imagen_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
        promedio_estrellas: 5.0,
        total_resenas: 2,
        creado_en: daysAgo(12)
      },
      {
        id: 2,
        categoria_id: 1,
        nombre: 'Crispy Pollo Chipotle',
        descripcion:
          'Pechuga de pollo crujiente empanizada en especias cajún, ensalada coleslaw fresca, pepinillos y mayonesa chipotle.',
        costo_unitario: 3.8,
        precio_venta: 8.5,
        stock_actual: 28,
        stock_minimo: 8,
        estado: 'DISPONIBLE',
        imagen_url: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=800&q=80',
        promedio_estrellas: 4.8,
        total_resenas: 1,
        creado_en: daysAgo(12)
      },
      {
        id: 3,
        categoria_id: 2,
        nombre: 'Papas Supremas Bacon & Cheddar',
        descripcion:
          'Porción grande de papas fritas corte rústico bañadas en salsa de queso cheddar fundido, lluvia de tocineta crocante y cebollín.',
        costo_unitario: 2.1,
        precio_venta: 5.9,
        stock_actual: 8,
        stock_minimo: 10,
        estado: 'STOCK_BAJO',
        imagen_url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=800&q=80',
        promedio_estrellas: 5.0,
        total_resenas: 1,
        creado_en: daysAgo(11)
      },
      {
        id: 4,
        categoria_id: 3,
        nombre: 'Combo Parrillero Imperial',
        descripcion:
          'Incluye 1 Sazón Brasa Doble Cheddar + 1 Papas Fritas Clásicas + 1 Limonada Cerezada 16oz.',
        costo_unitario: 5.9,
        precio_venta: 13.5,
        stock_actual: 35,
        stock_minimo: 8,
        estado: 'DISPONIBLE',
        imagen_url: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=80',
        promedio_estrellas: 5.0,
        total_resenas: 1,
        creado_en: daysAgo(10)
      },
      {
        id: 5,
        categoria_id: 1,
        nombre: 'Veggie Portobello Grill',
        descripcion:
          'Hongo portobello marinado al grill, queso provolone, aguacate hass, tomate confitado y alioli de ajo.',
        costo_unitario: 4.0,
        precio_venta: 8.9,
        stock_actual: 0,
        stock_minimo: 5,
        estado: 'AGOTADO',
        imagen_url: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=800&q=80',
        promedio_estrellas: 4.5,
        total_resenas: 1,
        creado_en: daysAgo(9)
      },
      {
        id: 6,
        categoria_id: 4,
        nombre: 'Malteada Oreo Crunch',
        descripcion:
          'Malteada artesanal de helado de vainilla bourbon con trozos de galleta Oreo y crema chantilly.',
        costo_unitario: 1.95,
        precio_venta: 4.9,
        stock_actual: 30,
        stock_minimo: 6,
        estado: 'DISPONIBLE',
        imagen_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80',
        promedio_estrellas: 4.9,
        total_resenas: 1,
        creado_en: daysAgo(9)
      }
    ],
    condimentos_insumos: [
      {
        id: 1,
        nombre: 'Salsa Secreta SazónYA',
        tipo: 'SALSA',
        unidad_medida: 'porcion',
        stock_actual: 120,
        stock_minimo: 25,
        estado: 'DISPONIBLE',
        actualizado_en: daysAgo(1)
      },
      {
        id: 2,
        nombre: 'Queso Cheddar Fundido',
        tipo: 'CONDIMENTO',
        unidad_medida: 'porcion',
        stock_actual: 18,
        stock_minimo: 20,
        estado: 'STOCK_BAJO',
        actualizado_en: daysAgo(1)
      },
      {
        id: 3,
        nombre: 'Mayonesa Chipotle Ahumada',
        tipo: 'SALSA',
        unidad_medida: 'porcion',
        stock_actual: 85,
        stock_minimo: 15,
        estado: 'DISPONIBLE',
        actualizado_en: daysAgo(1)
      },
      {
        id: 4,
        nombre: 'Tocineta Crocante Ahumada',
        tipo: 'INGREDIENTE',
        unidad_medida: 'porcion',
        stock_actual: 64,
        stock_minimo: 15,
        estado: 'DISPONIBLE',
        actualizado_en: daysAgo(1)
      },
      {
        id: 5,
        nombre: 'Pepinillos Encurtidos',
        tipo: 'CONDIMENTO',
        unidad_medida: 'porcion',
        stock_actual: 0,
        stock_minimo: 10,
        estado: 'AGOTADO',
        actualizado_en: daysAgo(1)
      },
      {
        id: 6,
        nombre: 'Pan Brioche Artesanal',
        tipo: 'INGREDIENTE',
        unidad_medida: 'unidad',
        stock_actual: 95,
        stock_minimo: 20,
        estado: 'DISPONIBLE',
        actualizado_en: daysAgo(1)
      }
    ],
    producto_condimentos: [
      { producto_id: 1, condimento_id: 1, cantidad_requerida: 1, es_opcional: 0 },
      { producto_id: 1, condimento_id: 2, cantidad_requerida: 2, es_opcional: 0 },
      { producto_id: 1, condimento_id: 4, cantidad_requerida: 1, es_opcional: 0 },
      { producto_id: 1, condimento_id: 6, cantidad_requerida: 1, es_opcional: 0 },
      { producto_id: 2, condimento_id: 3, cantidad_requerida: 1, es_opcional: 0 },
      { producto_id: 3, condimento_id: 2, cantidad_requerida: 1, es_opcional: 0 },
      { producto_id: 3, condimento_id: 4, cantidad_requerida: 1, es_opcional: 0 },
      { producto_id: 4, condimento_id: 1, cantidad_requerida: 1, es_opcional: 0 }
    ],
    eventos_promociones: [
      {
        id: 1,
        creado_por_admin_id: 1,
        titulo: 'Festival de la Hamburguesa Brasa 2x1',
        descripcion:
          'Disfruta de nuestras hamburguesas artesanales seleccionadas con 25% de descuento directo durante toda la semana del festival.',
        tipo: 'PROMOCION',
        porcentaje_descuento: 25.0,
        premio_sorteo: null,
        cupo_maximo: null,
        fecha_inicio: daysAgo(3),
        fecha_fin: daysAhead(14),
        estado: 'ACTIVO',
        creado_en: daysAgo(4)
      },
      {
        id: 2,
        creado_por_admin_id: 1,
        titulo: 'Gran Sorteo: 1 Mes de Burgers Gratis',
        descripcion:
          'Participa con tu cuenta activa de SazónYA en el sorteo mensual de 4 Combos Parrillero Imperial totalmente gratis.',
        tipo: 'SORTEO',
        porcentaje_descuento: 0.0,
        premio_sorteo: 'Bono de 4 Combos Parrillero Imperial',
        cupo_maximo: 100,
        fecha_inicio: daysAgo(5),
        fecha_fin: daysAhead(20),
        estado: 'ACTIVO',
        creado_en: daysAgo(5)
      },
      {
        id: 3,
        creado_por_admin_id: 1,
        titulo: 'Noche de Música & Grill en Vivo',
        descripcion:
          'Evento presencial en nuestra sede principal con degustación de nuevas salsas picantes y DJ invitado.',
        tipo: 'EVENTO',
        porcentaje_descuento: 10.0,
        premio_sorteo: 'Pase VIP + Degustación de Salsas',
        cupo_maximo: 50,
        fecha_inicio: daysAgo(1),
        fecha_fin: daysAhead(10),
        estado: 'ACTIVO',
        creado_en: daysAgo(2)
      }
    ],
    participaciones_eventos: [
      {
        id: 1,
        evento_id: 2,
        usuario_id: 2,
        codigo_boleto: 'SZY-EVT2-U2-2026',
        es_ganador: 0,
        inscrito_en: daysAgo(1)
      }
    ],
    pedidos: [
      {
        id: 1,
        usuario_id: 2,
        estado: 'ENTREGADO',
        total_venta: 25.7,
        total_costo: 11.1,
        notas_entrega: 'Sin cebolla en una hamburguesa, por favor.',
        creado_en: daysAgo(2)
      },
      {
        id: 2,
        usuario_id: 3,
        estado: 'ENTREGADO',
        total_venta: 33.3,
        total_costo: 14.9,
        notas_entrega: 'Entregar en portería principal.',
        creado_en: daysAgo(1)
      },
      {
        id: 3,
        usuario_id: 2,
        estado: 'ENTREGADO',
        total_venta: 23.3,
        total_costo: 10.25,
        notas_entrega: 'Extra servilletas y salsa chipotle.',
        creado_en: now.toISOString()
      }
    ],
    detalle_pedidos: [
      {
        id: 1,
        pedido_id: 1,
        producto_id: 1,
        cantidad: 2,
        precio_unitario_snapshot: 9.9,
        costo_unitario_snapshot: 4.5,
        subtotal_venta: 19.8,
        ganancia_neta_linea: 10.8
      },
      {
        id: 2,
        pedido_id: 1,
        producto_id: 3,
        cantidad: 1,
        precio_unitario_snapshot: 5.9,
        costo_unitario_snapshot: 2.1,
        subtotal_venta: 5.9,
        ganancia_neta_linea: 3.8
      },
      {
        id: 3,
        pedido_id: 2,
        producto_id: 1,
        cantidad: 2,
        precio_unitario_snapshot: 9.9,
        costo_unitario_snapshot: 4.5,
        subtotal_venta: 19.8,
        ganancia_neta_linea: 10.8
      },
      {
        id: 4,
        pedido_id: 2,
        producto_id: 4,
        cantidad: 1,
        precio_unitario_snapshot: 13.5,
        costo_unitario_snapshot: 5.9,
        subtotal_venta: 13.5,
        ganancia_neta_linea: 7.6
      },
      {
        id: 5,
        pedido_id: 3,
        producto_id: 1,
        cantidad: 1,
        precio_unitario_snapshot: 9.9,
        costo_unitario_snapshot: 4.5,
        subtotal_venta: 9.9,
        ganancia_neta_linea: 5.4
      },
      {
        id: 6,
        pedido_id: 3,
        producto_id: 2,
        cantidad: 1,
        precio_unitario_snapshot: 8.5,
        costo_unitario_snapshot: 3.8,
        subtotal_venta: 8.5,
        ganancia_neta_linea: 4.7
      },
      {
        id: 7,
        pedido_id: 3,
        producto_id: 6,
        cantidad: 1,
        precio_unitario_snapshot: 4.9,
        costo_unitario_snapshot: 1.95,
        subtotal_venta: 4.9,
        ganancia_neta_linea: 2.95
      }
    ],
    resenas_calificaciones: [
      {
        id: 1,
        usuario_id: 2,
        producto_id: 1,
        estrellas: 5,
        comentario: 'La mejor hamburguesa doble cheddar que he probado, el pan brioche llega súper suave y caliente.',
        creado_en: daysAgo(2)
      },
      {
        id: 2,
        usuario_id: 3,
        producto_id: 1,
        estrellas: 5,
        comentario: 'La salsa secreta y la tocineta ahumada hacen una diferencia brutal. 100% recomendada.',
        creado_en: daysAgo(1)
      },
      {
        id: 3,
        usuario_id: 2,
        producto_id: 3,
        estrellas: 5,
        comentario: 'Las papas supremas traen muchísimo queso cheddar real y tocineta crocante.',
        creado_en: daysAgo(1)
      }
    ],
    favoritos: [
      { usuario_id: 2, producto_id: 1, agregado_en: daysAgo(2) },
      { usuario_id: 2, producto_id: 3, agregado_en: daysAgo(2) },
      { usuario_id: 3, producto_id: 4, agregado_en: daysAgo(1) }
    ],
    recomendaciones_productos: [
      {
        id: 1,
        usuario_id: 2,
        nombre_sugerido: 'Burger Hawaiana Picante',
        descripcion_ingredientes:
          'Carne de res 150g con piña asada al carbón, jalapeños caramelizados, queso mozzarella y salsa teriyaki.',
        estado: 'PENDIENTE',
        creado_en: daysAgo(1)
      }
    ],
    auditoria_precios_productos: []
  };
}

export class DatabaseAdapter {
  #state;
  #inTransaction = false;

  constructor() {
    this.#state = createSeedState();
  }

  reset() {
    this.#state = createSeedState();
  }

  get state() {
    return this.#state;
  }

  async withTransaction(workFn) {
    // Copia profunda para rollback atómico ACID ante cualquier excepción
    const snapshot = structuredClone(this.#state);
    this.#inTransaction = true;
    try {
      const result = await workFn(this);
      this.#inTransaction = false;
      return result;
    } catch (error) {
      this.#state = snapshot;
      this.#inTransaction = false;
      throw error;
    }
  }
}

export const db = new DatabaseAdapter();
export const withTransaction = (fn) => db.withTransaction(fn);
