# Release Readiness

## Objetivo

Dar una forma clara de responder:

- `¿Estamos listos para un release productivo?`
- `¿Que evidencia debemos guardar antes del deployment?`

Esta guia complementa:

- `docs/operaciones/despliegue_checklist.md`
- `docs/operaciones/runbook_backup_rollback.md`
- `docs/operaciones/preproduccion_local.md`
- `docs/producto/06_versionado_y_releases.md`

## Fase 1 Disponible Hoy

La Fase 1 deja tres piezas concretas:

1. ejemplo de entorno productivo en `backend/.env.production.example`
2. helper de backup/rollback en `backend npm run release:backup-plan`
3. reporte de readiness en `backend npm run release:readiness`

Ademas, para validar `TECH-007` en esta misma PC, ya existe una ruta de `preproduccion local` con:

- `backend/.env.production.local`
- `backend npm run preprod:setup`
- `backend npm run preprod:readiness`
- `backend npm run preprod:smoke`
- `backend npm run preprod:start`

## Reporte De Readiness

Para generar un reporte base:

```bash
cd backend
npm run release:readiness
```

Si quieres evaluar un archivo de entorno especifico:

```bash
cd backend
node scripts/release_readiness_report.js --env-file .env.production.local
```

Si quieres evidencia JSON:

```bash
cd backend
node scripts/release_readiness_report.js --env-file .env.production.local --json
```

## Que Evalua

El reporte revisa:

- version objetivo en `VERSION`
- menciones de la version en `CHANGELOG.md`
- release checks backend
- plan de backup y rollback heredado de `TECH-006`
- estado de migraciones
- claves minimas del entorno productivo
- placeholders o defaults inseguros
- deteccion de `pg_dump` y `pg_restore`, incluyendo `PG_BIN_DIR` si PostgreSQL no esta en `PATH`
- y smoke checklist sugerido para el deployment

Complemento recomendado:

- validar `GET /api/release-info`
- y revisar los headers `X-SendaDocs-Release-*` en `/api/health`
- correr smoke checks de dominio con `backend npm run release:smoke` o `backend npm run preprod:smoke`

## Que Debe Salir Bien

Idealmente deberias aspirar a:

- `Ready para produccion: si`
- sin placeholders en secretos
- sin migraciones pendientes
- sin tooling critico faltante para backup DB
- y con rutas de storage reales validadas

## Evidencia Minima Del Release

Antes del deployment productivo, guarda como minimo:

- version
- commit
- changelog del corte
- release readiness report
- release backup plan
- dump validado de DB
- evidencia de smoke checks
- y cualquier migracion aplicada

## Residual De Esta Fase

Esta fase no mete secretos reales al repo ni automatiza el deployment.

Eso es deliberado.

Lo que si deja:

- una forma repetible de medir readiness
- una evidencia exportable en JSON
- un camino concreto para ensayar release en esta misma PC
- y un checklist mucho mas operativo para el primer release real
