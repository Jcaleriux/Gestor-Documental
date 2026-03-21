# EPIC-A-003 Hardening Frontend Y Operacion

## Estado

Activo

## Problema

La base tecnica esta mucho mejor que antes, pero todavia hay zonas donde el proyecto depende de tolerancias o patrones que conviene sanear para crecer con menos friccion.

Ejemplo actual:

- la regla `react-hooks/set-state-in-effect` quedo desactivada globalmente porque el repo aun usa varios patrones de reset de UI que deben revisarse por slices.

## Usuario o area afectada

- desarrollo
- mantenimiento
- releases

## Resultado esperado

Un proyecto mas facil de evolucionar, con mejor confianza tecnica y menos hotspots recurrentes.

## Alcance

- sanear patrones de UI fragiles
- recuperar reglas de calidad cuando sea razonable
- agregar smoke checks funcionales relevantes
- mejorar confianza de release y operacion

## Fuera de alcance

- reescribir el frontend completo
- introducir herramientas pesadas sin necesidad real

## Modulos impactados

- frontend compartido
- CI
- scripts de validacion
- documentacion operativa

## Riesgos

- intentar arreglar demasiados componentes a la vez
- convertir limpieza tecnica en refactor sin control
- dejar reglas activadas antes de que el codigo este listo

## Dependencias

- backlog tecnico priorizado
- CI ya activa
- validacion por slices pequenos

## Historias candidatas

- TECH-001
- TECH-002
- TECH-003

## Criterios de exito

- menos tolerancias globales
- menos sorpresas en release
- y mejor capacidad de agregar features sin tocar demasiados hotspots
