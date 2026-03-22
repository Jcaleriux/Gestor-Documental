# Guia De Prompts Para Trabajar Con Codex

## Objetivo

Esta guia sirve para pedir trabajo a Codex de forma clara, repetible y alineada con la estructura de producto del repo.

La idea no es escribir prompts perfectos o largos. La idea es:

- pedir mejor,
- reducir ambiguedad,
- y hacer mas facil que Codex implemente, refine o planifique sin perder contexto.

## Regla Base

Lo mas util normalmente es pedirle trabajo a Codex usando:

- un `Epic` cuando quieres descubrir, dividir o priorizar,
- un `FEAT-*` o `TECH-*` cuando quieres que implemente algo concreto,
- un `Sprint` cuando quieres planificar o revisar capacidad,
- y un `bug` o incidencia cuando quieres diagnosticar y corregir algo ya visible.

## Nivel Correcto Para Pedir Trabajo

### Cuando usar un epic

Usa un `epic` cuando quieras:

- bajar una iniciativa grande a PBIs o historias,
- revisar alcance,
- analizar riesgos,
- decidir orden de ejecucion,
- o evaluar si algo todavia esta muy grande para implementarlo.

### Cuando usar un feature o PBI

Usa un `FEAT-*` cuando quieras:

- implementar algo con valor visible,
- trabajar un slice concreto,
- agregar pruebas,
- validar,
- y cerrar una pieza real del backlog.

### Cuando usar un item de deuda tecnica

Usa un `TECH-*` cuando quieras:

- corregir una fragilidad tecnica concreta,
- mejorar mantenibilidad,
- sanear una base necesaria para features futuras,
- o reducir riesgo operativo.

### Cuando usar un sprint

Usa el `sprint` cuando quieras:

- decidir que entra y que no entra,
- balancear features y deuda tecnica,
- revisar capacidad,
- o cerrar el estado real de un bloque de trabajo.

## Estructura Minima Recomendada Del Prompt

La mayoria de prompts utiles para Codex pueden seguir esta estructura:

```text
Trabajemos [ID o tema].

Contexto:
- Referencia principal: [...]
- Objetivo: [...]
- Alcance de esta sesion: [...]
- Restricciones: [...]
- No hacer: [...]
- Validacion esperada: [...]

Quiero que:
1. revises el contexto relevante,
2. hagas el trabajo,
3. agregues o ajustes pruebas si aplica,
4. ejecutes validaciones relevantes,
5. y actualices backlog/sprint/docs si corresponde.
```

No siempre hace falta llenar todo. Pero mientras mas importante o ambigua sea la tarea, mas ayuda dar este contexto.

## Prompts Estandar Recomendados

## 1. Refinar un epic

Usa esto cuando quieres bajar una iniciativa grande a trabajo accionable.

```text
Revisa [EPIC-ID] en docs/producto/epics.
Quiero que lo refines y propongas PBIs o historias pequenas, orden recomendado, riesgos, dependencias y una recomendacion de que deberia entrar primero.
No implementes todavia.
Actualiza la documentacion de producto si hace falta.
```

## 2. Convertir una idea suelta en backlog

Usa esto cuando todavia no tienes ID formal.

```text
Tengo esta idea: [idea].
Quiero que la conviertas en una propuesta de trabajo para el repo.
Necesito que me digas si esto deberia ser epic, feature, bug o deuda tecnica; que problema resuelve; que impacto tecnico tendria; y donde deberia vivir en docs/producto.
No implementes todavia.
```

## 3. Implementar una feature o PBI

Este es uno de los prompts mas utiles para el trabajo diario.

```text
Trabajemos [FEAT-ID].

Contexto:
- Referencia principal: [epic o archivo]
- Objetivo: [resultado esperado]
- Alcance de esta sesion: [que si quieres hacer hoy]
- Restricciones: [compatibilidad, no romper contratos, etc.]
- Validacion esperada: pruebas dirigidas y validaciones locales relevantes

Quiero que:
1. revises el contexto,
2. implementes la mejor Fase 1 posible si no cabe todo,
3. agregues o ajustes pruebas,
4. ejecutes validaciones,
5. y actualices backlog/sprint/docs si aplica.
```

## 4. Trabajar una deuda tecnica

```text
Trabajemos [TECH-ID].

Quiero que la ataques en la mejor Fase 1 segura posible.
Si no se puede cerrar completa, deja residual explicito.
No rompas contratos ni comportamiento visible sin justificarlo.
Agrega validaciones y actualiza backlog/epic si aplica.
```

## 5. Diagnosticar y arreglar un bug

```text
Tengo este problema: [descripcion].

Contexto:
- Pantalla o modulo: [...]
- Como reproducirlo: [...]
- Comportamiento esperado: [...]
- Evidencia: [error, screenshot, log]

Quiero que:
1. diagnostiques la causa real,
2. implementes el arreglo,
3. agregues prueba de regresion si aplica,
4. ejecutes validaciones,
5. y me digas si esto deberia registrarse tambien como bug o deuda tecnica en el backlog.
```

## 6. Hacer code review

