# Brechas Y Mejoras Arquitectonicas

Fecha de referencia: 2026-05-13.

Este documento compara la direccion conceptual del rebuild de marzo con el sistema actual. Sirve para separar lo ya implementado, lo parcialmente resuelto y lo que queda como mejora sobre esta misma app.

La app actual es la unica base de trabajo. No hay plan activo para rehacer el sistema desde cero.

## Ya Implementado O En Buena Direccion

- Backend por capas: rutas, servicios/use cases, repositorios, dominio y DB.
- PostgreSQL con schema canonico en `backend/db/database/00_init.sql`.
- Migraciones versionadas con tracking en `schema_migrations`.
- Autenticacion JWT y endpoint de sesion actual.
- Permisos por rol y control por sociedades asignadas.
- Separacion funcional de modulos: facturas, tramites, usuarios, sociedades, proveedores, centros de costo, reservas y reportes.
- Transacciones para casos multi-tabla en flujos sensibles.
- Workflow de tramites en tablas propias.
- Historial de tramites y estados por documento dentro del tramite.
- Aprobadores de centros de costo por usuario o rol.
- Retenciones y pagos parciales modelados en tablas propias.
- Caratulas de tramites por proveedor.
- Auditoria, comentarios y versiones documentales.
- Manejo de moneda como dato de dominio en dashboards/reportes.
- Runbooks de release, backup, rollback y preproduccion local.

## Parcialmente Implementado

- Separacion de estados por dominio:
  - Existe historial separado para documental, workflow y mixto.
  - Existe `facturas_workflow_pago_estado`.
  - Falta un modelo general `documento_estado_actual` aplicable a todos los tipos documentales.
- Desacople entre workflow y documento:
  - El tramite ya vive en tablas propias.
  - Aun conviene validar que ningun flujo critico dependa semanticamente de `facturas.estado` como estado mixto.
- Reportes:
  - Hay dashboard y exportaciones.
  - Falta consolidar read models/vistas explicitamente documentadas para reportes por dominio.
- Ingesta por correo:
  - Hay scripts/importadores/watcher.
  - Falta tratarlo como modulo productizado end-to-end en UI y operacion.
- Dashboard por rol:
  - Hay base por perfil.
  - Faltan colas operativas y widgets diferenciados por rol.

## No Implementado Del Objetivo/Rebuild

- Tabla canonica unica `documentos`.
- Especializacion por tipo usando `documento_id` como PK/FK en `facturas`, `notas_credito`, `tiquetes_electronicos` y `mensajes_hacienda`.
- Tabla general `documento_estado_actual` con PK `(documento_id, dominio)`.
- Tabla general `documento_estado_historial` para todos los tipos documentales.
- Servicio unico de estados por dominio con catalogo formal completo.
- OpenAPI o contrato versionado formal para endpoints principales.
- ADRs formales por decision arquitectonica.
- Observabilidad estructurada con correlation id y metricas por endpoint.
- Versionado de API publico (`/api/v1`, `/api/v2` o header).
- Motor formal de tareas por usuario.
- Centro de notificaciones consolidado o tiempo real.
- Firma digital certificada o validacion criptografica final.

## Que Conservar Como Objetivo

Estas ideas siguen siendo buena direccion, pero deben tratarse como mejoras evolutivas, no como descripcion actual:

- Estados por dominio.
- Reportes basados en modelos de lectura.
- Workflow desacoplado de datos documentales.
- Contratos HTTP documentados.
- ADRs para decisiones grandes.
- Observabilidad y correlation id.

## Que No Conviene Forzar Ahora

- Rebuild big-bang completo. Ya no es la direccion de trabajo.
- Migrar inmediatamente a tabla canonica `documentos` si no hay una necesidad clara de producto o reporting.
- Cambios de schema amplios solo por alinear los diagramas antiguos.

## Recomendacion De Roadmap Tecnico

1. Documentar y estabilizar el AS-IS actual antes de nuevas reestructuraciones.
2. Detectar usos reales de `facturas.estado` y reducir dependencias ambiguas.
3. Consolidar un servicio interno de estados por dominio para facturas antes de generalizar a todos los documentos.
4. Crear read models o vistas para reportes operativos por moneda, sociedad y estado.
5. Formalizar contratos de endpoints criticos.
6. Agregar ADRs solo para decisiones con impacto amplio.
7. Mantener los diagramas objetivo/rebuild en historico como referencia conceptual, no como plan activo.
