# Proceso Ideal Para Hacer Crecer Novogar Con Scrum

## Objetivo

Este documento explica una forma sana y sostenible de hacer crecer `Proyecto Novogar` sin perder control tecnico ni funcional. La idea no es aplicar Scrum de forma rigida, sino usarlo como marco para:

- convertir ideas sueltas en backlog visible,
- decidir mejor que construir primero,
- reducir retrabajo,
- evitar deuda tecnica evitable,
- y hacer releases con menos sorpresas.

Esta guia asume el contexto real de Novogar hoy:

- backend `Node.js + Express`,
- frontend `React + Vite`,
- PostgreSQL como base principal,
- migraciones versionadas,
- CI basica ya activa,
- y una mezcla de trabajo funcional, arquitectura y deuda tecnica.

## Idea Central

Un sistema como este no crece bien cuando las ideas viven solo en la cabeza o en chats. Crece mejor cuando cada cambio pasa por una ruta clara:

1. Idea o necesidad.
2. Problema bien definido.
3. Epic o iniciativa.
4. Features e historias pequenas.
5. Implementacion con criterios claros.
6. Validacion tecnica y funcional.
7. Aprendizaje para el siguiente sprint.

La diferencia entre un proyecto que se vuelve caotico y uno que escala bien no suele estar en el stack. Suele estar en si existe o no un proceso repetible para tomar decisiones.

## Que Se Define Y Cuando

No todo se define al mismo tiempo. Hay decisiones que deben existir muy temprano y otras que se aterrizan cuando nace cada feature.

### 1. Fundaciones del sistema

Estas cosas idealmente se definen al principio del proyecto o cuando se detecta que faltan:

- arquitectura base,
- convenciones de codigo,
- modelo de migraciones,
- estrategia de configuracion por entorno,
- autenticacion y permisos base,
- estructura del repo,
- CI minima,
- definicion minima de pruebas,
- checklist de release.

En Novogar ya se avanzo bastante en esta capa:

- migraciones versionadas,
- validacion centralizada de entorno,
- CI con build, tests y lint,
- release checks backend,
- checklist de despliegue,
- y separacion de estados por dominio.

### 2. Definiciones por epic

Cada vez que nace una iniciativa grande, se deberian definir:

- problema de negocio,
- usuarios afectados,
- resultado esperado,
- modulos tocados,
- impacto en permisos,
- impacto en estados o workflow,
- impacto en base de datos,
- riesgos,
- y forma de validar exito.

Aqui todavia no deberia entrar el detalle de cada boton o query. El epic responde `que queremos lograr y que zonas del sistema toca`.

### 3. Definiciones por feature o historia

Cuando el epic ya esta claro, cada historia aterriza:

- comportamiento exacto,
- reglas,
- validaciones,
- pantallas o endpoints afectados,
- contrato esperado,
- pruebas esperadas,
- y criterios de aceptacion.

### 4. Detalle durante implementacion

Durante el sprint aparecen detalles tecnicos pequenos:

- nombres finales,
- forma del componente,
- forma del SQL,
- refactor local,
- ajustes de performance,
- copy de mensajes,
- y orden de tareas.

Eso si puede definirse mientras se implementa, siempre que no cambie el alcance acordado sin volver a backlog/refinamiento.

## En Que Momento Nacen CI, Checks y Calidad

La respuesta ideal es:

- la base de calidad nace con la arquitectura inicial,
- y se extiende cada vez que el sistema gana una nueva clase de riesgo.

Ejemplo real:

- cuando existe frontend, debe existir build automatizable;
- cuando existe backend, debe existir test runner y chequeo de arranque;
- cuando existe DB con cambios evolutivos, deben existir migraciones;
- cuando existe despliegue repetible, debe existir CI;
- cuando existe riesgo operacional, deben existir checks de release.

No es correcto dejar esto solo para el final del proyecto. Si se deja para el final, se convierte en deuda tecnica porque cada feature nueva se apoya en una base frágil.

## Como Se Ve Un Flujo Sano En Scrum

Para Novogar, una version ligera y realista de Scrum puede verse asi.

### Roles

Si el equipo es pequeno, una misma persona puede cumplir varias funciones, pero los sombreros deben existir:

- `Product Owner`: prioriza que aporta mas valor.
- `Scrum Master`: protege el proceso y detecta bloqueos.
- `Development Team`: implementa, prueba, documenta y libera.

Si hoy eres una sola persona, igual sirve pensar asi:

- hoy priorizo como PO,
- hoy ejecuto como dev,
- hoy reviso el proceso como SM.

## Artefactos Minimos Recomendados

Para crecer ordenadamente, Novogar deberia mantener visibles estos artefactos.

### 1. Vision del producto

Documento corto con:

- para quien es el sistema,
- que problema resuelve,
- que no intenta resolver aun,
- y que resultados importa mover.

### 2. Product goals

Objetivos de 1 a 3 meses.

Ejemplos:

- reducir tiempo de gestion de facturas,
- mejorar trazabilidad del workflow,
- habilitar reportería por moneda,
- robustecer operacion de reservas.

### 3. Roadmap

No una lista eterna. Solo iniciativas priorizadas por bloques:

- ahora,
- siguiente,
- despues.

### 4. Epics

Cada epic deberia explicar:

- problema,
- valor,
- alcance,
- modulos,
- dependencias,
- riesgos,
- y como sabremos si quedo bien.

### 5. Historias

Las historias deberian ser pequenas, testeables y desplegables.

### 6. Registro de deuda tecnica

La deuda tecnica no deberia vivir solo en memoria. Cada item deberia tener:

- sintoma,
- riesgo,
- impacto,
- oportunidad de arreglarla,
- y prioridad.

### 7. Definition of Ready

Una historia entra al sprint solo si ya esta suficientemente clara.

### 8. Definition of Done

Una historia no esta terminada solo porque `ya corre en mi maquina`.

## Propuesta De Estructura Documental En El Repo

Si quieres usar el repo como fuente de verdad, esta seria una estructura sana:

```text
docs/
  producto/
    01_vision_producto.md
    02_product_goals.md
    03_roadmap.md
    04_backlog.md
    epics/
      EPIC-001_ejemplo.md
      EPIC-002_ejemplo.md
    sprints/
      sprint-001.md
      sprint-002.md
```

No hace falta crear todo de golpe. Lo importante es que exista un lugar estable y visible.

## Flujo Recomendado: De Idea A Produccion

### Paso 1. Capturar la idea

Toda idea nueva deberia caer en una lista unica. No importa si aun esta verde.

Ejemplos:

- “dashboard por proyecto”,
- “alertas por facturas vencidas”,
- “workflow configurable por tipo de proveedor”,
- “conciliacion de pagos parciales”.

La regla es simple: si la idea importa, se escribe.

### Paso 2. Convertir idea en problema

Antes de hablar de pantallas o tablas, hay que responder:

- quien sufre el problema,
- cual es el dolor,
- que pasa hoy,
- y que resultado seria mejor.

Ejemplo malo:

- “hacer un modulo nuevo”.

Ejemplo bueno:

- “tesoreria no puede distinguir rapido facturas listas para pago parcial por moneda y sociedad, lo que retrasa aprobaciones”.

### Paso 3. Decidir si es epic, historia o tarea

Usa esta regla:

- si toca varios modulos o varios sprints, es `epic`,
- si entrega valor visible y cabe en un sprint, es `historia`,
- si es implementacion tecnica interna de una historia, es `tarea`.

### Paso 4. Refinamiento

Antes de meter algo al sprint:

- aclarar reglas,
- revisar dependencias,
- decidir si toca DB,
- decidir si toca permisos,
- decidir si toca estados,
- decidir si toca reportes,
- definir pruebas y smoke checks.

### Paso 5. Revisar impacto arquitectonico

No toda historia requiere decision arquitectonica. Pero si toca alguno de estos puntos, si merece una pausa:

- schema nuevo,
- migraciones,
- permisos nuevos,
- workflow nuevo,
- cambio de contratos API,
- cambio de estados,
- procesos batch o watchers,
- archivos/documentos,
- o reglas que cruzan dominios.

En esos casos conviene dejar una nota corta de decision, aunque no sea un ADR formal largo.

### Paso 6. Planificar sprint

