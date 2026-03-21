# EPIC-H-001 Desacople Entre Workflow Y Estado De Factura

## Estado

Cerrado

## Problema original

El workflow de tramites de pago escribia `facturas.estado`, mientras dashboard, filtros y reportes consumian esa misma columna como si fuera estado documental.

Eso mezclaba dos dominios:

- estado documental
- estado de workflow

## Resultado logrado

- `facturas.estado` quedo como estado documental
- el workflow de pago paso a storage y trazabilidad propios
- se limpiaron contaminaciones de datos de prueba
- se retiraron capas legacy intermedias del runtime

## Modulos impactados

- repositorios de tramites
- repositorios de facturas
- dashboard
- auditoria
- migraciones y esquema

## Riesgo retirado

- cambios de workflow ya no rompen lecturas documentales
- menor ambiguedad en reportes y filtros

## Leccion historica

Cuando dos dominios comparten una misma columna por conveniencia, tarde o temprano se rompen las lecturas y la capacidad de evolucionar.
