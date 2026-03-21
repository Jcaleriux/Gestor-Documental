# Gestion De Producto En El Repo

Este directorio es la base operativa para gestionar el crecimiento de `Proyecto Novogar` dentro del repo.

## Objetivo

Evitar que ideas, prioridades, deuda tecnica y decisiones de roadmap vivan solo en memoria o en chats.

## Fuente de verdad recomendada

Mientras no se use una herramienta externa como Jira, la fuente de verdad operativa debe ser:

- `04_backlog.md` para trabajo vivo,
- `epics/` para iniciativas grandes,
- `sprints/` para planificacion de ejecucion,
- y `historico/` para contexto ya cerrado.

## Orden recomendado de lectura

1. `01_vision_producto.md`
2. `02_product_goals.md`
3. `03_roadmap.md`
4. `04_backlog.md`
5. `05_guia_prompts_codex.md`
6. `06_versionado_y_releases.md`
7. `epics/`

## Regla simple

- backlog actual: lo pendiente, priorizable y accionable,
- historico: solo lo cerrado que aun aporta contexto,
- templates: punto de partida para items nuevos.

## Guia de prompts

Antes de pedir trabajo nuevo a Codex, conviene revisar:

- `05_guia_prompts_codex.md`

Ese archivo incluye prompts recomendados para:

- refinar epics,
- implementar features,
- pedir sesiones largas,
- trabajar deuda tecnica,
- planificar sprints,
- cerrar items,
- y decidir cuando conviene Plan mode.

## Si luego migras a Jira

La recomendacion es mantener en el repo:

- vision,
- goals,
- roadmap,
- epics de contexto,
- y deuda tecnica estructural.

Y mover a Jira, si lo deseas, la operacion diaria:

- sprint activo,
- historias,
- bugs,
- y asignaciones.
