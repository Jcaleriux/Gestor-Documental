# Diagnostico De Facturas Recibidas Pendientes

Fecha de referencia: 2026-03-17

## Objetivo

Dejar documentado por que varios archivos siguen en `documentos/facturas recibidas`, que significa eso realmente y que decisiones quedan pendientes antes de modificar el importador.

## Comando revisado

Se ejecuto:

```powershell
node backend\scripts\importarFacturaManifest.js
```

El script termina con:

```text
Procesamiento de manifests completado.
```

Esto indica que el proceso no esta fallando por excepcion. El problema actual es de clasificacion y reglas de importacion, no de caida del script.

## Resumen Ejecutivo

- Hay `12` manifests aun presentes en `documentos/facturas recibidas`.
- Esos manifests referencian `84` adjuntos.
- En la carpeta existen `111` archivos no-manifest, por lo que hay `27` archivos extra no referenciados por ningun manifest.
- Esos `27` extra corresponden a duplicados con sufijo ` (1)` y hoy el importador no los toma en cuenta.
- La causa principal de los pendientes es que varios XML no traen la identificacion de la sociedad receptora en los campos que nuestro importador espera.
- En varios casos el `MensajeHacienda` esta en estado `Aceptado`, por lo que no se puede concluir automaticamente que el documento sea invalido ante Hacienda.
- El problema actual es: "documento posiblemente valido para Hacienda, pero no clasificable automaticamente por nuestro sistema".

## Que Hace Hoy El Importador

Archivo principal:

- `backend/scripts/importarFacturaManifest.js`

Regla actual de resolucion de receptor:

- Para `FacturaElectronica`, `NotaCreditoElectronica`, `NotaDebitoElectronica`, `TiqueteElectronico` y `FacturaCompra`, el script busca `data.Receptor.Identificacion.Numero`.
- Para `MensajeHacienda`, el script busca `data.NumeroCedulaReceptor`.

Si no encuentra ese dato:

- El `DOC` se salta.
- El `RH` se salta.
- Si no se resolvio ninguna sociedad, el manifest y los PDFs tampoco se mueven a procesados.

Ademas, aunque el manifest lograra seguir adelante, `backend/services/factura.service.js` vuelve a depender de esos datos para obtener `sociedad_id` desde la cédula juridica.

## Hallazgo Principal

Los documentos pendientes no parecen responder a un unico problema. Hay al menos tres grupos:

### 1. Documentos aceptados por Hacienda pero no clasificables por nuestro importador

Patron observado:

- El XML trae `Receptor` sin `Identificacion`, o no trae datos suficientes del receptor.
- El `MensajeHacienda` trae `EstadoMensaje = Aceptado`, pero no trae `NumeroCedulaReceptor`.

Ejemplo real:

- `documentos/facturas recibidas/20260109_093629_B30006E0862FD50000.DOC.1.xml`
- `documentos/facturas recibidas/20260109_093629_B30006E0862FD50000.RH.1.xml`

En este caso:

- El `DOC` es un `TiqueteElectronico`.
- El XML incluye `Clave`, `Emisor`, `ResumenFactura` y firma.
- No trae `Receptor.Identificacion.Numero`.
- El `RH` asociado tiene la misma `Clave`.
- El `RH` muestra `EstadoMensaje = Aceptado`.
- El `RH` trae `NumeroCedulaEmisor`, pero no `NumeroCedulaReceptor`.

Conclusion del caso:

- No hay evidencia suficiente para asignar automaticamente la sociedad receptora.
- Tampoco hay evidencia suficiente para decir que el documento esta defectuoso ante Hacienda.

### 2. Documentos donde el receptor viene por nombre, pero no por identificacion

Ejemplo real:

- `documentos/facturas recibidas/20260211_060206_B30006F2C150820000.DOC.1.xml`
- `documentos/facturas recibidas/20260211_060206_B30006F2C150820000.DOC.2.xml`
- `documentos/facturas recibidas/20260211_060206_B30006F2C150820000.DOC.3.xml`
- `documentos/facturas recibidas/20260211_060206_B30006F2C150820000.DOC.4.xml`

Patron observado:

- El `Receptor` existe.
- Solo trae `Nombre`, por ejemplo `INTERMANEGEMENT CR LTDA`.
- No trae `Receptor.Identificacion.Numero`.
- Los `RH` asociados traen `NombreReceptor`, pero no `NumeroCedulaReceptor`.

Conclusion del caso:

- Estos casos si podrian llegar a resolverse con reglas internas de negocio, por ejemplo un mapa nombre -> cédula -> sociedad.
- Aun asi, no conviene "dejarlos pasar" sin una regla confiable y auditable.

### 3. Archivos duplicados o no referenciados por manifest

Ejemplos:

- `20260310_093628_B30007074A82110000.DOC.1 (1).xml`
- `20260310_093628_B30007074A82110000.PDF.1 (1).pdf`
- `20260310_093628_B30007074A82110000.RH.1 (1).xml`

Patron observado:

- Son archivos extra con sufijo ` (1)`.
- No aparecen dentro de `attachments_saved` del manifest.
- El importador solo acepta nombres como `.DOC.1.xml`, `.RH.1.xml`, `.PDF.1.pdf`.

Conclusion del caso:

