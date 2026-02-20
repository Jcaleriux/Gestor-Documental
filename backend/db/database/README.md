# Base de Datos (Fuente Canonica)

Este proyecto ahora se construye **desde cero** usando un solo esquema:

- `00_init.sql`: esquema completo (tablas, constraints, FKs e indices).
- `01_create_db.sql`: script opcional para crear la base `novogar_db`.
- `seed.sql`: datos iniciales opcionales.

## Flujo recomendado

Desde `backend/`:

```bash
npm run db:reset
```

Esto hace:

1. `DROP SCHEMA public CASCADE`
2. `CREATE SCHEMA public`
3. Ejecuta `00_init.sql`
4. Ejecuta `seed.sql` (si existe)

Para inicializar sin borrar schema:

```bash
npm run db:init
```

Para inspeccionar estructura resultante:

```bash
npm run db:check
```

## Archivos historicos

Los archivos `02_*.sql` a `23_*.sql` y `19_ERD_script.sql` se conservan como
historial de evolucion, pero **no** forman parte del flujo canonico de
bootstrap limpio. Ahora viven en:

- `backend/db/database/legacy/`
