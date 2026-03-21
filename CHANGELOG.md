# Changelog

Este proyecto usa `SemVer`.

Regla actual:

- `VERSION` define la version objetivo del producto en el repo.
- El tag Git oficial se crea sobre el commit exacto que realmente se libera o despliega a produccion.
- Hasta que eso ocurra, la version puede estar preparada en el repo sin que el tag exista todavia.

## [Unreleased]

### Planned first production release

- Target version: `1.0.0`
- Target Git tag when the first production deployment is confirmed: `v1.0.0`

### Foundation already completed before first production release

- workflow de pago desacoplado del estado documental
- migraciones versionadas como camino canonico
- configuracion sensible externalizada
- CI base con lint, build, tests y release checks
- estructura de backlog, epics y sprints dentro del repo
