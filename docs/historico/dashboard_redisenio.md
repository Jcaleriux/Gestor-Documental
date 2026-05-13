# Dashboard Redisenio Propuesto

## Objetivo

Convertir el dashboard actual en una consola operativa que:

- priorice trabajo pendiente real,
- respete el caracter multicurrency del sistema,
- y cambie el foco segun el rol del usuario.

## Que Son Widgets Por Rol

Un widget por rol es un bloque del dashboard que solo aparece, cambia de prioridad o cambia de contenido segun el trabajo de ese rol.

Ejemplos:

- `Contabilidad`: documentos pendientes de contabilizar, revisiones con errores, retenciones pendientes.
- `Tesoreria`: vencidas, por vencer, tramites listos para pago, riesgo por moneda.
- `Gerencia`: aprobaciones pendientes, montos autorizados, excepciones de alto impacto.
- `Admin`: salud del sistema, usuarios activos, errores de integracion, alertas operativas.

La idea no es crear dashboards totalmente distintos desde el dia uno, sino una base comun con widgets adicionales o reordenados por rol.

## Perfiles Base Del Dashboard

La implementacion actual del dashboard ya puede clasificar la vista en estos perfiles:

- `admin`
- `tesoreria`
- `contabilidad`
- `gerencia`
- `asistente`
- `consulta`

El perfil `asistente` esta pensado para auxiliares operativos como `contabilidad_asistente` o `tesoreria_auxiliar`.

El perfil `consulta` esta pensado para roles de asistencia o perfiles sin permisos de workflow, donde la prioridad es seguimiento, trazabilidad y contexto.

## Layout Base Recomendado

### Fila 1

- selector de sociedad,
- rango de fechas,
- filtro rapido por moneda,
- acciones rapidas: `Ver vencidas`, `Contabilizar`, `Tramitar`, `Revisar aprobaciones`.

### Fila 2

KPIs principales:

- `Total por pagar`
- `Vencidas`
- `Por vencer (7 dias)`
- `Retencion pendiente`
- `No contabilizadas`

Regla: todos los montos se muestran por moneda, nunca mezclados.

### Fila 3

Panel principal operativo:

- izquierda: cola de trabajo priorizada del rol actual
- derecha: alertas, aprobaciones o semaforos de riesgo

### Fila 4

Analitica financiera:

- top proveedores por pagar por moneda
- distribucion por estado y moneda
- aging o vencimientos por tramos

### Fila 5

Trazabilidad:

- documentos recientemente actualizados
- actividad de usuarios o automatizaciones
- ultimas incidencias de validacion

## Widgets Recomendados Por Rol

| Rol | Widgets prioritarios |
| --- | --- |
| `admin` | salud del sistema, incidencias de importacion, usuarios/roles, volumen por sociedad, alertas de permisos |
| `contabilidad_jefe` | no contabilizadas, en revision, tiempo medio de contabilizacion, carga por asistente, retenciones pendientes |
| `contabilidad_asistente` | cola de documentos por contabilizar, validaciones incompletas, proveedores sin parametrizar, ordenes/centros faltantes |
| `tesoreria_encargado` | vencidas, por vencer, tramites listos para aprobar/pagar, riesgo por moneda, top proveedores por moneda |
| `tesoreria_auxiliar` | documentos listos para tramitar, documentos con bloqueo, retenciones pendientes, pagos parciales por cerrar |
| `gerencia_contable` | tramites pendientes de autorizacion, documentos observados, montos aprobados por moneda |
| `gerencia_financiera` | pagos listos para aplicar, exposicion total por moneda, resumen ejecutivo por sociedad |
| `gerencias operativas` | aprobaciones pendientes, monto comprometido por centro de costo, documentos observados |
| `proveeduria` | ordenes de compra pendientes de asociar, diferencias proveedor vs factura, backlog por proveedor |

## Reglas De Dashboard Multicurrency

- El dashboard no debe mostrar un unico "monto total" si mezcla monedas.
- Los rankings financieros deben separarse por moneda.
- Los chips, tablas y exportaciones deben mostrar el codigo de moneda junto al monto.
- Si en el futuro se agrega conversion, debe mostrarse como metrica secundaria y con fuente de tipo de cambio.

## Diagnostico Tecnico Del Estado Actual

### Lo ya resuelto en este ajuste

- El dashboard ya no debe mezclar montos de `CRC` y `USD` en KPIs de cuentas por pagar.
- `Top proveedores por pagar` se separa por moneda.
- Se agrego una nota visible de modo multicurrency en el dashboard cuando existen varias monedas.
- El repo ahora tiene un principio transversal documentado para que esto no se pierda.

### Lo que sigue pendiente para widgets por rol

- `frontend/src/App.jsx`: hoy la sesion expone `rol` numerico, pero para dashboards por rol conviene incluir `rol_codigo` y `rol_nombre`.
- `frontend/src/components/Dashboard.jsx`: aun es una vista base comun; falta orquestar secciones condicionales por rol.
- `backend/routes/dashboard.js` y `backend/services/dashboardUseCases.js`: todavia no exponen colas de trabajo por rol ni alertas operativas.

## Prioridad De Implementacion

### Paso 1. Bajo esfuerzo / alto impacto

- mantener KPIs multicurrency,
- agregar filtro rapido por moneda,
- mostrar ultima actualizacion del dashboard,
- enriquecer documentos recientes con proveedor, monto y moneda,
- agregar estados vacios con CTA.

### Paso 2. Esfuerzo medio

- incluir `rol_codigo` y `rol_nombre` en la sesion autenticada,
- introducir una configuracion de widgets por rol,
- agregar colas operativas por rol,
- separar dashboard ejecutivo de dashboard operativo.

### Paso 3. Esfuerzo mayor

- graficos de aging y vencimientos,
- notificaciones operativas en tiempo real,
- quick actions contextuales,
- comparativos por periodo,
- vistas guardadas por usuario.