```text
Haz review de este cambio con mentalidad de riesgo y regresion.
Quiero findings primero, luego preguntas o supuestos, y al final un resumen breve.
Enfocate en bugs, permisos, contratos, schema, estados, workflow y pruebas faltantes.
```

## 7. Armar o ajustar un sprint

```text
Armemos [SPRINT-ID].
Usa [items o epics] como base.
Quiero propuesta realista de objetivo del sprint, alcance, riesgos, dependencias y que deberia quedar fuera.
No implementes todavia.
Actualiza docs/producto/sprints y el backlog si hace falta.
```

## 8. Cerrar o actualizar el estado de trabajo

```text
Actualiza el estado de [FEAT-ID / TECH-ID / SPRINT-ID] con el resultado real.
Quiero que reflejes:
- que se hizo,
- que validaciones pasaron,
- que quedo pendiente,
- y si hay residual o follow-up.
No implementes nada nuevo salvo cambios documentales minimos.
```

## 9. Revisar prioridad de backlog

```text
Revisa docs/producto/04_backlog.md y los epics relacionados.
Quiero una recomendacion de prioridad realista para lo siguiente, explicando valor, riesgo y dependencias.
Si hace falta, propon ajustes concretos al backlog.
No implementes todavia.
```

## 10. Preparar una fase tecnica antes de implementarla

```text
Antes de implementar [ID o tema], quiero una propuesta tecnica corta.
Explica:
- problema real,
- modulos tocados,
- riesgos,
- estrategia incremental,
- validaciones,
- y si esto pide Plan mode o implementacion directa.
No implementes todavia.
```

## Prompt Corto Ideal Para El Dia A Dia

Si no quieres escribir mucho, esta es una forma muy buena:

```text
Trabajemos [ID].
Referencia principal: [archivo].
Objetivo de esta sesion: [resultado].
Restricciones: [si existen].
Quiero implementacion, pruebas, validacion y actualizacion de docs de producto si aplica.
```

## Sesiones Largas

## Que es una sesion larga

Una sesion larga es un pedido donde no esperas solo una respuesta corta o un arreglo puntual, sino trabajo sostenido dentro del mismo turno con varios pasos encadenados.

Normalmente una sesion larga incluye varias de estas cosas:

- diagnostico,
- plan o estrategia incremental,
- implementacion,
- pruebas,
- validaciones,
- actualizacion de backlog o sprint,
- y cierre con residual o siguientes pasos.

No significa “hacer un epic entero de una vez”. Significa pedir un bloque importante pero todavia gobernable.

## Cuando Si Conviene Pedir Una Sesion Larga

Puedes usar un prompt de sesion larga cuando:

- un item toca varias capas como backend, frontend, DB y docs;
- quieres que se haga el trabajo de punta a punta en la misma sesion;
- el cambio necesita diagnostico inicial antes de implementar;
- quieres una Fase 1 completa y bien cerrada;
- estas atacando una deuda tecnica importante por slices;
- estas estabilizando un modulo con varias validaciones;
- o quieres cerrar un bloque real del backlog y dejarlo reflejado en la documentacion.

Ejemplos buenos de sesion larga:

- una feature que toca backend + frontend + pruebas,
- una deuda tecnica estructural con migracion o cambios de flujo,
- una investigacion con arreglo y validacion,
- o el cierre de un sprint/documentacion despues de varias implementaciones.

## Cuando No Conviene Pedir Una Sesion Larga

No hace falta una sesion larga cuando:

- el cambio es un bug pequeno y localizado,
- solo quieres una explicacion rapida,
- solo quieres actualizar una linea de documentacion,
- o el trabajo todavia esta demasiado ambiguo y primero necesita refinamiento.

En esos casos suele ser mejor:

- un prompt corto,
- o Plan mode primero si todavia no esta claro que deberia hacerse.

## Regla Practica

Usa una sesion larga cuando tu expectativa real sea:

- `quiero que avances de principio a fin dentro de este bloque y me dejes algo estable`

y no solo:

- `quiero una respuesta o un arreglo pequeno`.

## Prompt Estandar Para Sesion Larga De Implementacion

```text
Trabajemos [ID] en una sesion larga.

Contexto:
- Referencia principal: [epic, backlog o archivo]
- Objetivo de negocio o tecnico: [...]
- Alcance de esta sesion: [...]
- Restricciones: [...]
- No hacer: [...]
- Validacion esperada: [...]

Quiero que:
1. revises el contexto y el problema real,
2. propongas una estrategia incremental breve si hace falta,
3. implementes de punta a punta la mejor Fase 1 posible,
4. agregues o ajustes pruebas,
5. ejecutes validaciones relevantes,
6. actualices backlog/sprint/docs si aplica,
7. y cierres con residual y siguiente paso recomendado.
```

## Prompt Estandar Para Sesion Larga De Deuda Tecnica

```text
Trabajemos [TECH-ID] en una sesion larga.

Quiero que la ataques de forma profesional y segura:
- diagnostico corto,
- estrategia incremental,
- implementacion,
- pruebas,
- validaciones,
- y actualizacion de backlog o epic.

Si no cabe completa, cierra la mejor Fase 1 posible y deja el residual bien explicado.
```

