# Guion De Demo En Entorno De Desarrollo

## Objetivo

Tener un recorrido claro, corto y creible para mostrar SendaDocs con datos reales sin improvisar durante la demo.

Este guion esta pensado para:

- correr sobre el entorno de desarrollo,
- usar datos reales,
- mostrar valor funcional antes que detalle tecnico,
- y reducir el riesgo de quedarse atrapado en pantallas secundarias.

## Entorno A Usar

### Backend

```bash
cd backend
npm run dev
```

- API esperada: `http://localhost:3002`

### Frontend

```bash
cd frontend
npm run dev
```

- UI esperada: `http://localhost:5173`

## Nota Sobre Archivos En Desarrollo

En desarrollo, si no cambias `FACTURAS_BASE_DIR`, la app opera contra la raiz del repo.

Las rutas operativas relevantes son:

- `documentos/facturas recibidas`
- `documentos/facturas procesadas`
- `documentos/tablas_pago`
- `documentos/ordenes_compra`
- `documentos/tramites_pago/caratulas`

Si vas a subir o revisar archivos manualmente antes de la demo, esas son las carpetas clave.

## Usuarios Recomendados Para La Demo

Si la base fue inicializada con seed, puedes usar:

- `admin@sendadocs.local`
- `contabilidad.jefe@sendadocs.local`
- `tesoreria.encargado@sendadocs.local`
- `gerencia.contable@sendadocs.local`
- `gerencia.financiera@sendadocs.local`

Password seed:

- `SendaDocs2026!`

Para la demo no hace falta usar todos. La combinacion recomendada es:

1. `admin@sendadocs.local`
2. `contabilidad.jefe@sendadocs.local`
3. `tesoreria.encargado@sendadocs.local`
4. `gerencia.contable@sendadocs.local` o `gerencia.financiera@sendadocs.local`

## Datos Que Conviene Tener Listos

Prioriza una sola sociedad para casi toda la demo.

Dataset minimo recomendado:

- 1 sociedad principal bien poblada
- 3 a 5 facturas reales con PDF/XML visibles
- 1 factura con contabilizacion completa
- 1 factura asociada a orden de compra
- 1 factura asociada a tabla de pago
- 1 nota de credito
- 1 tiquete electronico
- 1 tramite en revision de tesoreria
- 1 tramite con aprobacion pendiente en alguna gerencia
- 1 tramite con caratulas cargadas y grupos por proveedor
- 1 proveedor visible en catalogo
- 1 orden de compra visible
- 1 tabla de pago visible

Opcional:

- 1 reserva con documentos si quieres mostrar ese modulo

## Historia Que Vas A Contar

La narrativa recomendada es:

1. SendaDocs centraliza documentos y workflow por sociedad y rol.
2. Contabilidad enriquece y prepara documentos.
3. Tesoreria prioriza, tramita y controla pago.
4. Gerencia aprueba en etapas segun permiso y contexto.
5. Todo queda visible con trazabilidad documental y operativa.

## Guion Recomendado

## Apertura - 1 minuto

Objetivo:

- explicar que la app separa documentos, workflow y control por rol/sociedad

Texto sugerido:

"Voy a mostrar el flujo operativo de SendaDocs usando una sociedad real y varios perfiles. La idea es ver como cambia la experiencia segun el rol, como se consulta el documento, como se tramita para pago y como queda la trazabilidad."

## Paso 1 - Login Y Vista General - 2 minutos

Usuario sugerido:

- `admin@sendadocs.local`

Mostrar:

- login
- selector de sociedad
- dashboard inicial
- menu lateral con modulos principales

Mensaje clave:

- la aplicacion no es una sola lista de documentos; esta organizada por dominio y por permisos

No te quedes mucho aqui. Solo ubica:

- Dashboard
- Facturas
- Tramites
- Ordenes de compra
- Tablas de pago
- Usuarios/Proveedores si hace sentido

## Paso 2 - Flujo Documental Desde Contabilidad - 5 minutos

Usuario sugerido:

- `contabilidad.jefe@sendadocs.local`

Pantallas:

- Dashboard
- Facturas
- Detalle de factura

Mostrar:

- cola del dashboard para contabilidad
- listado de facturas filtrable
- apertura de una factura real
- PDF/XML
- comentarios e historial
- contabilizacion
- asociaciones operativas:
  - proveedor
  - centro de costo
  - orden de compra
  - tabla de pago

Mensaje clave:

