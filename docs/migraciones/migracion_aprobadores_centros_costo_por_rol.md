# Migracion Aprobadores De Centros De Costo Por Rol

## Objetivo

Aplicar de forma segura la migracion `backend/db/migrations/20260511_0006_centros_costo_aprobadores_por_rol.sql` sobre una base existente.

## Estado

Migracion aplicada localmente sin pendientes al `2026-05-13`.

Los SQL manuales de precheck y postcheck se conservan solo como evidencia historica en:

- `docs/historico/migraciones/20260511_0006_aprobadores_por_rol/precheck.sql`
- `docs/historico/migraciones/20260511_0006_aprobadores_por_rol/postcheck.sql`

Esta migracion:

- habilita `rol_aprobador_id` en `centros_costo`
- vuelve opcional `usuario_aprobador_id` donde ahora aplica el modelo mixto
- agrega `rol_aprobador_*` y `decision_usuario_*` en `tramites_pago_documentos_aprobadores`
- hace backfill de snapshots por rol para tramites ya existentes

## Antes De Empezar

- No ejecutes `npm run db:reset`.
- Programa una ventana corta sin cambios concurrentes en centros de costo, contabilizacion o aprobaciones de tramites.
- Ten a mano `docs/operaciones/runbook_backup_rollback.md`.
- Confirma que la DB objetivo es la correcta antes de correr cualquier comando.

## Paso 1. Confirmar Estado De Migraciones

Entorno local o compartido:

```bash
cd backend
npm run db:migrate:status
```

Entorno preprod con `backend/.env.production.local`:

```bash
cd backend
node scripts/run_with_env_file.js --env-file .env.production.local db/migrate_status.js
npm run preprod:backup-plan
```

Esperado:

- la tabla `schema_migrations` existe
- la migracion `20260511_0006` aparece como pendiente si aun no se ha aplicado
- no hay `checksum mismatches`
- no hay `missing files`

## Paso 2. Preparar Backup Y Rollback

Entorno local o compartido:

```bash
cd backend
npm run release:backup-plan
```

Entorno preprod:

```bash
cd backend
npm run preprod:backup-plan
```

Luego:

1. Ejecuta el `pg_dump` sugerido por el helper.
2. Valida el dump con `pg_restore --list`.
3. Si el entorno tiene storage operativo real, respalda `documentos/` y `facturas/`.
4. Guarda el JSON del plan si quieres evidencia del corte.

Referencia completa: `docs/operaciones/runbook_backup_rollback.md`

## Paso 3. Ejecutar Precheck SQL

Archivo listo para correr:

- `docs/historico/migraciones/20260511_0006_aprobadores_por_rol/precheck.sql`

Opciones:

- correrlo en `psql`
- abrirlo en pgAdmin o tu cliente SQL favorito
- copiar y pegar solo las consultas que necesites

Ejemplo con `psql`:

```bash
psql -h <host> -U <user> -d <database> -f docs/historico/migraciones/20260511_0006_aprobadores_por_rol/precheck.sql
```

No sigas si el precheck muestra:

- roles referenciados en metadata que no existen en `roles`
- migracion ya aplicada en una base donde sospechas drift
- resultados inconsistentes que no puedes explicar

## Paso 4. Aplicar La Migracion

Entorno local o compartido:

```bash
cd backend
npm run db:migrate
```

Entorno preprod:

```bash
cd backend
npm run preprod:db:migrate
```

La migracion versionada que debe aplicarse es:

- `20260511_0006_centros_costo_aprobadores_por_rol`

## Paso 5. Ejecutar Postcheck SQL

Archivo listo para correr:

- `docs/historico/migraciones/20260511_0006_aprobadores_por_rol/postcheck.sql`

Ejemplo con `psql`:

```bash
psql -h <host> -U <user> -d <database> -f docs/historico/migraciones/20260511_0006_aprobadores_por_rol/postcheck.sql
```

Esperado:

- `schema_migrations` registra `20260511_0006`
- existen las nuevas columnas
- no hay filas invalidas con cero o dos aprobadores
- no hay duplicados por `(tramite_id, factura_id, rol_aprobador_id)`
- no quedan snapshots por rol faltantes respecto a `facturas_contabilizacion.metadata`

## Paso 6. Smoke Check Funcional

Checklist minimo:

1. Abrir `Administracion > Centros de costo`.
2. Verificar que la pantalla carga sin error y muestra aprobadores actuales.
3. Editar un centro de costo y confirmar que permite `Usuario especifico` o `Rol compartido`.
4. Exportar la plantilla CSV y confirmar que incluye `rol_aprobador`.
5. Importar un CSV de prueba con `rol_aprobador` y validar que no rompe compatibilidad con `email_aprobador`.
6. Abrir un tramite con factura que tenga centros con rol y confirmar que la seccion de aprobadores muestra el rol.
7. Si tienes dos usuarios activos con el mismo rol, confirmar que uno de ellos puede aprobar y que el historial muestra quien resolvio realmente.

## Si Algo Falla

- No sigas con pruebas funcionales parciales sobre una DB dudosa.
- Revisa primero el resultado del postcheck.
- Si la migracion fallo a mitad de camino, usa la transaccion fallida y el mensaje de error como punto de partida.
- Si ya habias aplicado cambios adicionales manuales sobre la DB, pausa y evalua rollback con el dump recien validado.

## Evidencia Minima A Guardar

- salida de `db:migrate:status` antes
- evidencia del backup
- salida de `db:migrate`
- salida del precheck y postcheck
- commit liberado
- fecha y entorno donde se aplico
