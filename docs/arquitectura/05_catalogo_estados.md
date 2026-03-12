# Catalogo de Estados por Dominio

## Objetivo
Separar y formalizar estados para evitar mezclar ciclo documental con workflow de pagos.

## Dominios
1. `hacienda`: estado de recepcion/respuesta tributaria.
2. `contabilizacion`: estado contable interno del documento.
3. `workflow_pago`: estado del documento dentro del proceso de pago.

## Catalogo propuesto

### Dominio: hacienda
Estados sugeridos:
1. `sin_respuesta`
2. `aceptado`
3. `aceptado_parcial`
4. `rechazado`

Transiciones validas:
- `sin_respuesta -> aceptado|aceptado_parcial|rechazado`
- `aceptado_parcial -> aceptado|rechazado`

### Dominio: contabilizacion
Estados sugeridos:
1. `no_contabilizado`
2. `en_revision`
3. `contabilizado`
4. `rechazado`
5. `anulado`

Transiciones validas:
- `no_contabilizado -> en_revision|rechazado`
- `en_revision -> contabilizado|rechazado`
- `contabilizado -> anulado` (solo por politica de excepcion)

### Dominio: workflow_pago
Estados sugeridos:
1. `fuera_de_tramite`
2. `en_tramite_pago`
3. `aprobado_parcial`
4. `pagado_parcialmente`
5. `pagado`
6. `cancelado`

Transiciones validas:
- `fuera_de_tramite -> en_tramite_pago`
- `en_tramite_pago -> aprobado_parcial|pagado_parcialmente|pagado|cancelado`
- `aprobado_parcial -> en_tramite_pago|pagado_parcialmente|pagado|cancelado`
- `pagado_parcialmente -> pagado|cancelado`

## Reglas operativas
1. Cada cambio de estado debe registrar historial.
2. Cada transicion debe validar permiso y precondiciones.
3. No se permiten transiciones fuera del catalogo.
4. Estados de distintos dominios pueden coexistir para un mismo documento.

## Permisos base por dominio
1. `hacienda`: proceso automatico o rol autorizado.
2. `contabilizacion`: `DOCUMENTOS_CONTABILIZAR`.
3. `workflow_pago`: `DOCUMENTOS_TRAMITAR_PAGO` y aprobaciones por etapa.

## Auditoria minima por transicion
1. `documento_id`
2. `dominio`
3. `estado_anterior`
4. `estado_nuevo`
5. `usuario`
6. `motivo`
7. `ip_address`
8. `creado_en`

## Definition of Done
1. Catalogo implementado en dominio + DB CHECK o tablas catalogo.
2. Tests de transicion permitida/no permitida.
3. Endpoints usan servicio unico de estados.
