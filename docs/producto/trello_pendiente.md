# Trello Pendiente

Fecha de corte: 2026-05-13.

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

### EPIC-A-006 Perfil De Usuario Persistente Multiempresa

Estado sugerido: `Propuesto`

Objetivo: persistir preferencias y avatar de usuario en backend para que acompanen al usuario entre dispositivos, sobrevivan a borrar cache y puedan ser gestionados con validaciones, permisos y respaldo.

Tarjetas pendientes:

- `FEAT-009`

## Tarjetas Pendientes

### FEAT-002 Vista de aging y excepciones por moneda y sociedad

- Tipo: `feature`
- Prioridad: `P1`
- Estado inicial Trello: `Hecho`
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

### FEAT-009 Perfil de usuario persistente multiempresa

- Tipo: `feature`
- Prioridad: `P2`
- Estado inicial Trello: `Hecho`
- Epic: `EPIC-A-006`
- Area: perfil, usuarios, backend, frontend, storage, multiempresa

Problema:
La configuracion actual del usuario vive localmente en el navegador. Eso no alcanza para una experiencia multiempresa profesional porque se pierde al borrar cache, no viaja entre computadoras y no puede ser administrada ni respaldada por soporte.

Resultado esperado:
Perfil persistente con preferencias de usuario y avatar sincronizados desde backend, manteniendo fallback local mientras se migra.

Alcance sugerido:
- preferencias propias en backend (`theme_mode` inicialmente)
- avatar con storage seguro y metadata/ruta en DB
- endpoints `GET/PATCH /api/me/preferencias` y endpoints para avatar propio
- validacion de tipo/tamano de imagen
- permisos para perfil propio y gestion administrativa minima
- auditoria o historial minimo de cambios relevantes

Fuera de alcance inicial:
- modo oscuro completo
- guardar imagenes base64 en DB
- redisenar autenticacion o sesiones
- migrar storage documental operativo existente

Validacion sugerida:
Probar cambio de tema y avatar desde dos navegadores, borrar cache local y confirmar que el backend repone la configuracion; validar permisos, tamano/tipo de archivo, fallback a iniciales y eliminacion de avatar.

Implementado:
- migracion `20260702_0010_usuario_perfil_preferencias_avatar.sql`
- endpoints propios `GET/PATCH /api/me/preferencias` y `GET/PUT/DELETE /api/me/avatar`
- endpoint admin `DELETE /api/usuarios/:id/avatar`
- storage separado en `perfiles/avatares/{usuario_id}/`
- pruebas backend/frontend, lint y build en verde

### FEAT-010 Limpieza de marca SendaDocs independiente

- Tipo: `feature`
- Prioridad: `P1`
- Estado inicial Trello: `Hecho`
- Epic: `EPIC-A-007`
- Area: marca, runtime, tooling, frontend, backend, documentacion

Problema:
El producto ya se presenta como SendaDocs, pero runtime, tooling y documentos operativos conservaban rastros del nombre temporal anterior.

Resultado esperado:
Nombres SendaDocs consistentes en headers, llaves locales, variables de entorno, paquetes, seeds, scripts y documentacion operativa.

Implementado:
- headers `X-SendaDocs-*`
- variables `SENDADOCS_*`
- llaves `sendadocs.*` con migracion suave desde llaves legacy
- paquetes root/backend renombrados
- seed demo y scripts de preproduccion actualizados
- documentacion operativa/producto actualizada

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
