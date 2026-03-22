# Migraciones Versionadas

Esta carpeta es el flujo canonico para cambios incrementales de schema a partir del baseline runtime actual.

Reglas:

- Nombre de archivo: `YYYYMMDD_NNNN_descripcion.sql` o `YYYYMMDD_NNNN_descripcion.js`
- `version` debe ser unica e inmutable
- No editar una migracion ya aplicada; crear una nueva
- Las migraciones SQL no deben incluir `BEGIN`/`COMMIT`; el runner las envuelve en transaccion
- Las migraciones JS deben exportar `up({ client, migration })`

Comandos:

- `npm run db:migrate`
- `npm run db:migrate:status`

Notas:

- `backend/db/database/00_init.sql` sigue siendo el bootstrap limpio del schema.
- El runner registra un baseline sobre `00_init.sql` y luego aplica las migraciones pendientes de esta carpeta.
- Los wrappers legacy `db/migrate_*.js` ya fueron retirados; el flujo oficial incremental es solo este directorio + `npm run db:migrate`.
