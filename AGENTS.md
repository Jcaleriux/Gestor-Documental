# Agent Guide

## Repo Overview

- Root repo: `C:\Jose\Proyecto Novogar`
- Backend: `backend/`
- Frontend: `frontend/`
- Business reference docs: `docs/`
- Local operational storage: `documentos/`, `archivos/`

## Working Conventions

- App copy, functional docs, and canonical business terms stay in Spanish.
- Technical structure, generic abstractions, and reusable helpers stay in English.
- Keep canonical domain terms in Spanish when they are already part of the app, API, DB, or workflow: `factura`, `tramite`, `sociedad`, `proveedor`, `notaCredito`, `retencion`, `moneda`.
- Do not rename routes, tables, payloads, or columns just to translate them.
- Review `docs/convenciones_idioma_codigo.md` before renaming mixed-language code.
- Review `docs/principios_transversales.md` before changing money, totals, conversions, dashboards, or payment workflows.

## Architecture Notes

- Backend is Node.js + Express + PostgreSQL.
- Frontend is React + Vite.
- PostgreSQL connection is still configured directly in `backend/db/index.js`.
- Frontend routes already use lazy loading from `frontend/src/App.jsx`; preserve that pattern when adding large screens.
- Recent SRP slices already extracted view helpers and hooks for `reservas`, `facturas`, `notasCredito`, and `tiquetes`.

## Safety Rules

- Treat `documentos/` and `archivos/` as local operational data, not source code.
- `backend/scripts/reset_documentos.js` and `npm run db:reset` are destructive.
- Do not widen HTTP contracts, DB schema, or permission rules as part of cleanup refactors unless explicitly requested.
- Prefer incremental refactors by vertical slice over broad rewrites.

## SOLID Autonomy Policy

Default mode for unattended cleanup is: preserve public behavior, improve internal structure, and escalate only when the refactor starts affecting contracts, business rules, or operational risk.

### Safe To Do Without Asking

- Split large UI screens into smaller view components, hooks, helpers, and adapters.
- Extract transport parsing out of components and into API services.
- Split backend services or use cases into narrower internal modules while keeping the same public factory and route behavior.
- Add or improve targeted tests, small docs, and internal helper files.
- Normalize names inside a local module when the change stays internal and improves clarity.
- Add low-risk performance improvements such as route-level lazy loading when behavior remains equivalent.
- Commit and push each validated slice to the current feature branch.

### Always Escalate To The User

- Any DB schema change, migration, seed change, or data backfill.
- Any route, payload, response shape, permission, auth, or workflow-state change.
- Any refactor that changes user-visible business behavior, not just structure.
- Any large rename that crosses modules, folders, or domain boundaries.
- Any new dependency, framework shift, or cross-cutting build/tooling change with tradeoffs.
- Any destructive action touching operational files, documents, or reset scripts.

### Preferred Unattended Workflow

1. Choose one vertical slice or hotspot, not the whole app at once.
2. Preserve the existing public contract and move responsibilities behind narrower modules.
3. Validate the touched area with targeted tests and the relevant build or backend check.
4. Commit with a focused message and push to the active branch.
5. Only continue to the next slice if the worktree is clean and the previous slice is stable.

### Good SOLID Targets In This Repo

- Large frontend screens that still mix rendering, orchestration, filters, and transport logic.
- Backend service modules that coordinate business rules, filesystem access, and repository calls in one file.
- Repeated UI table/filter/report patterns that can share helpers without changing business contracts.
- Repositories that expose too many concerns and need narrower query boundaries.

### Stop And Reconfirm If

- The refactor reveals unclear business intent or conflicting domain names.
- The safest solution appears to require changing contracts instead of internals.
- There are unexpected user edits in the same files that would make ownership unclear.
- Validation shows a regression that is not obviously structural.

## Validation Commands

### Backend

From repo root or inside `backend/`:

- Install deps: `pnpm install`
- Run API: `pnpm --dir backend run dev`
- Run all tests: `pnpm --dir backend run test`
- Run one Jest file directly: `node node_modules/jest/bin/jest.js --runInBand __tests__/reservasUseCases.test.js`
- Check DB structure: `pnpm --dir backend run db:check`

### Frontend

From repo root or inside `frontend/`:

- Install deps: `pnpm install`
- Run app: `pnpm --dir frontend run dev`
- Production build: `pnpm --dir frontend run build`
- Run full test runner: `pnpm --dir frontend run test`
- Run targeted tests directly when sandboxed Node spawn causes `EPERM`:
  - `node tests/hooks/useFacturas.test.js`
  - `node tests/hooks/useAppSession.test.js`
  - `node tests/facturas/facturasPageHelpers.test.js`

## Refactor Workflow

- Keep UI components focused on rendering and view state.
- Move orchestration and transport logic into hooks, services, or adapters.
- Keep backend use-case facades thin and move filesystem/crypto/data concerns behind narrower modules.
- Commit each validated slice with a focused message, then push the branch.
- Prefer working on feature branches, not directly on `main`.

## Quick Checks Before Finishing

1. Did the touched slice keep user-visible behavior intact?
2. Did tests or at least targeted checks run for the modified area?
3. Did the change preserve currency context for monetary values?
4. Did new names follow the Spanish-domain / English-technical rule?
5. Did the refactor avoid hidden contract changes?
