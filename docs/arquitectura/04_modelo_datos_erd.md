# Modelo de Datos y ERD Objetivo

## Objetivo
Definir un modelo relacional limpio que preserve integridad documental y desacople estados/workflow.

## Decision de modelado
1. Mantener PostgreSQL relacional como base principal.
2. Mantener payload original en JSONB para trazabilidad.
3. Separar estado por dominio en tablas dedicadas.
4. Separar workflow en tablas propias sin escribir estado canonico documental.

## Modelo objetivo (alto nivel)

### 1) Tabla base de documentos
`documentos`
- `id` PK
- `tipo_documento` (`factura`, `nota_credito`, `tiquete`, `mensaje_hacienda`)
- `sociedad_id` FK -> `sociedades.id`
- `clave` (UNIQUE por tipo + sociedad)
- `consecutivo` (nullable segun tipo)
- `fecha_emision`
- `moneda`
- `total_comprobante`
- `emisor_identificacion`
- `emisor_nombre`
- `ruta_xml`, `ruta_pdf`
- `payload_json` JSONB (documento parseado original)
- `creado_en`, `actualizado_en`

### 2) Tablas especificas por tipo
`facturas`, `notas_credito`, `tiquetes_electronicos`, `mensajes_hacienda`
- `documento_id` PK/FK -> `documentos.id`
- Campos especificos del tipo (referencia, receptor, metadata tecnica, etc.).

### 3) Estados por dominio
`documento_estado_actual`
- `documento_id` FK -> `documentos.id`
- `dominio` (`hacienda`, `contabilizacion`, `workflow_pago`)
- `estado`
- `actualizado_en`, `actualizado_por`, `motivo`
- PK compuesta (`documento_id`, `dominio`)

`documento_estado_historial`
- `id` PK
- `documento_id` FK -> `documentos.id`
- `dominio`
- `estado_anterior`, `estado_nuevo`
- `usuario`, `motivo`, `ip_address`
- `creado_en`

### 4) Workflow de pagos
`tramites_pago`, `tramites_pago_documentos`, `tramites_pago_retenciones`, `tramites_pago_historial`
- Conserva proceso y trazabilidad del tramite.
- No modifica datos canonicos de `documentos`.

## Reglas de integridad recomendadas
1. `UNIQUE (tipo_documento, sociedad_id, clave)` en `documentos`.
2. CHECK de catalogos de estado por dominio.
3. FK obligatoria para enlaces documentales y de workflow.
4. Indices en campos de consulta: `sociedad_id`, `fecha_emision`, `dominio`, `estado`.

## Proyecciones de lectura (read models)
1. `vw_documentos_facturas`: vista para listado operativo de facturas.
2. `vw_documentos_notas_credito`: vista para notas.
3. `vw_documentos_tiquetes`: vista para tiquetes.
4. `vw_reportes_documentos`: vista unificada para exportacion/reportes.

## Notas de migracion
1. Si se rehace desde cero: crear esquema nuevo y cargar documentos por reproceso.
2. Si hubiese datos productivos: requeriria estrategia de backfill + dual-write (no aplica en este escenario).
