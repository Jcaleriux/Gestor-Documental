# AS-IS Inventario Tecnico

## Resumen del estado actual
El sistema actual ya tiene base funcional completa para documentos, workflow de pagos, seguridad y reportes. La principal deuda de arquitectura es el acoplamiento entre workflow y estado de factura.

## Stack actual
1. Backend: Node.js + Express (CommonJS).
2. Frontend: React + Vite.
3. DB: PostgreSQL.
4. Acceso DB: `pg` con SQL directo (repositorios).
5. Auth: JWT + middleware de permisos.

Referencias:
- `backend/db/index.js`
- `backend/app.js`
- `backend/db/database/00_init.sql`

## Rutas backend activas
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

## Modelo de datos actual (grupos)
1. Documentos:
- `facturas`
- `notas_credito`
- `tiquetes_electronicos`
- `mensajes_hacienda`

2. Contabilizacion y pagos:
- `facturas_contabilizacion`
- `facturas_retenciones_pagos`
- `facturas_pagos`
- `tablas_pago`
- `ordenes_compra`
- `proveedores`

3. Workflow pagos:
- `tramites_pago`
- `tramites_pago_documentos`
- `tramites_pago_retenciones`
- `tramites_pago_historial`

4. Seguridad:
- `usuarios`
- `roles`
- `permisos`
- `roles_permisos`
- `usuarios_sociedades`
- `sociedades`

5. Trazabilidad:
- `auditoria`
- `estados_documento`
- `comentarios_documento`
- `versiones_documento`

## Estados y permisos actuales
1. Estados de factura en `backend/domain/facturas.js`.
2. Estados de tramite y decisiones documentales en `backend/domain/tramitesPago.js`.
3. Permisos y permisos de workflow en `backend/domain/permissions.js`.

## Acoplamientos detectados
1. Workflow de tramites actualiza `facturas.estado`.
2. Filtros/reportes de facturas consumen ese estado.
3. Resultado: cambio de workflow impacta listado/reportes documentales.

## Fortalezas reutilizables
1. Buen uso de transacciones (`withTransaction`).
2. Uso consistente de repositorios y servicios.
3. Restricciones SQL existentes (FK/CHECK/UNIQUE/indices).
4. Separacion de rutas por dominio.

## Gaps para el rediseño
1. Estado documental y estado de workflow mezclados en una columna de factura.
2. Migraciones no estandarizadas de forma unica/versionada para todo cambio nuevo.
3. Falta documentacion arquitectonica formal y catalogo de decisiones.

## Riesgos al rehacer
1. Romper reportes por cambios de estado sin capa de compatibilidad.
2. Reintroducir reglas de negocio en frontend en vez de backend.
3. Duplicar logica de estados entre modulos.

## Acciones inmediatas recomendadas
1. Formalizar arquitectura objetivo y ERD objetivo.
2. Definir catalogo de estados por dominio.
3. Definir matriz de permisos por accion/endpoint.
4. Arrancar desarrollo nuevo por fases con Definition of Done.
