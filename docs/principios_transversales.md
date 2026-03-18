# Principios Transversales Del Sistema

## Multicurrency First

El sistema debe tratar la moneda como un dato de dominio de primera clase, no como un detalle visual.

Esto implica:

- Nunca sumar, ordenar ni comparar montos de monedas distintas sin una conversion explicita y trazable.
- Todo monto visible en UI, reportes, exportaciones y logs debe mostrar su moneda.
- Los agregados financieros del dashboard deben presentarse por moneda.
- Si existe conversion, se debe conservar `montoOriginal`, `monedaOriginal`, `tipoCambio`, `fuenteTipoCambio` y `fechaTipoCambio`.
- Los filtros y workflows que mueven dinero deben mantener la moneda desde origen hasta aprobacion y pago.
- Toda prueba nueva que toque montos debe incluir por lo menos un caso `CRC` y un caso `USD`.

## Checklist Rapido Para Revisiones

Antes de aprobar un cambio que toca dinero, validar:

1. El cambio conserva la moneda original del documento?
2. Hay algun agregado que este mezclando CRC y USD?
3. La UI deja claro cuando un monto es original, convertido o agregado por moneda?
4. El flujo completo sigue siendo consistente desde recepcion hasta pago?

Si alguna respuesta es "no" o "no esta claro", el cambio debe ajustarse antes de cerrarse.