- Estos archivos no estan "pendientes de importar".
- En la practica son duplicados o basura operativa para este flujo.
- Conviene separarlos del pendiente real.

## PDFs Sin Asociar

El script tambien reporto PDFs "sin asociar a un DOC".

Esto no siempre significa error del proveedor.

Ejemplo:

- En `documentos/facturas recibidas/20260109_093629_B30006E0862FD50000.manifest.json` aparecen dos PDFs:
  - uno de factura
  - otro llamado `GARANTIA Y POLITICA DE DEVOLUCION.pdf`

Como solo existe un `DOC`, ese segundo PDF queda sobrante por diseño del correo recibido. No necesariamente representa un fallo del XML.

## Lo Que No Debemos Asumir

- No debemos asumir que todo documento pendiente esta defectuoso.
- No debemos asumir que todo `TiqueteElectronico` o `NotaCreditoElectronica` sin identificación del receptor es invalido frente a Hacienda.
- No debemos asumir que se puede insertar automaticamente basandonos solo en intuicion o por parecido del nombre.

## Interpretacion Correcta Del Problema

La formulacion mas precisa hoy es esta:

> Hay documentos que parecen validos o aceptados por Hacienda, pero nuestro proceso actual no tiene informacion suficiente para asignarlos automaticamente a una sociedad receptora con seguridad.

Eso significa que el problema actual es mas de trazabilidad interna y reglas de clasificacion que de integridad tecnica pura del XML.

## Riesgo Si Se "Dejan Pasar" Sin Regla Clara

Si forzamos la insercion sin resolver bien la sociedad:

- la factura o tiquete puede quedar bajo la sociedad equivocada,
- el proveedor se puede registrar contra una sociedad incorrecta,
- los tramites posteriores podrian mezclar documentos de sociedades distintas,
- se vuelve mas dificil auditar por que un documento quedo asignado a una sociedad especifica.

Por eso la pregunta correcta no es solo "si el XML esta bueno", sino:

> Tenemos evidencia suficiente para asignarlo automaticamente a la sociedad correcta?

## Decision Operativa Recomendada

Mientras no exista una regla confiable:

- No insertar automaticamente los casos donde no se pueda resolver la sociedad con alta confianza.
- No marcar esos documentos como defectuosos por defecto.
- Mantenerlos identificados como "validos o potencialmente validos, pendientes de clasificacion".

## Posibles Lineas De Solucion Para Retomar Luego

### Opcion A. Resolver por nombre del receptor

Aplicable a casos como `INTERMANEGEMENT CR LTDA`.

Ventaja:

- Permite rescatar varios `DOC` y `RH` que hoy quedan fuera.

Riesgo:

- Requiere un catalogo interno confiable y mantenimiento.
- Hay riesgo de errores si hay variantes de nombre.

### Opcion B. Heredar receptor del DOC al RH usando la misma Clave

Aplicable cuando el `DOC` ya pudo clasificarse y el `RH` comparte la misma `Clave`.

Ventaja:

- Es una regla fuerte y facil de auditar.

Limite:

- No ayuda cuando el `DOC` tampoco pudo clasificarse.

### Opcion C. Separar duplicados y adjuntos no asociados

Aplicable a archivos con sufijo ` (1)` y PDFs sobrantes.

Ventaja:

- Limpia `facturas recibidas`.
- Facilita saber que esta realmente pendiente y que no.

Limite:

- No resuelve por si sola la asignacion de sociedad.

## Recomendacion Para La Proxima Revision

Orden sugerido:

1. Inventariar nombres de receptores repetidos en los XML pendientes.
2. Confirmar si existe un catalogo oficial interno de sociedades con nombres comerciales y cédulas.
3. Definir una regla de "alta confianza" para asignacion automatica.
4. Solo despues modificar el importador.
5. Separar en paralelo duplicados ` (1)` y PDFs extra para limpiar el pendiente real.

## Preguntas Abiertas

- Existe un catalogo confiable de equivalencias nombre receptor -> cédula juridica -> sociedad?
- Hay casos donde un mismo nombre comercial pueda pertenecer a mas de una sociedad?
- Queremos guardar algunos documentos en una bandeja intermedia de "revision manual" en vez de dejarlos en recibidas?
- Queremos distinguir formalmente entre:
  - documento rechazado por Hacienda
  - documento aceptado por Hacienda pero sin sociedad resuelta
  - adjunto extra no contable

## Archivos De Referencia Utiles

- `backend/scripts/importarFacturaManifest.js`
- `backend/services/factura.service.js`
- `documentos/facturas recibidas/20260109_093629_B30006E0862FD50000.DOC.1.xml`
- `documentos/facturas recibidas/20260109_093629_B30006E0862FD50000.RH.1.xml`
- `documentos/facturas recibidas/20260109_093629_B30006E0862FD50000.manifest.json`
- `documentos/facturas recibidas/20260211_060206_B30006F2C150820000.DOC.1.xml`
- `documentos/facturas recibidas/20260211_060206_B30006F2C150820000.RH.1.xml`

## Nota Final

Hasta este punto, el diagnostico mas prudente es:

- no culpar automaticamente al proveedor,
- no forzar inserciones sin evidencia,
- y no perder de vista que varios documentos parecen aceptados por Hacienda aunque nuestro flujo actual no los pueda enrutar.

Ese matiz es el centro del problema.
