# SazónYA Backend (`sazon-ya-backend`)

API RESTful en **Node.js + Express + MySQL 8.0** construida bajo **Arquitectura Limpia en Capas**, Diseño Dirigido por Contrato (**OpenAPI 3**), **Doble Barrera de Validación** y **Transacciones ACID**.

## Estructura del Repositorio

- `database/ddl/`: Esquema en 3FN (`01_schema.sql`) e índices B-Tree (`02_indices.sql`).
- `database/dml/`: Datos semilla idempotentes (`01_seed_inicial.sql`).
- `database/dql/`: Triggers (`trigger.sql`), vistas de estadísticas semanales (`views.sql`), procedimientos transaccionales (`transacciones.sql`) y usuarios con mínimo privilegio (`usuarios.sql`).
- `src/entities/`: Entidades con campos privados ES2022 (`#`) y autovalidación (`BaseEntity`, `UserEntity`, `ProductEntity`, `CondimentEntity`, `EventEntity`, `ReviewEntity`, `RecommendationEntity`).
- `src/repositories/`: Repositorios desacoplados con `BaseRepository` y `executor(conn)`.
- `src/services/`: Casos de uso y orquestación transaccional (`withTransaction`).
- `src/controllers/`, `src/validators/`, `src/middlewares/`, `src/routes/`.
- `src/container.js`: Único *Composition Root* de inyección de dependencias.

## Comandos

```bash
npm install
npm run docs:check
npm test
npm start
```

## Credenciales Semilla (Demo)
- **Administrador:** `admin@sazonya.com` / `Admin123!`
- **Cliente:** `camila@cliente.com` / `Cliente123!`