- contabilidad no solo consulta; tambien completa contexto operativo para que tesoreria y gerencia trabajen mejor despues

Si la factura elegida ya tiene buena informacion:

- mejor mostrar una bien armada que editar demasiado en vivo

## Paso 3 - Cola Operativa De Tesoreria - 6 minutos

Usuario sugerido:

- `tesoreria.encargado@sendadocs.local`

Pantallas:

- Dashboard
- Tramites
- Detalle de tramite

Mostrar:

- dashboard cambia por rol
- cola operativa de tesoreria
- acceso desde dashboard a tramites o facturas
- listado de tramites filtrado por estado
- detalle de tramite
- vista agrupada por proveedor
- preview de caratula
- grupos, warnings y resolucion manual si aplica
- evidencia de que el workflow ya no depende del estado documental de la factura

Mensaje clave:

- tesoreria trabaja con una cola priorizada y puede revisar el tramite con contexto documental y agrupacion por proveedor

Si el tramite elegido esta bueno para mostrar caratulas:

- usa ese como pieza central de la demo

## Paso 4 - Aprobacion Gerencial - 4 minutos

Usuario sugerido:

- `gerencia.contable@sendadocs.local` o `gerencia.financiera@sendadocs.local`

Pantallas:

- Dashboard
- Tramites
- Detalle de tramite

Mostrar:

- dashboard por rol gerencial
- aprobaciones pendientes
- detalle del tramite desde el lado gerencial
- decisiones posibles segun etapa
- trazabilidad del estado y del historial

Mensaje clave:

- la aprobacion no es ciega; el gerente entra con contexto del documento y del tramite

## Paso 5 - Catalogos Operativos De Soporte - 3 minutos

Usuario sugerido:

- `admin@sendadocs.local` o `contabilidad.jefe@sendadocs.local`

Pantallas opcionales:

- Proveedores
- Ordenes de compra
- Tablas de pago
- Centros de costo

Mostrar solo una o dos:

- ordenes de compra
- tablas de pago

Mensaje clave:

- la app no solo mueve estados; tambien administra piezas de soporte que aterrizan el flujo real

## Paso 6 - Cierre - 1 minuto

Resumen sugerido:

- documentos centralizados
- control por sociedad y rol
- dashboard operativo por perfil
- detalle documental y trazabilidad
- workflow de tramites desacoplado
- soporte para caratulas, ordenes y tablas de pago

Texto sugerido:

"En resumen, SendaDocs permite pasar de la recepcion documental a la ejecucion del tramite de pago con visibilidad por rol, control por sociedad y trazabilidad suficiente para operacion y seguimiento."

## Version Corta De 10 Minutos

Si tienes poco tiempo, usa solo esto:

1. Login
2. Dashboard de contabilidad
3. Detalle de una factura
4. Dashboard de tesoreria
5. Detalle de un tramite con caratulas
6. Dashboard gerencial con aprobaciones

## Plan B Si Algo Falla

Si falla una parte del flujo en vivo:

- no intentes arreglarla en la demo
- cambia a un caso ya listo
- o muestra la pantalla en modo consulta y explica el paso siguiente

Fallbacks recomendados:

- si el tramite elegido no esta perfecto: muestra otro tramite en lectura
- si una caratula no carga: muestra la agrupacion por proveedor y el historial
- si una asociacion no aparece: muestra otra factura ya preparada

## Checklist 30 Minutos Antes

- backend dev arriba
- frontend dev arriba
- login probado con cada usuario demo
- sociedad demo seleccionada y recordada
- factura demo ya localizada
- tramite demo ya localizado
- orden de compra y tabla de pago ya localizadas
- PDF/XML abren
- caratula abre
- dashboard carga para contabilidad, tesoreria y gerencia
- no tener ventanas o pestañas con datos irrelevantes

## Recomendacion De Ejecucion

- usa una sola sociedad principal
- no improvises navegacion larga
- no edites demasiados datos en vivo
- muestra mas lectura y menos captura manual
- si haces una accion en vivo, que sea una sola y bien controlada

## Que No Conviene Mostrar Primero

- configuraciones muy tecnicas
- pantallas vacias
- modulos que no tengan datos consistentes
- cambios manuales largos de formularios
- exploracion sin narrativa

## Orden Recomendado De Roles

1. Admin
2. Contabilidad
3. Tesoreria
4. Gerencia

Ese orden cuenta mejor la historia del negocio que empezar por catalogos.
