# EPIC-A-001 Dashboard Y Reporteria Operativa

## Estado

Activo

## Avance actual

- FEAT-001: Hecho en Fase 1
  - dashboard reordenado con cola operativa arriba del bloque analitico
  - nueva fuente backend `GET /api/dashboard/work-queue`
  - priorizacion por rol en frontend sin romper contratos existentes de `stats` ni `recent-documents`
  - nuevos drill-downs compatibles a facturas (`en_revision`, `en_tramite`) y tramites por `estado`
  - ajuste aditivo de permisos para lectura de tramites desde roles workflow

## Residual relevante

- FEAT-002 y FEAT-005 siguen siendo el siguiente salto natural para aging, excepciones y lectura gerencial mas fina
- puede haber una Fase 2 futura para pulir CTAs por permiso fino o profundizar excepciones por moneda, sin reabrir el contrato base

## Problema

El sistema ya muestra informacion util, pero el dashboard y la reporteria todavia pueden ayudar mucho mas a priorizar trabajo real por:

- rol,
- sociedad,
- moneda,
- y excepciones operativas.

## Usuario o area afectada

- tesoreria
- contabilidad
- gerencias
- asistencia operativa

## Resultado esperado

Una consola mas util para seguimiento y accion, no solo para consulta general.

## Alcance

- widgets por rol
- mejores accesos rapidos
- lectura operativa por moneda
- vistas de excepcion y aging
- foco en trabajo pendiente real

## Fuera de alcance

- BI externo
- analitica historica avanzada
- dashboards totalmente distintos por rol desde el primer corte

## Modulos impactados

- frontend dashboard
- backend dashboard
- repositorios de resumen y documentos recientes
- contratos de UI relacionados con KPIs y accesos rapidos

## Riesgos

- mezclar valor analitico con ruido visual
- reintroducir montos mezclados entre monedas
- crecer el dashboard sin una jerarquia clara por rol

## Dependencias

- contratos backend del dashboard
- reglas multicurrency-first
- permisos por perfil

## Historias candidatas

- FEAT-001
- FEAT-002
- FEAT-005

## Criterios de exito

- el dashboard ayuda a decidir acciones proximas
- los montos se entienden mejor por moneda y sociedad
- los perfiles ven informacion mas relevante para su trabajo

## Referencias

- `docs/historico/dashboard_redisenio.md`
- `docs/principios_transversales.md`
