# EPIC-A-005 Caratulas De Tramites De Pago Por Proveedor

## Estado

Activo

## Avance actual

- FEAT-006: Hecho en repo
  - el tramite ahora pasa de `en_aprobacion_gerencia` a `en_revision_tesoreria_1`
  - tesoreria puede cargar o reemplazar un solo PDF de caratulas por tramite
  - el avance a gerencia contable queda bloqueado si las caratulas no estan cargadas o resueltas
- FEAT-007: Hecho en repo
  - parser PDF sin OCR para caratulas textuales tipo EDE
  - agrupacion de paginas contiguas por proveedor
  - matching por sociedad, proveedor, consecutivo y fallback por monto unico
  - warnings y resolucion manual cuando hay ambiguedad o mismatch
- FEAT-008: Hecho en repo
  - `GET /api/tramites-pago/:id` ahora devuelve `caratula` y `provider_groups`
  - vista unificada agrupada por proveedor con preview PDF de la caratula
  - facturas ordenadas segun la caratula y resolucion manual desde la UI

## Residual relevante

- aplicar y validar la migracion en entorno compartido antes de usarlo en operacion real
- monitorear si el fallback por monto unico genera falsos positivos con proveedores de alto volumen
- decidir si la fecha de ejecucion con tolerancia de `15 dias` debe seguir como warning o subir de fuerza en una siguiente iteracion
- evaluar manejo mas explicito para lineas no factura como anticipos o subcontratos si empiezan a aparecer con frecuencia

## Problema

El flujo de tramites de pago pasaba de tesoreria a aprobaciones y luego a pago, pero faltaba un paso intermedio para:

- subir la caratula bancaria o de ejecucion del tramite,
- asignarla automaticamente por proveedor dentro del mismo tramite,
- y revisar mismatches antes de seguir aprobando.

Sin ese paso, tesoreria perdia control operativo y la vista unificada no representaba bien como realmente se ejecuta el pago.

## Usuario o area afectada

- tesoreria
- contabilidad
- gerencia contable
- gerencia financiera
- soporte operativo cuando hay discrepancias

## Resultado esperado

Un tramite de pago que refleje mejor la ejecucion real:

- con una parada inicial de tesoreria,
- con caratulas asociadas por proveedor,
- y con una vista unificada mas util para revisar el soporte antes de seguir en el flujo.

## Alcance

- nueva parada de workflow en `en_revision_tesoreria_1`
- almacenamiento de un PDF fuente de caratulas por tramite
- parsing de PDF textual sin OCR en v1
- matching automatico por sociedad, proveedor y factura
- warnings y resolucion manual para casos ambiguos
- vista unificada agrupada por proveedor con preview PDF

## Fuera de alcance

- OCR para PDFs imagen o escaneos no legibles
- multiples PDFs fuente por tramite en v1
- automatizacion total de lineas no factura
- rediseno completo del modulo de tramites fuera del alcance de caratulas

## Modulos impactados

- backend de tramites de pago
- workflow y politicas de estados
- DB de tramites y storage documental
- frontend de detalle de tramite
- dashboard y filtros que leen estados de tramites

## Riesgos

- matching automatico incorrecto si los datos del PDF vienen muy ruidosos
- friccion operativa si tesoreria no entiende por que un grupo quedo bloqueado
- dependencia fuerte de nombres de proveedor y sociedad si la caratula no trae identificadores consistentes
- crecimiento de casos borde si aparecen formatos bancarios nuevos

## Dependencias

- migracion `tramites_pago_caratulas`
- permisos de tesoreria para gestionar el paso inicial
- PDFs con texto extraible en v1
- metadatos de proveedor y documento suficientemente confiables en el tramite

## Historias candidatas

- FEAT-006
- FEAT-007
- FEAT-008

## Criterios de exito

- al aprobar gerencia, el tramite cae en `en_revision_tesoreria_1`
- tesoreria no puede mandar a gerencia contable un tramite sin caratulas resueltas
- las caratulas se muestran agrupadas por proveedor dentro de la vista unificada
- mismatches de sociedad, proveedor o factura quedan visibles y accionables
- la resolucion manual queda persistida y no rompe el flujo posterior

## Referencias

- `docs/producto/03_roadmap.md`
- `docs/producto/04_backlog.md`
- `docs/19.EDE.pdf`
