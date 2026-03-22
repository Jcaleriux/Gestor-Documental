# Legacy SQL

Estos scripts corresponden al historial incremental antiguo del proyecto.

- No se ejecutan en el flujo canonico actual.
- Se conservan solo como referencia historica.

Para construccion limpia de la BD usa:

- `backend/db/database/00_init.sql`
- `backend/db/database/seed.sql`

Para cambios incrementales nuevos usa:

- `backend/db/migrations/`
- `npm run db:migrate`
