# EPIC-A-007 Independencia De Marca SendaDocs

## Estado

Implementado

## Problema

El producto ya opera como SendaDocs, pero todavia existian rastros tecnicos y documentales del nombre temporal anterior. Eso debilitaba la posibilidad de instalar la plataforma en otras empresas como un producto independiente.

## Resultado esperado

SendaDocs debe tener nombres consistentes en runtime, tooling, headers, llaves locales, seeds y documentacion operativa, sin romper sesiones existentes ni compatibilidad basica de despliegues locales.

## Alcance implementado

- paquetes root/backend renombrados a SendaDocs
- headers tecnicos `X-SendaDocs-*` para release y descargas parciales
- variables `SENDADOCS_*` para release, QA y proxy frontend
- llaves de localStorage nuevas `sendadocs.*`
- migracion suave desde llaves locales legacy a llaves SendaDocs
- seed demo y scripts de preproduccion con nombres genericos
- documentacion operativa/producto actualizada a SendaDocs
- fallback interno para variables legacy cuando evita romper entornos ya configurados

## Fuera de alcance

- modificar backups, salidas generadas o evidencias historicas
- modificar migraciones ya aplicadas con checksum registrado
- renombrar la base de datos local existente
- cambiar rutas, permisos, payloads o tablas de dominio

## Validacion

- busqueda de rastros activos en source/tooling
- pruebas frontend/backend focalizadas
- build frontend
- suite backend/frontend si aplica al cierre del slice
