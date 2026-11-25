# Requerimientos Oficiales — `sazon-ya-backend`

## 1. Contexto
Backend transaccional y base de datos relacional en 3FN para **SazónYA** (empresa de venta de comida rápida: hamburguesas, papas fritas, combos y bebidas).

## 2. Requerimientos Funcionales Cubiertos
1. **Administrador (`rol = ADMIN`):**
   - Inicio de sesión seguro con JWT.
   - Organización de inventario de productos y condimentos/insumos (`DISPONIBLE`, `STOCK_BAJO`, `AGOTADO`, `INACTIVO`).
   - Estadísticas de ventas semanales (`/api/v1/analytics/weekly`): producto más vendido y ganancias netas por producto.
   - CRUD completo de productos (`POST`, `GET`, `PUT`, `DELETE` con protección histórica) y condimentos.
   - Registro y gestión de eventos, promociones y sorteos (`/api/v1/events`).
2. **Cliente (`rol = USER` y Visitante Público):**
   - Vista general pública de catálogo, categorías y eventos activos.
   - Registro con validación de `nombre`, `edad` (`13–120`), `correo` y `contraseña` fuerte + Login.
   - Calificar productos (`1 a 5 estrellas`) y asignar reseñas con recálculo automático del promedio.
   - Recomendar nuevos productos al administrador.
   - Participar en eventos y sorteos con generación de boleto único y control de cupo.
   - Realizar pedidos transaccionales ACID con descuento automático de stock de productos y condimentos.
   - Sección de favoritos con toggle idempotente.
