export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'SazónYA API — Plataforma de Gestión de Comida Rápida',
    version: '1.0.0',
    description:
      'Contrato oficial OpenAPI 3 de SazónYA: Autenticación JWT, CRUD de Productos e Inventario de Condimentos, Pedidos Transaccionales ACID, Reseñas con Estrellas, Favoritos, Recomendaciones, Eventos/Sorteos y Estadísticas Semanales.'
  },
  servers: [
    {
      url: 'http://localhost:3001/api/v1',
      description: 'Servidor Local de Desarrollo SazónYA'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  paths: {
    '/health': {
      get: {
        summary: 'Estado de salud y versión SemVer de la API',
        responses: {
          '200': { description: 'Servicio saludable' }
        }
      }
    },
    '/auth/register': {
      post: {
        summary: 'Registro de nuevo cliente (nombre, edad, correo, contraseña)',
        responses: {
          '201': { description: 'Usuario registrado exitosamente' },
          '400': { description: 'Error de validación en Barrera 1 o 2' },
          '409': { description: 'Correo electrónico ya registrado' }
        }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Inicio de sesión para Admin y Clientes',
        responses: {
          '200': { description: 'Token JWT y perfil de usuario' },
          '401': { description: 'Credenciales inválidas' }
        }
      }
    },
    '/auth/me': {
      get: {
        summary: 'Perfil del usuario autenticado',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Perfil verificado' },
          '401': { description: 'Token ausente o inválido' }
        }
      }
    },
    '/products': {
      get: {
        summary: 'Listar catálogo de productos y estados de inventario',
        responses: { '200': { description: 'Listado de productos y categorías' } }
      },
      post: {
        summary: 'Registrar nuevo producto en el catálogo (Solo ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: {
          '201': { description: 'Producto creado' },
          '403': { description: 'Requiere rol ADMIN' }
        }
      }
    },
    '/products/{id}': {
      put: {
        summary: 'Editar producto existente y auditar precios (Solo ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Producto actualizado' } }
      },
      delete: {
        summary: 'Eliminar o desactivar producto preservando historial semanal (Solo ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Producto eliminado o desactivado' } }
      }
    },
    '/condiments': {
      get: {
        summary: 'Listar inventario y estados de condimentos e insumos',
        responses: { '200': { description: 'Listado de condimentos' } }
      },
      post: {
        summary: 'Registrar nuevo condimento/insumo (Solo ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Condimento registrado' } }
      }
    },
    '/condiments/{id}': {
      put: {
        summary: 'Actualizar stock y estado de condimento/insumo (Solo ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Condimento actualizado' } }
      }
    },
    '/events': {
      get: {
        summary: 'Listar eventos, promociones y sorteos',
        responses: { '200': { description: 'Lista de eventos y cupos disponibles' } }
      },
      post: {
        summary: 'Registrar nuevo evento, promoción o sorteo (Solo ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Evento creado' } }
      }
    },
    '/events/{id}/participate': {
      post: {
        summary: 'Inscribir usuario autenticado en un evento o sorteo',
        security: [{ bearerAuth: [] }],
        responses: {
          '201': { description: 'Boleto de participación generado' },
          '409': { description: 'Ya inscrito o cupo agotado' }
        }
      }
    },
    '/orders': {
      post: {
        summary: 'Realizar pedido transaccional ACID con descuento de productos y condimentos',
        security: [{ bearerAuth: [] }],
        responses: {
          '201': { description: 'Pedido confirmado' },
          '409': { description: 'Stock insuficiente' }
        }
      }
    },
    '/orders/my': {
      get: {
        summary: 'Listar historial de pedidos del usuario autenticado',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Historial de pedidos' } }
      }
    },
    '/reviews': {
      get: {
        summary: 'Listar calificaciones (estrellas) y reseñas de productos',
        responses: { '200': { description: 'Lista de reseñas' } }
      },
      post: {
        summary: 'Calificar producto (1-5 estrellas) y asignar reseña',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Reseña guardada y promedio recalculado' } }
      }
    },
    '/favorites': {
      get: {
        summary: 'Listar productos favoritos del usuario',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Lista de favoritos' } }
      }
    },
    '/favorites/{productoId}/toggle': {
      post: {
        summary: 'Agregar o quitar producto de la sección de favoritos',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Estado de favorito actualizado' } }
      }
    },
    '/recommendations': {
      get: {
        summary: 'Listar recomendaciones de nuevos productos',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Lista de recomendaciones' } }
      },
      post: {
        summary: 'Recomendar un nuevo producto al administrador',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Recomendación registrada' } }
      }
    },
    '/analytics/weekly': {
      get: {
        summary: 'Estadísticas de ventas semanales: Producto más vendido y ganancia neta por producto (Solo ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Reporte analítico semanal' } }
      }
    }
  }
};
