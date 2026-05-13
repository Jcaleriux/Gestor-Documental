# Vision Y Alcance De Arquitectura

## Objetivo

Fortalecer la aplicacion existente para que siga creciendo con claridad operativa, trazabilidad, seguridad y bajo riesgo tecnico.

La arquitectura debe acompañar el producto actual:

- documentos fiscales y adjuntos en filesystem con rutas en DB,
- workflow de tramites de pago,
- control por sociedades, roles y permisos,
- dashboards y reportes multicurrency,
- reservas y operaciones relacionadas,
- release y operacion mas confiables.

## Principios De Diseno

1. Evolucion incremental antes que reescrituras amplias.
2. Preservar contratos HTTP, permisos, payloads y flujos visibles salvo cambio aprobado.
3. Mantener separacion entre estado documental, workflow de pago y reporteria.
4. Mantener moneda como dato obligatorio de dominio en montos y reportes.
5. Usar migraciones versionadas para todo cambio de DB.
6. Proteger trazabilidad: auditoria, historial, actor, fecha y motivo cuando aplique.
7. Concentrar reglas de negocio en backend, no en frontend.
8. Mejorar hotspots por slices verticales, con validacion focalizada.

## Alcance Arquitectonico Vigente

1. Consolidar el modelo actual documentado en `estado_actual.md`.
2. Mantener el desacople logrado entre workflow y estado documental.
3. Mejorar reportes y dashboard sin mezclar monedas ni estados de dominios distintos.
4. Fortalecer reservas, reemplazos documentales y acciones operativas transversales.
5. Reducir deuda tecnica priorizada en backlog, especialmente frontend, smoke checks y observabilidad.
6. Formalizar contratos y ADRs solo cuando el impacto lo justifique.

## Fuera De Alcance Actual

1. Rebuild completo desde cero.
2. Migracion inmediata a una tabla canonica unica `documentos`.
3. Cambio masivo de API, rutas, payloads o permisos solo por limpieza.
4. Cambio de framework backend/frontend.
5. Automatizacion destructiva de deploy, restore o reset.

## Criterios De Exito

1. Los cambios importantes tienen backlog visible o decision documentada.
2. Las mejoras tecnicas no rompen comportamiento publico.
3. Los modulos criticos mantienen pruebas, smoke checks o validacion manual documentada.
4. La documentacion distingue claramente entre funcionamiento actual, historico y mejora pendiente.
5. Cada release puede explicar version, alcance, migraciones y rollback.
