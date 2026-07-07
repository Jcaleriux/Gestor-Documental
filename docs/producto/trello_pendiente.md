# Trello Pendiente

Fecha de corte: 2026-07-07.

Este archivo contiene solo trabajo vivo para cargar en Trello. No incluye epics, features o tech-debt ya marcados como `Hecho`.

## Listas Sugeridas En Trello

- Backlog
- Refinamiento
- Ready
- En progreso
- Bloqueado
- Hecho

## Labels Sugeridos

- `feature`
- `tech-debt`
- `P0`
- `P1`
- `P2`
- `dashboard`
- `reservas`
- `operacion`
- `backend`
- `frontend`
- `reportes`
- `perfil`
- `multiempresa`
- `auth`
- `seguridad`
- `onboarding`

## Epics Vivos

### EPIC-A-001 Dashboard Y Reporteria Operativa

Estado sugerido: `Activo`

Objetivo: hacer que dashboard, listados y reporteria ayuden mejor a decidir y actuar por rol, sociedad, moneda y excepciones operativas.

Tarjetas pendientes:

- `FEAT-002`
- `FEAT-005`

### EPIC-A-002 Reservas, Operaciones Y Documentos

Estado sugerido: `Propuesto`

Objetivo: pulir operaciones de reservas donde se cruzan documentos, transferencias, reemplazos y trazabilidad.

Tarjetas pendientes:

- `FEAT-003`
- `FEAT-004`

### EPIC-A-003 Hardening Frontend Y Operacion

Estado sugerido: `Activo`

Objetivo: mantener el proyecto facil de evolucionar, con menos hotspots, mejores smoke checks y mas confianza operativa.

Tarjetas pendientes:

- `TECH-002`
- `TECH-003`

## Tarjetas Pendientes

### FEAT-002 Vista de aging y excepciones por moneda y sociedad

- Tipo: `feature`
- Prioridad: `P1`
- Estado inicial Trello: `Backlog`
- Epic: `EPIC-A-001`
- Area: dashboard, reportes

Problema:
El dashboard todavia puede mostrar mejor documentos vencidos, por vencer o con excepciones operativas, sin mezclar monedas.

Resultado esperado:
Vista o bloque operativo que permita revisar aging y excepciones por sociedad y moneda.

Validacion sugerida:
Comprobar filtros por sociedad/moneda, montos separados por divisa y drill-down a documentos/tramites relacionados.

### FEAT-005 Dashboard gerencial por excepciones y aprobaciones relevantes

- Tipo: `feature`
- Prioridad: `P2`
- Estado inicial Trello: `Backlog`
- Epic: `EPIC-A-001`
- Area: dashboard, gerencia

Problema:
Gerencia necesita una lectura mas fina de aprobaciones relevantes y excepciones de alto impacto.

Resultado esperado:
Bloques o vista gerencial orientada a aprobaciones, riesgos y excepciones importantes.

Validacion sugerida:
Revisar visibilidad por rol, permisos, moneda y sociedades asignadas.

### FEAT-003 Pulir transferencias y reemplazo documental en reservas

- Tipo: `feature`
- Prioridad: `P1`
- Estado inicial Trello: `Backlog`
- Epic: `EPIC-A-002`
- Area: reservas, documentos, operacion

Problema:
Las operaciones de reservas cruzan datos, documentos y acciones sensibles. Conviene reducir friccion y errores.

Resultado esperado:
Transferencias y reemplazos documentales con mejor UX, validaciones y feedback.

Validacion sugerida:
Probar flujo feliz, errores esperados, permisos y trazabilidad de la operacion.

### FEAT-004 Historial operativo mas claro para operaciones de reservas

- Tipo: `feature`
- Prioridad: `P2`
- Estado inicial Trello: `Backlog`
- Epic: `EPIC-A-002`
- Area: reservas, trazabilidad

Problema:
El historial de reservas puede ser mas claro para soporte, auditoria operativa y seguimiento.

Resultado esperado:
Historial con eventos mas legibles, contexto suficiente y mejor lectura por usuario operativo.

Validacion sugerida:
Ejecutar operaciones de reserva y confirmar que el historial explica que paso, quien actuo y cuando.

### TECH-002 Agregar smoke checks de dominio

- Tipo: `tech-debt`
- Prioridad: `P1`
- Estado inicial Trello: `Backlog`
- Epic: `EPIC-A-003`
- Area: backend, operacion, release

Problema:
La confianza de release mejora si los dominios criticos tienen smoke checks repetibles.

Resultado esperado:
Smoke checks para dashboard, facturas, tramites y reservas, alineados con los scripts existentes.

Validacion sugerida:
Ejecutar smoke checks en entorno local/preprod y documentar resultado esperado.

### TECH-003 Mejorar observabilidad minima de backend y errores operativos

- Tipo: `tech-debt`
- Prioridad: `P2`
- Estado inicial Trello: `Backlog`
- Epic: `EPIC-A-003`
- Area: backend, soporte, operacion

Problema:
Soporte y debugging necesitan mejores senales cuando algo falla en runtime.

Resultado esperado:
Logs/errores mas utiles para endpoints criticos, sin introducir tooling pesado innecesario.

Validacion sugerida:
Forzar errores controlados y confirmar que la respuesta al usuario y los logs ayudan a diagnosticar.

## No Cargar En Trello Como Pendiente

Estos items ya estan cerrados o son historicos:

- `FEAT-001`
- `FEAT-006`
- `FEAT-007`
- `FEAT-008`
- `FEAT-009`
- `FEAT-010`
- `FEAT-011`
- `TECH-001`
- `TECH-004`
- `TECH-005`
- `TECH-006`
- `TECH-007`
- `EPIC-H-*`
- `EPIC-A-004`
- `EPIC-A-008`
