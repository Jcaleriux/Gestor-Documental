# Arquitectura Objetivo

> Nota: este documento describe una arquitectura objetivo. No es una descripcion exacta del runtime actual. Para el estado vigente consultar `estado_actual.md`; para prioridades de mejora consultar `brechas_y_mejoras.md`.

## Objetivo
Separar completamente los contextos de negocio para que el procesamiento documental sea estable y el workflow sea reemplazable sin romper reportes ni consultas base.

## Bounded contexts propuestos
1. Documentos
- Responsabilidad: ingesta, parseo, validacion, persistencia canonica, consulta documental.
- Datos propios: tablas canonicas de documento.

2. Estados
- Responsabilidad: estado actual por dominio e historial de transiciones.
- Datos propios: estado actual + historial.

3. Workflow de pagos
- Responsabilidad: tramites, decisiones por etapa, tesoreria, pagos.
- Datos propios: tablas `tramites_*` y eventos de workflow.

4. Seguridad y acceso
- Responsabilidad: autenticacion, autorizacion, acceso por sociedades.
- Datos propios: usuarios, roles, permisos, asignaciones.

5. Reportes
- Responsabilidad: vistas de lectura y exportacion.
- Datos propios: no persiste; consume proyecciones.

## Reglas de dependencia
1. `Workflow` puede leer Documentos y Estados, pero no escribir tablas canonicas de documento.
2. `Estados` puede ser actualizado por Documentos o Workflow segun dominio, siempre via servicio de estados.
3. `Reportes` solo consume consultas de lectura (read models) sin logica de negocio.
4. `Frontend` nunca define reglas de transicion de estado.

## Patron de capas por backend
1. `routes`: contrato HTTP y autorizacion.
2. `services/usecases`: reglas de negocio.
3. `repositories`: SQL.
4. `domain`: enums, invariantes, politicas.
5. `db`: conexion, transacciones, migraciones.

## Contratos y versionado
1. OpenAPI para endpoints principales.
2. Errores normalizados (`code`, `message`, `details`).
3. Versionado de API cuando cambie contrato (`/api/v1`, `/api/v2` o header).

## Transacciones y consistencia
1. Cualquier caso de uso que toque mas de una tabla usa `withTransaction`.
2. Aplicar `BEGIN/COMMIT/ROLLBACK` en backend, no en frontend.
3. Evitar side effects fuera de transaccion antes de commit.

## Observabilidad
1. Logging estructurado por request.
2. Correlation id para trazas.
3. Metricas minimas: latencia endpoint, errores por modulo, throughput.

## ADR (Architecture Decision Record)
Usar un ADR por decision relevante:
1. Contexto
2. Decision
3. Alternativas consideradas
4. Impacto
5. Estado (propuesto/aprobado/reemplazado)

## Gates de calidad
1. Sin tests de integracion criticos, no se aprueba release.
2. Sin migracion versionada, no se aprueba cambio DB.
3. Sin permiso definido por endpoint, no se publica endpoint.
