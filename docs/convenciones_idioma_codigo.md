# Convenciones De Idioma Del Codigo

## Decision

La aplicacion y la operacion del negocio viven en espanol. El codigo no debe forzarse a "traducir todo" al ingles si eso rompe el lenguaje ubicuo del proyecto.

La convencion de este repo es:

- Espanol para interfaz, documentacion funcional y terminos de dominio canonicos.
- Ingles para estructura tecnica, abstracciones reutilizables y nombres genericos de ingenieria.
- Sin mezclar sinonimos del mismo concepto dentro del mismo modulo.

## Regla Principal

Cuando una palabra representa un concepto tecnico generico, se prefiere ingles.

Ejemplos:

- `create`
- `normalize`
- `validate`
- `workflow`
- `policy`
- `service`
- `repository`
- `auth`
- `session`

Cuando una palabra representa una entidad o proceso del negocio que ya es canonico en la app, DB o API, se mantiene en espanol.

Ejemplos:

- `factura`
- `tramite`
- `sociedad`
- `proveedor`
- `retencion`
- `tesoreria`
- `notaCredito`

Por eso nombres como `createTramitesPagoWorkflowUseCases` o `saveAuthSession` encajan mejor con el estado actual del proyecto que una traduccion total tipo `createInvoiceWorkflow` o `guardarSesionAuth`.

## Por Area

| Area | Convencion | Ejemplos |
| --- | --- | --- |
| UI y texto visible | Espanol | labels, mensajes, nombres de modulos visibles al usuario |
| Rutas/API y tablas ya existentes | Conservar el contrato actual del dominio | `/api/facturas`, `tramites_pago`, `sociedades` |
| Helpers e infraestructura | Ingles | `parseJsonStorage`, `runInTransaction`, `policyRegistry` |
| Modulos de negocio | Ingles tecnico + dominio en espanol | `tramitesPagoWorkflowCreatePolicies`, `factura.service.js` |
| Comentarios de negocio o reglas legales | Espanol si mejora claridad del equipo | reglas de Hacienda, politicas operativas |
| Comentarios tecnicos y abstracciones nuevas | Preferir ingles | notas de implementacion, invariantes tecnicos |

## Reglas Para Codigo Nuevo

1. Si el modulo ya usa `factura`, no introducir `invoice` en ese mismo contexto.
2. Si el modulo ya usa verbos/abstracciones en ingles, mantener ese patron.
3. No renombrar tablas, rutas, payloads o columnas solo por traduccion.
4. Si una respuesta de error puede llegar al usuario final, debe priorizar espanol claro.
5. Si una utilidad es transversal y no pertenece al dominio, nombrarla en ingles.

## Lo Que Queremos Evitar

- `crearPaymentWorkflow`
- `invoiceSociedadMapper`
- `usuarioAuthHelper`
- `facturaServiceHelperEsp`

Esos nombres mezclan idiomas sin una regla clara y vuelven mas dificil entender que es tecnico y que es dominio.

## Politica De Refactor

No se deben hacer renombrados masivos solo por idioma.

Si tocamos una zona del sistema:

- normalizamos lo nuevo segun estas reglas,
- mantenemos compatibilidad con contratos publicos y schema,
- y solo renombramos identificadores existentes cuando la mejora de claridad justifique el costo.

## Regla Rapida Para Revisiones

Antes de aceptar un nombre nuevo, revisar:

1. Esto es termino tecnico generico o termino de negocio?
2. En este modulo ya existe una palabra canonica para ese concepto?
3. El cambio mejora claridad real o solo traduce por preferencia?

Si la respuesta final es "solo traduce por preferencia", no vale la pena el churn.

## Nota Transversal Sobre Dinero Y Moneda

Aunque esta guia es de idioma, `moneda` es un concepto de dominio canonico y no debe diluirse en nombres ambiguos.

- Si un dato monetario cambia de moneda, el nombre debe dejar claro si es original, convertido o agregado por moneda.
- Evitar nombres genericos como `totalAmount` o `balance` si no queda clara la moneda o el contexto de agregacion.
- Si un cambio toca montos, revisar `docs/principios_transversales.md` antes de cerrar la implementacion.
