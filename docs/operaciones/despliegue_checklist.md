# Checklist De Despliegue

Guia manual minima para desplegar `SendaDocs` sin depender de memoria. Esta lista asume el estado actual del repo: backend Node.js/Express, frontend React/Vite, PostgreSQL administrado por scripts del proyecto y configuracion sensible externalizada via `backend/.env`.

## 1. Antes De Empezar

- [ ] Confirmar la version objetivo del release en `VERSION`.
- [ ] Confirmar que `CHANGELOG.md` ya refleja el alcance real del corte.
- [ ] Confirmar el alcance del release: que cambia, si toca schema, si toca permisos, si toca rutas o payloads.
- [ ] Confirmar el entorno objetivo: desarrollo compartido, staging o produccion.
- [ ] Confirmar acceso a PostgreSQL, filesystem operativo y credenciales del servidor.
- [ ] Si el release toca schema o datos, sacar respaldo de la base antes de aplicar cambios.
- [ ] Verificar que **no** se va a usar `npm run db:reset` en entornos gestionados.
- [ ] Tener a mano `docs/operaciones/runbook_backup_rollback.md` y el helper `backend npm run release:backup-plan`.
- [ ] Si el primer ensayo se hace en esta misma PC, tener a mano `docs/operaciones/preproduccion_local.md`.

## 2. Variables Obligatorias

Partir de `backend/.env.example` y completar como minimo:

- [ ] `NODE_ENV=production`
- [ ] `PORT`
- [ ] `DB_HOST` o `PGHOST`
- [ ] `DB_PORT` o `PGPORT`
- [ ] `DB_USER` o `PGUSER`
- [ ] `DB_PASSWORD` o `PGPASSWORD`
- [ ] `DB_NAME` o `PGDATABASE`
- [ ] `JWT_SECRET` con un valor real, largo y no reutilizado
- [ ] `FACTURAS_BASE_DIR` apuntando al root operativo correcto si el servidor no usa la raiz del repo

Notas:

- No desplegar con `JWT_SECRET=dev-secret`.
- No dejar credenciales dev por defecto (`postgres` / `admin` / `sendadocs_db`) salvo que el entorno sea realmente local y controlado.
- Si el servidor usa rutas distintas para documentos, revisar tambien `JSON_BODY_LIMIT` y limites de archivos (`TABLAS_PAGO_MAX_FILE_MB`, `ORDENES_COMPRA_MAX_FILE_MB`, `RESERVAS_DOC_MAX_FILE_MB`).

## 3. Validacion Previa Del Release

### Backend

- [ ] Instalar dependencias:

```bash
cd backend
npm install
```

- [ ] Ejecutar chequeos base de release:

```bash
cd backend
npm run check:release
```

- [ ] Preparar plan de backup y rollback:

```bash
cd backend
npm run release:backup-plan
```

- [ ] Generar reporte de readiness productiva:

```bash
cd backend
npm run release:readiness
```

- [ ] Ejecutar smoke checks de dominio:

```bash
cd backend
npm run release:smoke
```

- [ ] Si el entorno ya esta configurado, definir `SMOKE_USER_EMAIL` y `SMOKE_USER_PASSWORD` antes de correr smoke checks protegidos.
- [ ] Ejecutar pruebas relevantes del release.
- [ ] Si hay cambios de configuracion o arranque, validar sintaxis con `node -c` sobre los archivos tocados.

### Frontend

- [ ] Instalar dependencias:

```bash
cd frontend
npm install
```

- [ ] Ejecutar lint:

```bash
cd frontend
npm run lint
```

- [ ] Generar build:

```bash
cd frontend
npm run build
```

- [ ] Ejecutar tests CI de frontend:

```bash
cd frontend
npm run test:ci
```

## 4. Base De Datos

### Entorno nuevo

- [ ] Crear la base si no existe:

```bash
psql -U <usuario> -f backend/db/database/01_create_db.sql
```

- [ ] Inicializar schema:

```bash
cd backend
npm run db:init
```

### Entorno existente

- [ ] Validar estructura actual:

```bash
cd backend
npm run db:check
```

- [ ] Aplicar solo las migraciones/manual scripts necesarios para el release actual.
- [ ] Si el release no requiere cambios de schema, dejar evidencia de que no hay migraciones pendientes.
- [ ] Si el release toca schema o datos, ejecutar backup DB y validar el dump con `pg_restore --list`.
- [ ] Si el entorno usa filesystem operativo real, respaldar `documentos/` y `facturas/` segun el runbook.
- [ ] Guardar evidencia JSON del readiness report y del backup plan junto al release si el entorno ya es candidato real.

## 5. Arranque

### Backend

- [ ] Verificar que `backend/.env` ya esta cargado con los valores del entorno.
- [ ] Levantar backend:

```bash
cd backend
npm run dev
```

Nota: hoy el repo documenta `npm run dev` como forma principal de levantar la API. Si el despliegue usa PM2, NSSM, servicio Windows o similar, reutilizar el mismo `.env` y el mismo comando base.

### Frontend

- [ ] Tener un build actualizado de `frontend/dist`.
- [ ] Publicar `frontend/dist` con el mecanismo del entorno destino.
- [ ] Confirmar que el frontend apunta al backend correcto si se usa proxy o reverse proxy distinto al local.

## 6. Smoke Checklist

- [ ] `GET /api/health` responde `200`.
- [ ] `GET /api/release-info` expone la version y commit esperados del deploy.
- [ ] `GET /api/onboarding/status` responde correctamente.
- [ ] Login exitoso con un usuario valido, o onboarding inicial pendiente en una base limpia.
- [ ] Dashboard carga sin errores visibles.
- [ ] Listado de facturas responde y permite filtrar.
- [ ] Tramites de pago cargan correctamente.
- [ ] Descarga o preview de archivos funciona si el entorno tiene documentos operativos montados.
- [ ] Logs de backend no muestran errores repetitivos de conexion DB, JWT o filesystem.

## 7. Cierre

- [ ] Confirmar el commit exacto liberado.
- [ ] Crear o registrar el tag Git oficial correspondiente, por ejemplo `v1.0.0`, sobre ese commit.
- [ ] Registrar que version o commit quedo desplegado.
- [ ] Registrar migraciones o scripts manuales ejecutados.
- [ ] Registrar cualquier ajuste de entorno aplicado fuera del repo.
- [ ] Si hubo incidencia o workaround, documentarlo antes de cerrar.

## 8. Riesgos Frecuentes

- Arrancar con `JWT_SECRET` por defecto o faltante.
- Dejar apuntando la app a una DB local equivocada por una variable mal cargada.
- Romper documentos/previews por `FACTURAS_BASE_DIR` incorrecto.
- Ejecutar `db:reset` por error en un entorno compartido.
- Desplegar frontend nuevo contra backend viejo o viceversa sin validar compatibilidad.
