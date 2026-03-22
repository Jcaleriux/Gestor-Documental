# EPIC-A-003 Hardening Frontend Y Operacion

## Estado

Activo

## Avance actual

- TECH-001: Hecho con Fase 13 completada
  - hooks de row actions de facturas, notas de credito y tiquetes ya no dependen de resets directos en `useEffect`
  - `useTramiteWorkflowState` ya no resincroniza `overrideUser` mediante `setState` directo en efecto
  - `useTramites.js` ya no limpia listas y estados derivados con `setState` directo cuando cambia el scope; ahora deriva datos por `scopeKey` y descarta respuestas stale de forma compatible
  - `Tramites.jsx` ya usa la URL como fuente de verdad del filtro `estado`, sin duplicar estado local ni resincronizarlo con efectos
  - `useReservaOperationDetails.js` ya no resetea el detalle por `useEffect` cuando cambia el scope; ahora deriva estado visible y feedback por `scopeKey`
  - `useOrdenesCompraIngenieria.js` ya no reinicia formulario, filtros y resultados por `useEffect` al cambiar sociedad; ahora deriva formulario, data, feedback y autoimportacion por `scopeKey`
  - `useTablasPagoIngenieria.js` ya no reinicia busqueda, proveedor, archivo y feedback por `useEffect` al cambiar sociedad; ahora deriva formulario, data y estado visible por `scopeKey`
  - `App.jsx` ya no resincroniza viewport, sidebar movil ni secciones expandidas mediante `setState` directo en efectos; ahora usa store de media query y estado derivado por pathname
  - `useProtectedObjectUrl.js` ya no resetea estado de carga/preview en `useEffect`; ahora deriva estado visible por `resourceUrl` y resuelve el blob de forma compatible
  - `CentrosCostoDistributionField.jsx` ya no limpia query/suggestions por `useEffect`; ahora deriva interaccion por `scope` de linea y mantiene el autocomplete compatible
  - `Facturas.jsx` ya no cierra filtros con `setState` directo en `useEffect`; ahora deriva la visibilidad del panel por `sociedadId` y `dashboardPreset` mediante un `viewScope` compatible
  - `NotasCredito.jsx` ya no cierra filtros con `setState` directo en `useEffect`; ahora deriva la visibilidad del panel por `sociedadId` mediante un `viewScope` compatible
  - `TiquetesElectronicos.jsx` ya no cierra filtros con `setState` directo en `useEffect`; ahora deriva la visibilidad del panel por `sociedadId` mediante un `viewScope` compatible
  - `TramiteProveedorGroup.jsx` ya no resincroniza seleccion, lineas expandidas y errores locales con `setState` directo en `useEffect`; ahora deriva estado local por `scope` del grupo
  - la regla `react-hooks/set-state-in-effect` ya se reactivo como `error` a nivel global en el frontend

## Residual relevante

- `TECH-001` ya no deja hotspots activos para esta regla; el control pasa a lint global y cualquier recaida deberia detectarse automaticamente

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
