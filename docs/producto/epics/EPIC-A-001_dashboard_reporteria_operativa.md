# EPIC-A-001 Dashboard Y Reporteria Operativa

## Estado

Activo

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

- `docs/dashboard_redisenio.md`
- `docs/principios_transversales.md`
