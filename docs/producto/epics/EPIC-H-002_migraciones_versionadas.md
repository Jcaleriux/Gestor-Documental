# EPIC-H-002 Migraciones Versionadas Y Retiro Del Flujo Legacy

## Estado

Cerrado

## Problema original

El proyecto tenia multiples scripts `db:migrate:*` y wrappers puntuales, pero no un flujo unico y versionado para evolucionar schema entre entornos.

## Resultado logrado

- existe tabla `schema_migrations`
- existe baseline controlado sobre `00_init.sql`
- existe flujo canonico `npm run db:migrate`
- se retiraron wrappers y aliases legacy del camino operativo

## Modulos impactados

- `backend/db/`
- scripts de bootstrap y reset
- documentacion operativa

## Riesgo retirado

- menos drift de schema
- menos caminos paralelos para cambios de DB
- mas claridad para releases y entornos nuevos

## Leccion historica

El modelo de migraciones no debe aparecer tarde ni coexistir indefinidamente con varios caminos manuales.