Elegir pocas cosas terminables.

Buena señal:

- 1 o 2 items importantes,
- con alcance claro,
- y con capacidad real para terminarlos bien.

Mala señal:

- 7 iniciativas medianas a la vez,
- sin criterios de aceptacion,
- y sin tiempo para pruebas o documentacion.

### Paso 7. Implementar por slices pequenos

La mejor forma de crecer Novogar es la que ya se ha venido usando:

- tocar un slice pequeno,
- mantener compatibilidad,
- agregar pruebas dirigidas,
- correr validaciones,
- y documentar residuos reales.

### Paso 8. Revisar y demostrar

Al cerrar cada historia deberias poder mostrar:

- que problema resolvio,
- que cambio visible produjo,
- que validaciones pasaron,
- y que riesgos quedaron.

### Paso 9. Cerrar aprendizaje

Despues del sprint o bloque:

- que salio bien,
- que genero retrabajo,
- que faltaba definir antes,
- y que deuda tecnica conviene atacar ya.

## Definicion De Epic Para Novogar

Un template util podria verse asi:

```md
# EPIC-00X Nombre

## Problema

## Usuario / area afectada

## Resultado esperado

## Alcance

## Fuera de alcance

## Modulos impactados

## Riesgos

## Dependencias

## Criterios de exito

## Historias candidatas
```

## Definicion De Historia Para Novogar

```md
# HIST-00X Nombre

## Como
## Quiero
## Para

## Criterios de aceptacion
- ...
- ...
- ...

## Impacto tecnico
- Backend:
- Frontend:
- DB:
- Permisos:
- Estados / workflow:

## Validaciones esperadas
- Tests:
- Smoke manual:

## Notas
```

## Definicion De Item De Deuda Tecnica

```md
# TECH-00X Nombre

## Sintoma actual

## Riesgo si no se corrige

## Costo de seguir igual

## Alcance tecnico

## Criterios de done

## Validacion
```

## Definition Of Ready Sugerida

Una historia esta `Ready` si:

- el problema ya esta claro,
- el usuario o area afectada esta clara,
- los criterios de aceptacion existen,
- el impacto en backend/frontend/DB se entiende,
- el impacto en permisos y estados se reviso,
- la validacion esperada esta definida,
- y no depende de una decision grande aun abierta.

## Definition Of Done Sugerida

Una historia esta `Done` si:

- el codigo esta implementado,
- no rompio contratos sin documentarlo,
- tiene pruebas o validacion dirigida suficiente,
- la CI relevante pasa,
- el schema esta migrado si aplica,
- la documentacion minima se actualizo si cambia operacion,
- y el residual quedo explicitado si no fue posible cerrarlo.

## Release Readiness Y Primer Paso A Produccion

Si un bloque de trabajo apunta a una release productiva, no basta con decir `esta hecho`. Tambien debe pasar una revision de release readiness.

## Release vs Deployment

En Scrum y gestion de producto conviene separar estos dos conceptos:

- `release`: la version que declaras y cortas como candidata u oficial
- `deployment`: el acto de instalar o publicar esa release en un entorno

Los dos terminos son correctos, pero no significan exactamente lo mismo.

## Regla para Novogar

- hablar de `release` cuando se define version, changelog y alcance del corte
- hablar de `deployment` cuando se ejecuta el paso a `staging` o `produccion`

## Obligatorio Antes Del Primer Paso A Produccion

Antes del primer release o primer deployment productivo, deberia existir como minimo:

- version objetivo definida
- changelog visible
- criterio claro para el tag Git oficial
- CI y checks de release en verde
- migraciones revisadas
- backup y rollback definidos
- secretos reales y entorno correcto
- smoke checks ejecutables
- y registro final de version, commit y migraciones aplicadas

## Regla para el tag Git

La version objetivo puede definirse antes, pero el tag Git oficial debe crearse sobre el commit exacto que realmente se libera o se confirma como desplegado.

Ejemplo:

- hoy puedes definir que la primera release objetivo sera `1.0.0`
- pero el tag `v1.0.0` deberia nacer cuando el commit final del release ya este decidido

## Donde vive esta definicion

Para Novogar, esta parte de gobierno vive en:

- `VERSION`
- `CHANGELOG.md`
- `docs/producto/06_versionado_y_releases.md`
- `docs/despliegue_checklist.md`

## Como Meter Deuda Tecnica Dentro De Scrum

La deuda tecnica no se deberia esconder “para despues”. Deberia entrar al backlog como cualquier otro trabajo.

Buena practica:

- reservar capacidad del sprint para deuda tecnica,
- priorizar la que reduce riesgo real,
- unir deuda con features cuando comparten zona del codigo,
- y medirla por impacto, no por molestia.

Regla util:

- deuda que bloquea features o genera errores repetidos: alta prioridad,
- deuda que solo “se ve fea” pero no frena nada: prioridad menor.

## Cuando Se Revisa La Deuda Tecnica

La deuda tecnica no se revisa una sola vez. Se revisa en varios momentos del ciclo.

### 1. Cuando aparece

En el momento en que notas:

- un atajo,
- una duplicacion,
- una decision temporal,
- una zona fragil,
- o algo que “sirve hoy pero despues va a doler”.

En ese momento ya conviene registrarla. No hace falta resolverla ahi mismo, pero si dejarla visible.

### 2. En refinamiento

Cuando se refina una historia o un epic, se revisa:

- si el cambio nuevo va a apoyarse en una base fragil,
- si conviene arreglar primero una deuda relacionada,
- o si la historia nueva va a crear deuda adicional.

Aqui la pregunta clave es:

- `¿Podemos construir esto bien sobre lo que ya existe o estamos pateando un problema mayor?`

### 3. En planning

En la planificacion del sprint se decide:

- que deuda tecnica entra,
- cual puede esperar,
- y cual debe ir pegada a una feature porque toca la misma zona.

Buena practica:

- reservar una parte de la capacidad del sprint para deuda tecnica.

### 4. Durante implementacion

Mientras se programa, tambien se revisa deuda tecnica:

- si el cambio revela un acoplamiento oculto,
- si obliga a tocar demasiadas capas,
- si aparecen reglas duplicadas,
- o si una solucion limpia costaria poco mas que el parche rapido.

Aqui muchas veces nace deuda nueva. La regla profesional no es fingir que no existe. Es decirlo y dejarla explicitada.

### 5. En code review o auto-review

Antes de cerrar una historia conviene revisar:

- que deuda nueva deja,
- si es aceptable,
- si quedo documentada,
- y si debe salir como item posterior.

### 6. En review y retro

Despues del sprint o bloque, la deuda se revisa desde el aprendizaje:

- que retrabajo genero,
- que bugs se repitieron,
- que partes del sistema estan frenando velocidad,
- y que deberiamos atacar antes del siguiente bloque.

### 7. Antes de release

Antes de desplegar conviene mirar si queda deuda tecnica peligrosa para ese release:

- seguridad,
- integridad de datos,
- permisos,
- migraciones,
- configuracion,
- rollback,
- observabilidad,
- o compatibilidad.

No toda deuda bloquea release, pero la deuda con riesgo operacional si merece una pausa real.

### 8. En revisiones periodicas de arquitectura

Ademas del sprint, conviene hacer una revision mas amplia cada cierto tiempo, por ejemplo mensual o por bloque grande, para ver:

- hotspots repetidos,
- modulos demasiado grandes,
- deuda acumulada por varias features,
- zonas sin pruebas,
- o decisiones temporales que ya se volvieron permanentes.

## La Deuda Tecnica Deberia Existir O No

La respuesta profesional es:

- idealmente, la deuda tecnica innecesaria no deberia existir,
- pero en la practica siempre existira algo de deuda tecnica.

El objetivo no es llegar a `cero deuda` de forma literal. El objetivo es:

- que la deuda sea consciente,
- visible,
- acotada,
- y gestionada.

## Cuando Es Aceptable Que Exista

Puede ser aceptable cuando:

- el negocio necesita mover algo pequeno rapido,
- el atajo es realmente temporal,
- el riesgo esta entendido,
- la zona afectada es acotada,
- no compromete datos, seguridad ni permisos,
- y queda documentada con criterio para revisarla despues.

Ejemplo sano:

- “vamos a dejar este adaptador temporal por dos sprints mientras terminamos la migracion del modulo”.

## Cuando Ya No Es Aceptable

No deberia tolerarse cuando:

- rompe o puede romper datos,
- afecta seguridad o autorizacion,
- deja estados ambiguos,
- complica cada feature nueva,
- genera incidentes repetidos,
- obliga a trabajo manual constante,
- o nadie entiende ya como funciona.

Tampoco es aceptable cuando la deuda ni siquiera esta nombrada. La deuda invisible es de las mas peligrosas.

## Regla Practica Para Decidir

Si descubres una deuda tecnica, hazte estas preguntas:

1. `¿Que riesgo real tiene?`
2. `¿A quien afecta?`
3. `¿Bloquea o encarece features proximas?`
4. `¿Se puede corregir ahora con poco costo?`
5. `¿Si no la resolvemos hoy, donde queda registrada y cuando la revisamos otra vez?`

Si no puedes responder la 5, no la estas gestionando; solo la estas pateando.

## Como Empezar Bien Desde El Principio En Proyectos Nuevos

Si arrancas otro proyecto desde cero, la mejor estrategia es prevenir mucha deuda antes de que nazca.

Desde el inicio conviene definir al menos:

- estructura del repo,
- vision y alcance,
- backlog inicial,
- convenciones de codigo,
- estrategia de entornos,
- migraciones,
- CI minima,
- Definition of Ready,
- Definition of Done,
- y una forma simple de registrar deuda tecnica.

Eso no evita toda la deuda. Pero evita la peor: la deuda silenciosa y estructural.

## Cadencia Scrum Recomendada Para Tu Contexto

Si hoy el equipo es pequeño o practicamente eres tu, te recomiendo algo simple:

### Sprint

- 1 semana o 2 semanas maximo.

### Refinamiento

- 30 a 60 minutos por semana.

### Planning

- elegir solo lo que de verdad puede terminarse completo.

### Daily

- aunque sea solo contigo:
  - que hice,
  - que sigue,
  - que me bloquea.

### Review

- demo breve del valor entregado.

### Retro

- que debemos repetir,
- que debemos dejar de hacer,
- que debemos empezar a hacer.

## Como Se Veria Aplicado A Novogar

Ejemplo de epics razonables para el siguiente periodo:

- reportería financiera y operativa por sociedad y moneda,
- mejoras en workflow de tramites y aprobaciones,
- operacion de reservas y transferencias,
- fortalecimiento de archivos y previews,
- endurecimiento de calidad y observabilidad.

Ejemplo de mezcla sana en un sprint:

- 1 historia funcional de alto valor,
- 1 historia de soporte o arquitectura cercana,
- 1 item de deuda tecnica pequena,
- y tiempo real para pruebas, docs y release.

## Errores Comunes Que Conviene Evitar

- arrancar a programar antes de definir el problema,
- convertir cada idea en feature sin priorizacion,
- meter deuda tecnica “oculta” dentro de features sin decirlo,
- dejar migraciones o permisos para el final,
- decir “done” sin pruebas ni smoke,
- y abrir demasiadas cosas al mismo tiempo.

## Plan Minimo Recomendado Desde Hoy

Si quieres empezar a usar este enfoque sin burocracia, el plan minimo es:

1. Crear un backlog unico.
2. Definir 3 a 5 epics maximo para el proximo bloque.
3. Elegir un sprint corto.
4. Partir cada epic en historias pequenas.
5. Aplicar `Definition of Ready` antes de meter algo al sprint.
6. Aplicar `Definition of Done` antes de dar algo por cerrado.
7. Mantener visible la deuda tecnica junto con el backlog funcional.

## Resumen Practico

La forma ideal de construir un programa como Novogar no es:

- primero programar mucho,
- despues ordenar,
- y al final intentar meter proceso.

La forma sana es:

- base tecnica desde temprano,
- backlog visible,
- epics claros,
- historias pequenas,
- calidad integrada al flujo,
- y aprendizaje continuo.

Si el proyecto va a seguir creciendo, lo mas importante no es solo agregar features. Es crear una manera estable de decidir, construir y cerrar cada una.