## Prompt Estandar Para Sesion Larga De Bug O Estabilizacion

```text
Tengo este problema: [descripcion].
Quiero trabajar esto como sesion larga.

Necesito que:
1. diagnostiques causa real,
2. identifiques alcance tecnico,
3. implementes el arreglo,
4. agregues prueba de regresion si aplica,
5. ejecutes validaciones,
6. y me digas si esto abre follow-up en backlog o deuda tecnica.
```

## Prompt Estandar Para Sesion Larga De Cierre Operativo

```text
Quiero una sesion larga de cierre para [sprint, epic o bloque].

Necesito que:
1. revises lo hecho,
2. actualices backlog, sprint y docs,
3. identifiques residual real,
4. propongas el siguiente bloque recomendado,
5. y dejes el estado del proyecto claro para retomar despues.
```

## Que Ayuda Mucho Aclarar En Una Sesion Larga

- si quieres implementacion directa o primero una mini estrategia,
- cuanto alcance quieres realmente en esa sesion,
- si aceptas una Fase 1 segura,
- si quieres que actualice backlog y sprint al final,
- y si hay algo que prefieres no tocar aunque este cerca del problema.

## Riesgo Comun En Sesiones Largas

El error mas comun es pedir demasiado alcance sin partirlo.

Ejemplo riesgoso:

- “implementa todo el epic completo”.

Mejor forma:

- “trabajemos este epic como sesion larga de refinamiento”
- o
- “trabajemos FEAT-001 como sesion larga de implementacion”.

## Sesiones Largas Y Plan Mode

Una sesion larga no implica automaticamente Plan mode.

### Sesion larga con Plan mode

Conviene cuando:

- el problema aun no esta bien partido,
- hay varias rutas posibles,
- quieres decidir alcance antes de codificar,
- o el item sigue demasiado grande o ambiguo.

### Sesion larga sin Plan mode

Conviene cuando:

- el item ya esta claro,
- quieres ejecucion completa,
- y esperas implementacion con pruebas y validaciones en el mismo turno.

## Recomendacion Para Tu Caso

En Novogar puedes usar prompts de sesion larga sobre todo para:

- `FEAT-*` medianos que tocan varias capas,
- `TECH-*` importantes,
- estabilizaciones de modulos,
- y cierres de bloque con actualizacion de producto.

No los usaria para:

- cambios minimos,
- preguntas conceptuales breves,
- o ideas todavia verdes sin refinamiento.

## Cosas Que Ayuda Mucho Decirme

- el ID del item si ya existe,
- si quieres solo analisis o tambien implementacion,
- que no quieres tocar,
- si hay una evidencia concreta como screenshot o error,
- si quieres Fase 1 segura en vez de solucion grande,
- y si esperas que actualice backlog, epic o sprint al final.

## Cosas Que Conviene Evitar En El Prompt

- “arregla esto” sin contexto si el problema es ambiguo,
- pedir implementar un epic entero en una sola sesion,
- mezclar 5 objetivos distintos en un mismo pedido,
- o no decir si quieres solo analisis o ejecucion real.

## Cuando Conviene Activar Plan Mode

Plan mode es mejor cuando el trabajo todavia no deberia ir directo a codigo.

### Si conviene usar Plan mode

- refinamiento de epics
- priorizacion de backlog
- planning de sprint
- decisiones con varias rutas y tradeoffs
- arquitectura o estrategia incremental
- trabajo grande y ambiguo que necesita partirse primero
- decidir si algo es feature, bug o deuda tecnica

### No hace falta Plan mode

- implementar un `FEAT-*` claro y acotado
- corregir un bug concreto
- trabajar una deuda tecnica concreta ya entendida
- actualizar documentacion
- ejecutar validaciones
- hacer un arreglo puntual con contexto claro

### Regla practica

Si la pregunta principal es:

- `¿Que deberiamos hacer y como partirlo?`

entonces Plan mode suele ayudar.

Si la pregunta principal es:

- `Ya sabemos que hacer, ahora ejecutalo`

entonces normalmente no hace falta Plan mode.

## Recomendacion Para Tu Caso

Para Novogar, mi recomendacion es:

- usar `Plan mode` para epics, roadmap, backlog, sprints y decisiones de arquitectura,
- usar modo normal para features, bugs y deuda tecnica concreta,
- y pedirme siempre al final que actualice la documentacion de producto cuando el trabajo cambie el estado real del backlog.

## Flujo Recomendado De Trabajo Contigo

1. Idea o necesidad nueva.
2. Si esta verde: pedir refinamiento o clasificacion.
3. Si ya esta clara: crear o usar ID en backlog.
4. Pedirme implementacion por `FEAT-*` o `TECH-*`.
5. Pedirme actualizar backlog/sprint al cierre.

## Resumen Practico

La mejor forma de trabajar conmigo en este repo es:

- estrategia por `epic`,
- ejecucion por `feature`, `bug` o `tech-debt`,
- y control de avance por `sprint`.

Si mantienes esa disciplina, el sistema crece con mucha mas claridad y menos ruido.
