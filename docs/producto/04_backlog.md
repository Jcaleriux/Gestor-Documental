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
| FEAT-001 | feature | P1 | Ready | EPIC-A-001 | Widgets de dashboard por rol con foco en cola de trabajo real |
| FEAT-002 | feature | P1 | Propuesto | EPIC-A-001 | Vista de aging y excepciones por moneda y sociedad |
| FEAT-003 | feature | P1 | Propuesto | EPIC-A-002 | Pulir transferencias y reemplazo documental en reservas |
| FEAT-004 | feature | P2 | Propuesto | EPIC-A-002 | Historial operativo mas claro para operaciones de reservas |
| TECH-001 | tech-debt | P1 | Ready | EPIC-A-003 | Sanear patrones de estado en efectos de UI para reactivar la regla de lint hoy apagada |
| TECH-002 | tech-debt | P1 | Propuesto | EPIC-A-003 | Agregar smoke checks de dominio para dashboard, facturas, tramites y reservas |
| TECH-003 | tech-debt | P2 | Propuesto | EPIC-A-003 | Mejorar observabilidad minima de backend y errores operativos |
| TECH-004 | tech-debt | P0 | Hecho | EPIC-A-004 | Formalizar versionado del producto con VERSION, CHANGELOG y politica para la primera release `1.0.0` |
| TECH-005 | tech-debt | P1 | Propuesto | EPIC-A-004 | Exponer version y commit del deploy en un punto tecnico visible |
| TECH-006 | tech-debt | P0 | Propuesto | EPIC-A-004 | Dejar runbook mas explicito de backup y rollback antes del primer deployment productivo |
| TECH-007 | tech-debt | P0 | Propuesto | EPIC-A-004 | Completar readiness productiva con secretos reales, smoke checks y evidencia de release |
| FEAT-005 | feature | P2 | Propuesto | EPIC-A-001 | Dashboard gerencial por excepciones y aprobaciones relevantes |

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
