# Preproduccion Local En Esta PC

## Objetivo

Montar un entorno `casi productivo` en esta misma PC sin mezclarlo con el entorno normal de desarrollo.

La idea es separar:

- puerto
- base de datos
- storage operativo
- archivo de entorno

## Que Si Es

- un ensayo serio de release en la misma maquina
- un entorno para validar `TECH-007`
- una forma de correr backend con `NODE_ENV=production` y rutas separadas

## Que No Es

- produccion final
- sustituto del readiness final en otro servidor si luego despliegas fuera de esta PC
- una automatizacion completa de deployment

## Componentes Del Entorno

- archivo de entorno: `backend/.env.production.local`
- backend en puerto `3302`
- DB sugerida: `novogar_preprod`
- storage local separado: `runtime/preprod/`

## Preparacion Inicial

1. Crear la base del entorno:

```bash
cd backend
npm run preprod:setup
```

Esto hace dos cosas:

- crea `backend/.env.production.local` si no existe
- crea `runtime/preprod/documentos` y `runtime/preprod/facturas`

2. Editar `backend/.env.production.local` y reemplazar al menos:

- `DB_PASSWORD`
- `JWT_SECRET`
- `DB_NAME` si quieres otro nombre distinto a `novogar_preprod`
- `PG_BIN_DIR` si `pg_dump` y `pg_restore` no estan en `PATH`

3. Crear o confirmar la base separada.

Ejemplo manual:

```bash
createdb -U postgres novogar_preprod
```

O con `psql`:

```bash
psql -U postgres -c "CREATE DATABASE novogar_preprod;"
```

## Base De Datos

Para revisar estructura del entorno:

```bash
cd backend
npm run preprod:db:check
```

Si la base `novogar_preprod` esta vacia, inicializar primero:

```bash
cd backend
npm run preprod:db:init
```

Para aplicar migraciones:

```bash
cd backend
npm run preprod:db:migrate
```

## Readiness Y Backup

Para evaluar readiness del entorno local casi-productivo:

```bash
cd backend
npm run preprod:readiness
```

Para ejecutar smoke checks de dominio sobre ese mismo entorno:

```bash
cd backend
npm run preprod:smoke
```

Para preparar el plan de backup/rollback sobre ese mismo entorno:

```bash
cd backend
npm run preprod:backup-plan
```

## Arranque

### Backend

```bash
cd backend
npm run preprod:start
```

### Frontend

Generar build y servirlo en modo preview local:

```bash
cd frontend
npm run build
npm run preprod:preview
```

Nota:

- el frontend preview no reemplaza un reverse proxy real
- pero sirve muy bien para un ensayo local de release

## Validaciones Minimas

- `http://localhost:3302/api/health` responde `200`
- `GET /api/release-info` expone version y commit
- login funciona
- dashboard carga
- facturas cargan
- tramites cargan
- preview/descarga de documentos funciona contra `runtime/preprod`

## Regla De Oro

No reusar para preproduccion local:

- la misma DB del entorno dev
- el mismo `JWT_SECRET`
- el mismo storage operativo de desarrollo

La gracia del entorno casi-productivo es poder fallar aqui sin contaminar el entorno diario.

## Estado Alcanzado En Esta PC

En esta maquina ya se comprobo que el perfil `preprod` puede llegar a:

- readiness en verde
- login operativo
- `GET /api/health`
- `GET /api/auth/me`

Eso sirve como evidencia local fuerte, aunque si en el futuro se despliega en otro servidor, el readiness final debe repetirse alla.
