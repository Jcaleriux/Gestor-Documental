# Entorno Codex Para Proyecto Novogar

Esta guia aterriza como trabajar con Codex en este repo sin depender de memoria o instrucciones repetidas en cada sesion.

## 1. Configuracion Completa Del Entorno Codex

### Que es la configuracion en este repo

La configuracion de Codex para `Proyecto Novogar` no es un archivo magico unico. Es la combinacion de:

- la guia operativa en `AGENTS.md`,
- el script `scripts/setup-codex-env.ps1`,
- la estructura real del repo,
- y las convenciones del proyecto ya documentadas en `docs/`.

### Base tecnica del proyecto

- Sistema operativo actual: Windows + PowerShell
- Repo root: `C:\Jose\Proyecto Novogar`
- Backend: Node.js + Express + PostgreSQL
- Frontend: React + Vite
- Puerto backend por defecto: `3002`
- Puerto frontend dev por defecto: `5173`
- Proxy frontend: `/api` -> `http://localhost:3002`

### Herramientas recomendadas

- `git`
- `node` 20+
- `npm` 10+
- `PostgreSQL` 14+
- `psql`
- `gh` para PRs y trabajo continuo con GitHub

### Archivos clave para Codex

- `AGENTS.md`: reglas del repo, convenciones de idioma, validaciones y politica de autonomia para refactors SOLID.
- `scripts/setup-codex-env.ps1`: chequeo de herramientas, bootstrap de dependencias y atajos de entorno.
- `README.md`: arranque general del proyecto.
- `docs/convenciones_idioma_codigo.md`: mezcla correcta de ingles tecnico y dominio en espanol.
- `docs/principios_transversales.md`: principios de negocio que nunca deben romperse.
- `docs/despliegue_checklist.md`: checklist manual para staging/produccion.
- `.github/workflows/ci.yml`: baseline minima de build/tests automatizados.

Nota de arquitectura vigente:

- `estados_documento` ya no forma parte del schema runtime actual.
- El runtime backend debe usar `facturas_estado_documental_historial`, `facturas_workflow_pago_historial` y `facturas_estado_mixto_historial`.
- Las referencias restantes a `estados_documento` viven solo en migraciones SQL legacy conservadas como historial.

### Variables y configuracion real

El backend ya carga `backend/.env` y `backend/.env.local` de forma automatica. Si no se definen variables, el entorno de desarrollo conserva defaults compatibles con la instalacion local actual:

- `DB_HOST` o `PGHOST`: `localhost`
- `DB_PORT` o `PGPORT`: `5432`
- `DB_USER` o `PGUSER`: `postgres`
- `DB_PASSWORD` o `PGPASSWORD`: `admin`
- `DB_NAME` o `PGDATABASE`: `novogar_db`

Ademas, el backend ya soporta variables utiles:

- `PORT`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `BCRYPT_ROUNDS`
- `FACTURAS_BASE_DIR`
- `JSON_BODY_LIMIT`
- `PERMISSIONS_CACHE_TTL_MS`
- `TABLAS_PAGO_MAX_FILE_MB`
- `ORDENES_COMPRA_MAX_FILE_MB`
- `RESERVAS_DOC_MAX_FILE_MB`
- `WATCHER_SCAN_DEBOUNCE_MS`
- `WATCHER_LATE_FILES_DELAY_MS`
- `WATCHER_AWF_STABILITY_MS`
- `WATCHER_AWF_POLL_MS`

La validacion central de runtime ahora vive en `backend/config/runtime.js` para `PORT`, `FACTURAS_BASE_DIR`, `JSON_BODY_LIMIT`, limites operativos y configuracion del watcher.

Notas de seguridad:

- `JWT_SECRET` puede caer a `dev-secret` solo en `development` y `test`.
- En `production`, el backend exige `JWT_SECRET` explicito y configuracion de DB explicita.

### Como se usa Codex con autonomia

La politica actual del repo es:

- si el cambio es estructural y no rompe contratos, Codex puede avanzar solo,
- si toca schema, payloads, permisos o reglas de negocio, debe escalarlo,
- el trabajo se hace por slices pequenos con commit y push por bloque estable.

Eso ya esta formalizado en `AGENTS.md`.

## 2. Script De Setup

### Archivo

- `scripts/setup-codex-env.ps1`

### Que hace

- detecta `git`, `node`, `npm` y `gh`,
- muestra versiones y rutas,
- puede agregar el repo a `git safe.directory`,
- puede revisar autenticacion de GitHub CLI,
- puede instalar dependencias de `backend/` y `frontend/`,
- puede correr el build del frontend,
- y recuerda los comandos utiles del proyecto.

### Ejemplos de uso

Chequeo rapido:

```powershell
.\scripts\setup-codex-env.ps1
```

Agregar `safe.directory` e instalar dependencias:

```powershell
.\scripts\setup-codex-env.ps1 -ConfigureGitSafeDirectory -InstallProjectDependencies
```

Revisar `gh` y probar build frontend:

```powershell
.\scripts\setup-codex-env.ps1 -CheckGhAuth -BuildFrontend
```

### Que no hace a proposito

- no modifica la configuracion de PostgreSQL,
- no corre `npm run db:reset`,
- no crea ni destruye datos,
- no intenta inventar secretos o credenciales.

Eso es deliberado, porque en este repo esas acciones tienen riesgo operativo.

## 3. Comandos Para Correr El Proyecto

### Instalacion inicial

