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

## Validation Commands

### Backend

From `backend/`:

- Install deps: `npm install`
- Run API: `npm run dev`
- Run all tests: `npm test`
- Run one Jest file directly: `node node_modules/jest/bin/jest.js --runInBand __tests__/reservasUseCases.test.js`
- Check DB structure: `npm run db:check`

### Frontend

From `frontend/`:

- Install deps: `npm install`
- Run app: `npm run dev`
- Production build: `npm run build`
- Run full test runner: `npm test`
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
