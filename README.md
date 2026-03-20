# Proyecto Novogar

Sistema web para gestion de facturas, documentos y tramites de pago con control por sociedades, roles y permisos.

## Tabla de contenido

- [Resumen](#resumen)
- [Arquitectura](#arquitectura)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Documentacion funcional](#documentacion-funcional)
- [Requisitos](#requisitos)
- [Inicio rapido](#inicio-rapido)
- [Credenciales iniciales](#credenciales-iniciales)
- [Variables de entorno](#variables-de-entorno)
- [Entorno para Codex](#entorno-para-codex)
- [Convenciones de idioma](#convenciones-de-idioma)
- [Principios transversales](#principios-transversales)
- [Scripts](#scripts)
- [API base](#api-base)
- [Pruebas](#pruebas)
- [Roadmap](#roadmap)

## Resumen

- Backend con API REST, autenticacion JWT y permisos por rol.
- Frontend React para operacion de facturas, tramites, proveedores y usuarios.
- Bootstrap de base de datos desde SQL canonico (`00_init.sql` + `seed.sql`).
- Soporte de carga/lectura de documentos en filesystem con rutas normalizadas.

## Arquitectura

- Backend: Node.js + Express (`backend/`)
- Frontend: React + Vite (`frontend/`)
- DB: PostgreSQL (`backend/db/database/`)
- Auth: JWT (`/api/auth/login`, `/api/auth/me`)
- Proxy dev frontend: `/api` -> `http://localhost:3002`

## Estructura del repositorio

- `backend/`: rutas, servicios, repositorios, scripts y pruebas de API
- `frontend/`: aplicacion web y pruebas de UI/hooks
- `docs/`: catalogos y documentos de referencia del negocio
- `documentos/` y `facturas/`: almacenamiento local operativo (no versionado)

## Documentacion funcional

- `docs/requerimientos_vigentes.md`: resumen funcional vigente y alineado al sistema actual.
- `docs/REQUERIMIENTOS.md`: levantamiento inicial conservado como referencia historica.
- `docs/arquitectura/`: alcance, estados, permisos y decisiones de arquitectura que complementan el estado actual.
- `docs/despliegue_checklist.md`: checklist manual de despliegue para staging/produccion.

## Requisitos

- Node.js 20 o superior (recomendado)
- npm 10 o superior (recomendado)
- PostgreSQL 14 o superior (recomendado)

## Inicio rapido

1. Clonar el repositorio y entrar a la raiz.

2. Instalar backend:

```bash
cd backend
npm install
cd ..
```

3. Instalar frontend:

```bash
cd frontend
npm install
cd ..
```

4. Copiar `backend/.env.example` a `backend/.env` y ajustar DB/JWT segun tu entorno.

5. Crear la base (si no existe):

```bash
psql -U postgres -f backend/db/database/01_create_db.sql
```

6. Inicializar schema y seed (destructivo sobre `public`):

```bash
cd backend
npm run db:reset
cd ..
```

7. Levantar backend:

```bash
cd backend
npm run dev
```

8. Levantar frontend en otra terminal:

```bash
cd frontend
npm run dev
```

9. Abrir `http://localhost:5173`.

## Credenciales iniciales

El seed crea usuarios base para varios roles. Cuenta ejemplo:

- Email: `admin@novogar.local`
- Password: `Novogar2026!`

## Variables de entorno

El backend carga `backend/.env` y `backend/.env.local` si existen. Variables usadas por la app:

- `DB_HOST` o `PGHOST` (default dev: `localhost`)
- `DB_PORT` o `PGPORT` (default dev: `5432`)
- `DB_USER` o `PGUSER` (default dev: `postgres`)
- `DB_PASSWORD` o `PGPASSWORD` (default dev: `admin`)
- `DB_NAME` o `PGDATABASE` (default dev: `novogar_db`)
- `PORT` (default: `3002`)
- `JWT_SECRET` (default solo en dev/test: `dev-secret`; en `production` es obligatorio definirlo)
- `JWT_EXPIRES_IN` (default: `8h`)
- `BCRYPT_ROUNDS` (default: `12`)
- `FACTURAS_BASE_DIR` (default: raiz del repo)
- `JSON_BODY_LIMIT` (default: `20mb`)
- `PERMISSIONS_CACHE_TTL_MS` (default: `60000`)
- `TABLAS_PAGO_MAX_FILE_MB` (default: `10`)
- `ORDENES_COMPRA_MAX_FILE_MB` (default: `10`)
- `RESERVAS_DOC_MAX_FILE_MB` (default: `15`)
- `WATCHER_SCAN_DEBOUNCE_MS` (default: `600`)
- `WATCHER_LATE_FILES_DELAY_MS` (default: `2000`)
- `WATCHER_AWF_STABILITY_MS` (default: `2000`)
- `WATCHER_AWF_POLL_MS` (default: `100`)

## Entorno para Codex

Para sesiones recurrentes con Codex o agentes similares:

- La guia operativa del repo vive en `AGENTS.md`.
- Hay un chequeo rapido de herramientas y convenciones en `scripts/setup-codex-env.ps1`.
- La guia detallada del entorno vive en `docs/codex_entorno.md`.

Ejemplo:

```powershell
.\scripts\setup-codex-env.ps1
```

Si quieres que el script agregue el repo a `git safe.directory`:

```powershell
.\scripts\setup-codex-env.ps1 -ConfigureGitSafeDirectory
```

## Convenciones de idioma

La consistencia objetivo del proyecto no es "traducir todo al ingles". La UI, los flujos operativos y la documentacion funcional siguen en espanol, mientras que el codigo usa ingles para la estructura tecnica y conserva en espanol los terminos de dominio que ya son canonicos en el negocio, por ejemplo `factura`, `tramite`, `sociedad` y `proveedor`.

La guia detallada vive en `docs/convenciones_idioma_codigo.md`. La regla practica para trabajo nuevo es: no mezclar sinonimos para el mismo concepto dentro del mismo modulo y no hacer renombrados masivos solo por traduccion si eso rompe contratos, migrations o legibilidad del dominio.

## Principios transversales

Las decisiones que deben mantenerse visibles durante todo el desarrollo viven en `docs/principios_transversales.md`.

Por ahora el principio operativo mas importante es `multicurrency-first`: no mezclar montos entre monedas, siempre mostrar la moneda junto al monto y modelar agregados financieros por divisa.

## Scripts

### Backend (`backend/package.json`)

- `npm run dev`: iniciar API
- `npm run test`: pruebas con Jest
- `npm run test:ci`: baseline CI en backend (`runInBand`)
- `npm run db:init`: ejecutar schema si `public` esta vacio
- `npm run db:reset`: reconstruir schema desde cero
- `npm run db:check`: validar estructura actual
- `npm run db:migrate:proveedores`
- `npm run db:migrate:retenciones`
- `npm run db:migrate:tramites-retenciones`
- `npm run db:migrate:pagos-parciales`
- `npm run importar`: importacion por XML
- `npm run watcher`: watcher de XML
- `npm run diagnostico`
- `npm run reporte-duplicados`
- `npm run reset-docs`

### Frontend (`frontend/package.json`)

- `npm run dev`: levantar Vite
- `npm run build`: build de produccion
- `npm run test`: pruebas con Node test runner
- `npm run test:ci`: baseline CI estable de frontend
- `npm run lint`: lint con ESLint
- `npm run preview`: previsualizar build

## API base

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard/stats`
- `GET /api/facturas`
- `GET /api/notas-credito`
- `GET /api/tiquetes-electronicos`
- `GET /api/tramites-pago`

La mayoria de endpoints requieren `Authorization: Bearer <token>`.

## Pruebas

Backend:

```bash
cd backend
npm test
```

Frontend:

```bash
cd frontend
npm test
```

## Roadmap

- Expandir la validacion centralizada de entorno a scripts y casos operativos secundarios.
- Expandir la CI baseline para cubrir mas suites de frontend y chequeos de release.
- Incluir capturas y flujos por rol en documentacion.

## Notas operativas

- `npm run db:reset` elimina y recrea `public`.
- Antes de produccion, definir credenciales de DB y `JWT_SECRET` reales en variables de entorno.
- El repo ya incluye una CI minima en `.github/workflows/ci.yml`.
- El `.gitignore` excluye dependencias, temporales y datos operativos locales.
- El historial activo de estados usa tablas dedicadas por dominio; las referencias a `estados_documento` quedan solo en SQL legacy conservado como historial tecnico.