```powershell
cd C:\Jose\Proyecto Novogar\backend
npm install
cd ..\frontend
npm install
```

Antes de levantar el backend, copiar `backend/.env.example` a `backend/.env` y ajustar DB/JWT segun el entorno.

### Crear base de datos

```powershell
cd C:\Jose\Proyecto Novogar
psql -U postgres -f backend\db\database\01_create_db.sql
```

### Inicializar schema y seed

```powershell
cd C:\Jose\Proyecto Novogar\backend
npm run db:reset
```

Nota: este comando es destructivo sobre `public`.

### Levantar backend

```powershell
cd C:\Jose\Proyecto Novogar\backend
npm run dev
```

### Levantar frontend

```powershell
cd C:\Jose\Proyecto Novogar\frontend
npm run dev
```

### Build de frontend

```powershell
cd C:\Jose\Proyecto Novogar\frontend
npm run build
```

### Tests backend

```powershell
cd C:\Jose\Proyecto Novogar\backend
npm test
```

### Tests frontend

```powershell
cd C:\Jose\Proyecto Novogar\frontend
npm test
```

### Tests puntuales utiles

```powershell
cd C:\Jose\Proyecto Novogar\frontend
node tests/hooks/useAppSession.test.js
node tests/hooks/useFacturas.test.js
node tests/facturas/facturasPageHelpers.test.js
```

```powershell
cd C:\Jose\Proyecto Novogar\backend
node node_modules/jest/bin/jest.js --runInBand __tests__/reservasUseCases.test.js
```

## 4. Posibles Errores Que Podrian Pasar

### PostgreSQL no levanta o credenciales no coinciden

Sintoma:

- el backend no conecta,
- fallan endpoints que leen DB,
- o `db:reset` falla.

Causa probable:

- `backend/.env`, `backend/.env.local` o las variables del sistema no coinciden con la base real.
- Si no hay variables definidas, el fallback dev espera `localhost:5432`, usuario `postgres`, password `admin`, base `novogar_db`.

### `psql` no existe en PATH

Sintoma:

- falla el paso de crear la base o correr SQL manual.

Causa probable:

- PostgreSQL esta instalado pero las herramientas CLI no estan expuestas en PATH.

### Backend corre, frontend no responde bien

Sintoma:

- la UI carga pero las consultas fallan,
- aparecen errores de red o 401.

Causa probable:

- backend no esta en `http://localhost:3002`,
- token JWT vencido o sesion invalida,
- proxy de Vite depende de esa URL exacta.

### Documentos o previews no aparecen

Sintoma:

- rutas `/files/...` fallan,
- previews vacios,
- operaciones sobre archivos no encuentran documentos.

Causa probable:

- `FACTURAS_BASE_DIR` incorrecto,
- carpetas operativas locales faltantes,
- o datos reales no existen en la maquina.

### `git` marca el repo como no seguro

Sintoma:

- errores de ownership o `safe.directory`.

Causa probable:

- Windows/Git detecta el repo como no confiable.

Solucion:

```powershell
.\scripts\setup-codex-env.ps1 -ConfigureGitSafeDirectory
```

### `gh` no aparece aunque esta instalado

Sintoma:

- `gh` no se reconoce en la terminal.

Causa probable:

- terminal vieja sin refrescar `PATH`.

Solucion:

- abrir una terminal nueva,
- o ejecutar el script de setup para verificarlo.

### Tests frontend con `EPERM` en entornos restringidos

Sintoma:

- ciertos runners o sandboxes bloquean procesos hijos.

Causa probable:

- limitaciones del entorno, no necesariamente del repo.

Solucion:

- correr tests puntuales con `node tests/...`,
- o ejecutar fuera del sandbox si aplica.

## 5. Recomendaciones De Mejora Del Proyecto

### Expandir validacion de entorno y CI

La configuracion principal ya salio del codigo sensible y existe una CI baseline, pero todavia conviene ampliar cobertura a mas scripts, mas suites frontend y chequeos de release.

Impacto:

- menos sorpresas al mover el proyecto entre maquinas,
- mejor trazabilidad de configuracion en CI y produccion,
- menos riesgo de dejar fuera checks importantes al crecer el repo.

### Agregar bootstrap raiz del repo

Hoy hay setup por script y paquetes separados, pero no un `package.json` raiz con comandos tipo:

- `npm run setup`
- `npm run dev:backend`
- `npm run dev:frontend`

Impacto:

- onboarding mas simple,
- menos pasos manuales,
- mejor automatizacion.

### Agregar `docker-compose` para PostgreSQL

El mayor punto fragil del entorno local es la base.

Impacto:

- elimina drift entre maquinas,
- facilita entornos nuevos,
- reduce errores de credenciales y puertos.

### Agregar CI minima

Minimo recomendado:

- `frontend npm run build`
- `frontend npm test`
- `backend npm test`

Impacto:

- evita merges con regresiones basicas,
- da confianza para refactors SOLID desatendidos.

### Seguir aplicando SRP/SOLID por slices

La estrategia correcta ya se esta usando: no reescribir todo, sino atacar hotspots.

Siguientes candidatos naturales:

- `Tramites`
- `Dashboard`
- servicios backend grandes relacionados con facturas y tramites

Impacto:

- menos riesgo,
- mejor trazabilidad,
- mas autonomia segura para Codex.

### Reemplazar el README de Vite del frontend

`frontend/README.md` aun es boilerplate.

Impacto:

- menos confusion,
- mejor onboarding,
- documentacion mas alineada con la app real.
