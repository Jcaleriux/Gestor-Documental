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

### EPIC-A-008 Onboarding E Instalacion Segura

Estado sugerido: `Propuesto`

Objetivo: permitir instalaciones limpias sin usuarios demo por defecto, con primer admin creado desde la app, seed demo opcional y smoke checks sin credenciales hardcodeadas.

Tarjetas pendientes:

- `FEAT-011`

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

### FEAT-011 Onboarding inicial sin usuarios seed

- Tipo: `feature`
- Prioridad: `P0`
- Estado inicial Trello: `Refinamiento`
- Epic: `EPIC-A-008`
- Area: auth, onboarding, usuarios, backend, frontend, DB, operacion

Problema:
El seed normal crea usuarios demo con credenciales conocidas. Eso sirve para desarrollo o demo controlada, pero no debe ser el camino normal de una instalacion limpia.

Resultado esperado:
Una base nueva conserva catalogos base de roles/permisos, pero no crea usuarios demo por defecto. La app detecta que falta setup, permite crear el primer usuario `admin` desde UI, y despues obliga a iniciar sesion normalmente.

Alcance inicial:
- mantener roles, permisos y `roles_permisos` base en SQL
- separar usuarios demo hacia un seed demo opcional y explicito
- agregar `GET /api/onboarding/status` publico
- agregar `POST /api/onboarding/setup` publico solo cuando no exista admin/usuario activo
- crear el primer admin con `acceso_total` y password hasheada
- no exigir sociedades durante el setup inicial
- redirigir a login despues de crear el primer admin, sin autologin
- bloquear registro publico despues del setup
- actualizar smoke checks para no usar credenciales demo por defecto
- actualizar README, endpoints, demo guide y requerimientos vigentes

Fuera de alcance inicial:
- registro publico abierto
- administracion completa de roles/permisos desde UI
- permisos por usuario que sobreescriban el rol
- MFA o recuperacion de password
- preservar instalaciones de prueba existentes

Decisiones pendientes o a confirmar:
- definir comando/flujo exacto para ejecutar el seed demo opcional
- definir politica concreta de password fuerte
- convertir administracion avanzada de roles/permisos en una historia posterior

Validacion sugerida:
Probar una base limpia sin usuarios, completar setup, confirmar que el primer usuario queda como admin con `acceso_total`, iniciar sesion manualmente, crear sociedad desde la app, y verificar que el endpoint de setup queda bloqueado despues.

## No Cargar En Trello Como Pendiente

Estos items ya estan cerrados o son historicos:

- `FEAT-001`
- `FEAT-006`
- `FEAT-007`
- `FEAT-008`
- `FEAT-009`
- `FEAT-010`
- `TECH-001`
- `TECH-004`
- `TECH-005`
- `TECH-006`
- `TECH-007`
- `EPIC-H-*`
- `EPIC-A-004`
