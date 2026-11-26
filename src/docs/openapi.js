export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'SazónYA API — Plataforma de Gestión de Comida Rápida',
    version: '1.0.0',
    description:
      'Contrato oficial OpenAPI 3 de SazónYA: Autenticación JWT, CRUD de Productos con carga de imágenes desde dispositivo, Inventario de Condimentos, Pedidos Transaccionales ACID, Reseñas con Estrellas, Favoritos, Recomendaciones, Eventos/Sorteos con media (VIDEO/POSTING), Contactos y Estadísticas Semanales.'
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
        summary: 'Registrar nuevo producto en el catálogo con imagen desde dispositivo o URL (Solo ADMIN)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['categoria_id', 'nombre', 'descripcion', 'costo_unitario', 'precio_venta'],
                properties: {
                  categoria_id: { type: 'integer' },
                  nombre: { type: 'string' },
                  descripcion: { type: 'string' },
                  costo_unitario: { type: 'number' },
                  precio_venta: { type: 'number' },
                  stock_actual: { type: 'integer' },
                  stock_minimo: { type: 'integer' },
                  estado: { type: 'string' },
                  imagen_url: { type: 'string' },
                  imagen: { type: 'string', format: 'binary' },
                  image: { type: 'string', format: 'binary' }
                }
              }
            },
            'application/json': {
              schema: {
                type: 'object',
                required: ['categoria_id', 'nombre', 'descripcion', 'costo_unitario', 'precio_venta'],
                properties: {
                  categoria_id: { type: 'integer' },
                  nombre: { type: 'string' },
                  descripcion: { type: 'string' },
                  costo_unitario: { type: 'number' },
                  precio_venta: { type: 'number' },
                  stock_actual: { type: 'integer' },
                  stock_minimo: { type: 'integer' },
                  estado: { type: 'string' },
                  imagen_url: { type: 'string' },
                  imagen_base64: { type: 'string', description: 'Data URL Base64 opcional (data:image/...;base64,...)' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Producto creado' },
          '400': { description: 'Error de validación en Barrera 1 o 2' },
          '401': { description: 'No autenticado' },
          '403': { description: 'Requiere rol ADMIN' },
          '413': { description: 'Archivo supera 5 MB' },
          '415': { description: 'Tipo MIME o firma binaria no permitida' }
        }
      }
    },
    '/products/{id}': {
      put: {
        summary: 'Editar producto existente, reemplazar imagen y auditar precios (Solo ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  categoria_id: { type: 'integer' },
                  nombre: { type: 'string' },
                  descripcion: { type: 'string' },
                  costo_unitario: { type: 'number' },
                  precio_venta: { type: 'number' },
                  stock_actual: { type: 'integer' },
                  stock_minimo: { type: 'integer' },
                  estado: { type: 'string' },
                  imagen_url: { type: 'string' },
                  imagen: { type: 'string', format: 'binary' },
                  image: { type: 'string', format: 'binary' }
                }
              }
            },
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  categoria_id: { type: 'integer' },
                  nombre: { type: 'string' },
                  descripcion: { type: 'string' },
                  costo_unitario: { type: 'number' },
                  precio_venta: { type: 'number' },
                  stock_actual: { type: 'integer' },
                  stock_minimo: { type: 'integer' },
                  estado: { type: 'string' },
                  imagen_url: { type: 'string' },
                  imagen_base64: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Producto actualizado' },
          '400': { description: 'Error de validación' },
          '401': { description: 'No autenticado' },
          '403': { description: 'Requiere rol ADMIN' },
          '404': { description: 'Producto no encontrado' },
          '413': { description: 'Archivo supera 5 MB' },
          '415': { description: 'Tipo MIME o firma binaria no permitida' }
        }
      },
      delete: {
        summary: 'Eliminar o desactivar producto preservando historial semanal (Solo ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: { '200': { description: 'Producto eliminado o desactivado' } }
      }
    },
    '/uploads/{folder}/{filename}': {
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Servidor de activos multimedia estáticos'
        }
      ],
      get: {
        summary: 'Servir imagen o video subido al servidor con cabeceras CORP cross-origin',
        parameters: [
          {
            name: 'folder',
            in: 'path',
            required: true,
            schema: { type: 'string', enum: ['products', 'events'] }
          },
          {
            name: 'filename',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Archivo multimedia servido con Cross-Origin-Resource-Policy: cross-origin y X-Content-Type-Options: nosniff'
          },
          '206': { description: 'Contenido parcial (Range request para video)' },
          '400': { description: 'Ruta inválida o intento de traversal' },
          '404': { description: 'Archivo no encontrado' }
        }
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
        summary: 'Listar eventos, promociones, sorteos y contenido multimedia (VIDEO/POSTING)',
        responses: { '200': { description: 'Lista de eventos, cupos disponibles y metadatos multimedia' } }
      },
      post: {
        summary: 'Registrar nuevo evento, promoción, sorteo o contenido multimedia (Solo ADMIN)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['titulo', 'descripcion', 'fecha_inicio', 'fecha_fin'],
                properties: {
                  titulo: { type: 'string' },
                  descripcion: { type: 'string' },
                  tipo: { type: 'string', enum: ['EVENTO', 'PROMOCION', 'SORTEO'] },
                  porcentaje_descuento: { type: 'number' },
                  premio_sorteo: { type: 'string' },
                  cupo_maximo: { type: 'integer' },
                  fecha_inicio: { type: 'string', format: 'date-time' },
                  fecha_fin: { type: 'string', format: 'date-time' },
                  estado: { type: 'string', enum: ['PROGRAMADO', 'ACTIVO', 'FINALIZADO', 'CANCELADO'] },
                  media_tipo: { type: 'string', enum: ['NONE', 'VIDEO', 'POSTING'] },
                  media_url: { type: 'string' },
                  posting_contenido: { type: 'string' },
                  media_file: { type: 'string', format: 'binary' }
                }
              }
            },
            'application/json': {
              schema: {
                type: 'object',
                required: ['titulo', 'descripcion', 'fecha_inicio', 'fecha_fin'],
                properties: {
                  titulo: { type: 'string' },
                  descripcion: { type: 'string' },
                  tipo: { type: 'string', enum: ['EVENTO', 'PROMOCION', 'SORTEO'] },
                  porcentaje_descuento: { type: 'number' },
                  premio_sorteo: { type: 'string' },
                  cupo_maximo: { type: 'integer' },
                  fecha_inicio: { type: 'string', format: 'date-time' },
                  fecha_fin: { type: 'string', format: 'date-time' },
                  estado: { type: 'string', enum: ['PROGRAMADO', 'ACTIVO', 'FINALIZADO', 'CANCELADO'] },
                  media_tipo: { type: 'string', enum: ['NONE', 'VIDEO', 'POSTING'] },
                  media_url: { type: 'string' },
                  posting_contenido: { type: 'string' },
                  media_base64: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Evento creado' },
          '400': { description: 'Error de validación' },
          '401': { description: 'No autenticado' },
          '403': { description: 'Requiere rol ADMIN' },
          '413': { description: 'Archivo multimedia excede el límite permitido' },
          '415': { description: 'Tipo MIME o firma binaria no permitida' }
        }
      }
    },
    '/events/{id}': {
      put: {
        summary: 'Actualizar evento, promoción, sorteo o contenido multimedia (Solo ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  titulo: { type: 'string' },
                  descripcion: { type: 'string' },
                  tipo: { type: 'string', enum: ['EVENTO', 'PROMOCION', 'SORTEO'] },
                  porcentaje_descuento: { type: 'number' },
                  premio_sorteo: { type: 'string' },
                  cupo_maximo: { type: 'integer' },
                  fecha_inicio: { type: 'string', format: 'date-time' },
                  fecha_fin: { type: 'string', format: 'date-time' },
                  estado: { type: 'string', enum: ['PROGRAMADO', 'ACTIVO', 'FINALIZADO', 'CANCELADO'] },
                  media_tipo: { type: 'string', enum: ['NONE', 'VIDEO', 'POSTING'] },
                  media_url: { type: 'string' },
                  posting_contenido: { type: 'string' },
                  media_file: { type: 'string', format: 'binary' }
                }
              }
            },
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  titulo: { type: 'string' },
                  descripcion: { type: 'string' },
                  tipo: { type: 'string', enum: ['EVENTO', 'PROMOCION', 'SORTEO'] },
                  porcentaje_descuento: { type: 'number' },
                  premio_sorteo: { type: 'string' },
                  cupo_maximo: { type: 'integer' },
                  fecha_inicio: { type: 'string', format: 'date-time' },
                  fecha_fin: { type: 'string', format: 'date-time' },
                  estado: { type: 'string', enum: ['PROGRAMADO', 'ACTIVO', 'FINALIZADO', 'CANCELADO'] },
                  media_tipo: { type: 'string', enum: ['NONE', 'VIDEO', 'POSTING'] },
                  media_url: { type: 'string' },
                  posting_contenido: { type: 'string' },
                  media_base64: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Evento actualizado' },
          '400': { description: 'Error de validación' },
          '401': { description: 'No autenticado' },
          '403': { description: 'Requiere rol ADMIN' },
          '404': { description: 'Evento no encontrado' },
          '413': { description: 'Archivo multimedia excede el límite permitido' },
          '415': { description: 'Tipo MIME o firma binaria no permitida' }
        }
      }
    },
    '/events/{id}/status': {
      patch: {
        summary: 'Cambiar estado del evento o sorteo (Solo ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['estado'],
                properties: {
                  estado: { type: 'string', enum: ['PROGRAMADO', 'ACTIVO', 'FINALIZADO', 'CANCELADO'] }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Estado del evento actualizado' },
          '400': { description: 'Estado inválido' },
          '401': { description: 'No autenticado' },
          '403': { description: 'Requiere rol ADMIN' },
          '404': { description: 'Evento no encontrado' }
        }
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
        summary: 'Estadísticas de ventas semanales con serie diaria cronológica, producto más vendido y ganancia neta por producto (Solo ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'days',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 7, minimum: 1, maximum: 90 }
          }
        ],
        responses: {
          '200': {
            description:
              'Reporte analítico semanal incluyendo resumen_global, ganancias_por_producto, alertas_inventario y serie_diaria (fecha, pedidos, unidades, ingresos, ganancia_neta)'
          }
        }
      }
    },
    '/contacts': {
      post: {
        summary: 'Enviar mensaje desde el formulario público de contacto',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre', 'correo', 'asunto', 'mensaje'],
                properties: {
                  nombre: { type: 'string' },
                  correo: { type: 'string', format: 'email' },
                  asunto: { type: 'string' },
                  mensaje: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Mensaje de contacto registrado' },
          '400': { description: 'Datos inválidos' }
        }
      },
      get: {
        summary: 'Listar mensajes de contacto recibidos (Solo ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Listado de mensajes de contacto' },
          '401': { description: 'No autenticado' },
          '403': { description: 'Requiere rol ADMIN' }
        }
      }
    }
  }
};
