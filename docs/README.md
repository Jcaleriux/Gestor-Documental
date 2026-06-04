# Documentacion

Este directorio agrupa la documentacion funcional, tecnica, operativa e historica del proyecto.

## Entrada Principal

- `requerimientos_vigentes.md`: resumen funcional vigente y alineado al sistema actual.
- `principios_transversales.md`: principios de negocio que deben mantenerse, especialmente `multicurrency-first`.
- `convenciones_idioma_codigo.md`: reglas de idioma para codigo, dominio y documentacion.
- `codex_entorno.md`: guia operativa para trabajar con Codex en este repo.
- `proceso_crecimiento_scrum.md`: guia de trabajo para backlog, epics, deuda tecnica y Scrum ligero.

## Carpetas

- `arquitectura/`: estado actual, inventario, permisos y brechas/mejoras arquitectonicas.
- `tecnica/`: guia tecnica para desarrolladores, stack, capas, contratos, datos y validacion.
- `producto/`: vision de producto, goals, roadmap, backlog, tarjetas pendientes para Trello, releases, epics, sprints y templates.
- `operaciones/`: despliegue, preproduccion local, readiness, backup, rollback y demo.
- `integraciones/`: notas y scripts de apoyo para integraciones externas.
- `datos/`: plantillas, CSVs y estructuras de carga vigentes o de apoyo.
- `historico/`: levantamientos iniciales, diagnosticos, propuestas, migraciones ya aplicadas y exports conservados como referencia.
- `presentaciones/`: materiales HTML de presentacion.

## Regla Practica

Si un documento define comportamiento actual, debe vivir en la entrada principal, `arquitectura/`, `producto/` u `operaciones/`. Si conserva contexto pasado o una propuesta no vigente, debe vivir en `historico/`.
