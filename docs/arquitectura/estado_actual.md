# Estado Actual De Arquitectura

Fecha de referencia: 2026-05-13.

## Resumen

La aplicacion actual es una plataforma documental y operativa para facturas, notas de credito, tiquetes, mensajes de Hacienda, tramites de pago, usuarios, sociedades, proveedores, centros de costo, reservas y reportes.

El backend es Node.js + Express + PostgreSQL con SQL directo en repositorios. El frontend es React + Vite. Los documentos se almacenan en filesystem y la base de datos guarda rutas, metadata, estados, relaciones y trazabilidad.

## Capas Backend

- `routes`: contratos HTTP, middlewares y permisos.
- `services` / use cases: orquestacion de reglas de negocio.
- `repositories`: SQL y acceso a PostgreSQL.
- `domain`: constantes, estados, permisos e invariantes.
- `db`: conexion, transacciones, schema y migraciones.

## Modulos Principales

- Autenticacion y sesion: JWT, `/api/auth/login`, `/api/auth/me`.
- Seguridad: `usuarios`, `roles`, `permisos`, `roles_permisos`, `usuarios_sociedades`.
- Sociedades y acceso: filtrado por sociedades asignadas y permisos.
- Documentos fiscales: `facturas`, `notas_credito`, `tiquetes_electronicos`, `mensajes_hacienda`.
- Contabilizacion: `facturas_contabilizacion`, respaldos, proveedores, centros de costo, tablas de pago y ordenes de compra.
- Workflow de pago: `tramites_pago`, documentos del tramite, aprobadores, retenciones, historial, caratulas y pagos.
- Reservas: unidades, operaciones, historial y documentos.
- Trazabilidad: auditoria, comentarios, versiones documentales e historiales de estado.
- Reportes y dashboard: consultas operativas, totales por moneda y exportaciones.

## Modelo De Datos Actual

El schema actual no usa una tabla canonica unica `documentos`. Mantiene tablas por tipo documental:

- `facturas`
- `notas_credito`
- `tiquetes_electronicos`
- `mensajes_hacienda`

Para facturas existen tablas complementarias:

- `facturas_workflow_pago_estado`
- `facturas_estado_documental_historial`
- `facturas_workflow_pago_historial`
- `facturas_estado_mixto_historial`
- `facturas_contabilizacion`
- `facturas_contabilizacion_documentos_respaldo`
- `facturas_retenciones_pagos`
- `facturas_pagos`

El workflow de tramites vive en tablas propias:

- `tramites_pago`
- `tramites_pago_documentos`
- `tramites_pago_documentos_aprobadores`
- `tramites_pago_retenciones`
- `tramites_pago_historial`
- `tramites_pago_caratulas`
- `tramites_pago_caratulas_proveedor`
- `tramites_pago_caratulas_proveedor_facturas`
- `tramites_pago_caratulas_huerfanas`

## Flujo Documental Actual

1. La ingesta/importacion procesa XML, PDF y metadata.
2. El sistema identifica sociedad, proveedor y tipo documental.
3. Guarda registros por tipo documental y rutas a archivos en filesystem.
4. La factura puede enriquecerse con datos contables y respaldos.
5. Una factura puede entrar en un tramite de pago.
6. El tramite gestiona aprobaciones, tesoreria, retenciones, caratulas, historial y pago.
7. Dashboard/reportes consultan la informacion por sociedad, estado, moneda y modulo.

## Estado De Desacople

El sistema ya avanzo respecto al modelo inicial:

- Hay historiales separados para estado documental, workflow de pago y estado mixto.
- Existe `facturas_workflow_pago_estado`.
- El workflow de tramites tiene tablas propias y estados por documento dentro del tramite.
- Hay snapshots de aprobadores por usuario o rol en `tramites_pago_documentos_aprobadores`.

Pero aun no existe el modelo objetivo completo de tabla canonica `documentos` + `documento_estado_actual` por dominio. Por eso, los diagramas objetivo/rebuild de marzo se mantienen como historicos.
