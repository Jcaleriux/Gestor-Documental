# Backlog Actual

## Como usar este backlog

Este backlog debe contener trabajo vivo. No intentes meter aqui todo el pasado del proyecto.

Para contexto historico usa:

- `historico/README.md`
- `epics/EPIC-H-*`

## Estados sugeridos

- `Propuesto`
- `Refinamiento`
- `Ready`
- `En progreso`
- `Bloqueado`
- `Hecho`

## Prioridades sugeridas

- `P0`: riesgo o valor inmediato muy alto
- `P1`: importante para el siguiente bloque
- `P2`: importante pero no urgente
- `P3`: util, pero puede esperar

## Backlog vivo

| ID | Tipo | Pri | Estado | Epic | Resumen |
| --- | --- | --- | --- | --- | --- |
| FEAT-001 | feature | P1 | Hecho | EPIC-A-001 | Dashboard por rol con cola de trabajo real, nueva ruta `work-queue`, drill-downs compatibles a facturas/tramites y filtros URL iniciales |
| FEAT-002 | feature | P1 | Propuesto | EPIC-A-001 | Vista de aging y excepciones por moneda y sociedad |
| FEAT-003 | feature | P1 | Propuesto | EPIC-A-002 | Pulir transferencias y reemplazo documental en reservas |
| FEAT-004 | feature | P2 | Propuesto | EPIC-A-002 | Historial operativo mas claro para operaciones de reservas |
| TECH-001 | tech-debt | P1 | Hecho | EPIC-A-003 | Fase 13 completada: hooks de row actions, workflow state, `useTramites.js`, `Tramites.jsx`, `useReservaOperationDetails.js`, `useOrdenesCompraIngenieria.js`, `useTablasPagoIngenieria.js`, `App.jsx`, `useProtectedObjectUrl.js`, `CentrosCostoDistributionField.jsx`, `Facturas.jsx`, `NotasCredito.jsx`, `TiquetesElectronicos.jsx` y `TramiteProveedorGroup.jsx` saneados; regla `react-hooks/set-state-in-effect` reactivada globalmente |
| TECH-002 | tech-debt | P1 | Propuesto | EPIC-A-003 | Agregar smoke checks de dominio para dashboard, facturas, tramites y reservas |
| TECH-003 | tech-debt | P2 | Propuesto | EPIC-A-003 | Mejorar observabilidad minima de backend y errores operativos |
| TECH-004 | tech-debt | P0 | Hecho | EPIC-A-004 | Formalizar versionado del producto con VERSION, CHANGELOG y politica para la primera release `1.0.0` |
| TECH-005 | tech-debt | P1 | Hecho | EPIC-A-004 | Exponer version y commit del deploy en un punto tecnico visible |
| TECH-006 | tech-debt | P0 | Hecho | EPIC-A-004 | Dejar runbook mas explicito de backup y rollback antes del primer deployment productivo |
| TECH-007 | tech-debt | P0 | Hecho | EPIC-A-004 | Completar readiness productiva con secretos reales, smoke checks, evidencia de release y entorno local casi-productivo reproducible; preprod local en verde con readiness, backup plan y smoke checks de dominio documentados |
| FEAT-005 | feature | P2 | Propuesto | EPIC-A-001 | Dashboard gerencial por excepciones y aprobaciones relevantes |
| FEAT-006 | feature | P0 | Hecho | EPIC-A-005 | Parada obligatoria en `en_revision_tesoreria_1` tras gerencia y carga/reemplazo de un solo PDF de caratulas por tramite |
| FEAT-007 | feature | P0 | Hecho | EPIC-A-005 | Parser PDF y matching automatico/manual de caratulas por sociedad, proveedor y factura con bloqueo del flujo si quedan pendientes |
| FEAT-008 | feature | P1 | Hecho | EPIC-A-005 | Vista unificada agrupada por proveedor con preview PDF, warnings visibles y resolucion manual desde el detalle del tramite |

## Regla para agregar items nuevos

Todo item nuevo deberia responder al menos:

- que problema resuelve,
- a quien afecta,
- si toca backend, frontend o DB,
- si toca permisos o estados,
- y como se validaria.

## Regla para cerrar items

Un item no deberia pasar a `Hecho` si:

- no se sabe que valido,
- no se actualizo documentacion minima cuando hacia falta,
- o deja deuda tecnica nueva sin nombrarla.
