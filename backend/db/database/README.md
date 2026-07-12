# Base de Datos (Fuente Canonica)

Este proyecto ahora se construye **desde cero** usando un solo esquema:

- `00_init.sql`: esquema completo (tablas, constraints, FKs e indices).
- `01_create_db.sql`: script opcional para crear la base `sendadocs_db`.
- `seed.sql`: catalogos base de permisos, roles y matriz `roles_permisos`.
- `demo_seed.sql`: usuarios demo opcionales para ambientes locales o demos controladas.
- `backend/db/migrations/`: migraciones incrementales versionadas sobre el baseline runtime.

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
5. Registra el baseline runtime y aplica migraciones pendientes de `backend/db/migrations/`

El flujo normal no crea usuarios demo. En una base limpia, el primer administrador se crea desde la app mediante la pantalla de configuracion inicial.

Para cargar usuarios demo de forma explicita:

```bash
npm run db:seed:demo
```

Ese comando ejecuta `demo_seed.sql`; no forma parte de `db:init` ni de `db:reset`.

Para inicializar sin borrar schema:

```bash
npm run db:init
```

Para aplicar cambios incrementales en una base existente:

```bash
npm run db:migrate
```

Para revisar estado del tracking versionado:

```bash
npm run db:migrate:status
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
- Los wrappers `backend/db/migrate_*.js` ya fueron retirados del flujo operativo; los cambios nuevos deben entrar por `backend/db/migrations/`.
