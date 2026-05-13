# AS-IS Inventario Tecnico

## Estado

Este inventario describe la aplicacion actual como base unica de evolucion. Para el mapa consolidado vigente consultar `estado_actual.md`; para brechas y mejoras pendientes consultar `brechas_y_mejoras.md`.

## Resumen Del Estado Actual

El sistema actual ya tiene base funcional completa para documentos, workflow de pagos, seguridad, reservas, reportes y operacion.

La deuda original de mayor riesgo era el acoplamiento entre workflow y `facturas.estado`. Esa deuda quedo cerrada como epic historico de producto (`EPIC-H-001`): el workflow de pago paso a storage y trazabilidad propios, y `facturas.estado` queda como estado documental.

## Stack Actual

1. Backend: Node.js + Express (CommonJS).
2. Frontend: React + Vite.
3. DB: PostgreSQL.
4. Acceso DB: `pg` con SQL directo en repositorios.
5. Auth: JWT + middleware de permisos.

Referencias:

- `backend/db/index.js`
- `backend/app.js`
- `backend/db/database/00_init.sql`

## Rutas Backend Activas

Registradas en `backend/app.js`:

1. `auth`
2. `comentarios`
3. `versiones`
4. `auditoria`
5. `tramitesPago`
6. `contabilizacion`
7. `dashboard`
8. `facturas`
9. `files`
10. `usuarios`
11. `sociedades`
12. `proveedores`
13. `tablasPago`
14. `ordenesCompra`

## Modelo De Datos Actual

Documentos:

- `facturas`
- `notas_credito`
- `tiquetes_electronicos`
- `mensajes_hacienda`

Contabilizacion y pagos:

- `facturas_contabilizacion`
- `facturas_contabilizacion_documentos_respaldo`
- `facturas_retenciones_pagos`
- `facturas_pagos`
- `tablas_pago`
- `ordenes_compra`
- `proveedores`
- `centros_costo`

Workflow pagos:

- `tramites_pago`
- `tramites_pago_documentos`
- `tramites_pago_documentos_aprobadores`
- `tramites_pago_retenciones`
- `tramites_pago_historial`
- `tramites_pago_caratulas`
- `tramites_pago_caratulas_proveedor`
- `tramites_pago_caratulas_proveedor_facturas`
- `tramites_pago_caratulas_huerfanas`

Seguridad:

- `usuarios`
- `roles`
- `permisos`
- `roles_permisos`
- `usuarios_sociedades`
- `sociedades`

Trazabilidad y soporte operativo:

- `auditoria`
- `schema_migrations`
- `facturas_workflow_pago_estado`
- `facturas_estado_documental_historial`
- `facturas_workflow_pago_historial`
- `facturas_estado_mixto_historial`
- `comentarios_documento`
- `versiones_documento`
- `reservas_unidades`
- `reservas_operaciones`
- `reservas_operaciones_historial`
- `reservas_operaciones_documentos`

## Fortalezas Reutilizables

1. Buen uso de transacciones (`withTransaction`) en flujos sensibles.
2. Separacion razonable entre rutas, servicios/use cases y repositorios.
3. Restricciones SQL existentes: FK, CHECK, UNIQUE e indices.
4. Migraciones versionadas con tracking en `schema_migrations`.
5. Permisos y sociedades como parte central del modelo de acceso.
6. Documentacion de release, backup, rollback y preproduccion local.

## Brechas Vigentes

1. Falta consolidar contratos HTTP formales para endpoints criticos.
2. Falta observabilidad mas estructurada: correlation id, logs y metricas operativas.
3. Falta ampliar smoke checks de dominio para dashboard, facturas, tramites y reservas.
4. La ingesta por correo existe como apoyo tecnico, pero no como modulo productizado end-to-end.
5. El dashboard por rol y reportes de excepciones aun pueden ser mas accionables.
6. No existe una tabla canonica unica `documentos`; por ahora no es prioridad migrar si no hay necesidad clara de producto o reporting.

## Riesgos A Vigilar

1. Reintroducir dependencias ambiguas entre estado documental y workflow.
2. Mezclar monedas en reportes o dashboards.
3. Cambiar contratos HTTP o permisos como parte de refactors internos.
4. Mover reglas de negocio al frontend.
5. Hacer refactors amplios sin validacion por slice.

## Acciones Recomendadas

1. Mantener `estado_actual.md` como fuente de lectura vigente.
2. Usar `brechas_y_mejoras.md` para priorizar mejoras evolutivas.
3. Atacar deuda tecnica desde `docs/producto/04_backlog.md`.
4. Crear ADRs solo para decisiones con impacto amplio.
5. Mantener los documentos de rebuild en historico, no como plan activo.
