# Sprint 001 - Propuesta Inicial

## Estado

Propuesto

## Objetivo del sprint

Dar el siguiente salto de orden y valor en SendaDocs sin abrir demasiados frentes a la vez.

## Capacidad sugerida

Elegir solo `2 o 3` items reales.

## Candidatos fuertes

- FEAT-001
- TECH-001
- TECH-002

## Avance relevante ya cerrado

- TECH-007
- FEAT-001

## Avance parcial relevante

- TECH-001
  - Fase 1 completada con reactivacion acotada de `react-hooks/set-state-in-effect`
  - siguiente slice seguro aplicado en `useTramites.js`, evitando resets directos en effects y manteniendo compatibilidad del flujo
  - `Tramites.jsx` ya toma `estado` desde URL y elimina la resincronizacion con estado local
  - `useReservaOperationDetails.js` ya oculta detalle y seleccion por cambio de scope sin reset en effect
  - `useOrdenesCompraIngenieria.js` ya oculta formulario, filtros y resultados derivados cuando cambia la sociedad sin reset en effect
  - `useTablasPagoIngenieria.js` ya oculta busqueda, proveedor, archivo y feedback derivados cuando cambia la sociedad sin reset en effect
  - `App.jsx` ya deriva viewport, sidebar movil y apertura inicial de secciones por pathname sin reset en effect
  - `useProtectedObjectUrl.js` ya deriva loading, objectUrl y error por `resourceUrl` sin reset sincronico en effect
  - `CentrosCostoDistributionField.jsx` ya deriva query y suggestions por scope de linea sin reset sincronico en effect
  - `Facturas.jsx` ya deriva la visibilidad del panel de filtros por `sociedadId` y `dashboardPreset` sin cerrarlo via `setState` directo en effect
  - `NotasCredito.jsx` ya deriva la visibilidad del panel de filtros por `sociedadId` sin cerrarlo via `setState` directo en effect
  - `TiquetesElectronicos.jsx` ya deriva la visibilidad del panel de filtros por `sociedadId` sin cerrarlo via `setState` directo en effect
  - `TramiteProveedorGroup.jsx` ya deriva seleccion, lineas y expansion por `scope` del grupo sin reset sincronico en effect
  - la regla `react-hooks/set-state-in-effect` ya quedo reactivada globalmente

## Recomendacion si este sprint se arma hoy

- priorizar `FEAT-001`
- sumar `TECH-001`
- usar `TECH-002` solo si todavia hace falta ampliar mas cobertura operativa o automatizar mas smoke checks

## Nota posterior al cierre de FEAT-001

- FEAT-001 ya quedo resuelto en una Fase 1 completa y compatible
- `TECH-001` ya entro en ejecucion y conviene continuarlo por slices pequenos
- `TECH-002` baja un poco de urgencia porque el smoke operativo ya cubre dashboard stats, work queue, documentos recientes, facturas y tramites

## Por que esta combinacion es sana

- un item funcional visible
- una deuda tecnica que mejora el crecimiento del frontend
- y un item de confianza operativa para releases

## No meter en el mismo sprint salvo que sobren horas reales

- FEAT-002
- FEAT-004
- TECH-003

## Criterio de cierre del sprint

- items terminados con validacion
- backlog actualizado
- si un item es operativo, dejar documentado como reproducirlo localmente
- y residual documentado si algo no alcanzo a cerrarse
