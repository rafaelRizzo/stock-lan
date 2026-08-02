# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a monorepo with two independent apps, no root package.json:

- `backend/` — Fastify + Prisma (PostgreSQL) + Redis API, run with Bun.
- `frontend/` — Vite + React 19 + TanStack Router/Query + shadcn/ui.

## Commands

### Backend (`cd backend`)

```bash
bun --watch src/server.ts     # dev server (or: bun dev)
bun test test/unit             # run all unit tests
bun test test/unit -t "name"   # run a single test by name pattern
bun test --coverage
biome check .                  # lint
biome check --write .          # lint + autofix
tsc --noEmit                   # typecheck
prisma generate                # regenerate Prisma client after schema.prisma changes
prisma migrate dev --name X    # create + apply a migration (only run when the user asks)
prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script
                                # preview pending schema changes against the live DB without migrating
```

Env vars are in `backend/.env` (see `.env.example`): `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`/`JWT_REFRESH_SECRET`, `CORS_ORIGINS`, `DOCS_ENABLED`. With `DOCS_ENABLED=true`, Scalar API docs are served at `/docs` (OpenAPI at `/openapi.json`).

### Frontend (`cd frontend`)

```bash
npm run dev         # vite dev server
npm run build        # tsc -b (project references) + vite build — this is the real typecheck, plain `tsc --noEmit` at root checks 0 files
npm run typecheck    # same caveat — prefer `tsc -b --noEmit` to actually check app + node configs
npm run lint          # eslint .
npm run format
```

## Backend architecture

Each domain lives in `src/modules/<name>/` with a consistent 4-file split:

- `<name>.schemas.ts` — Zod schemas (input validation + list/params schemas).
- `<name>.service.ts` — business logic, talks to Prisma directly (`src/lib/prisma.ts`), wraps multi-step writes in `prisma.$transaction(...)`.
- `<name>.controller.ts` — parses request with `parse(schema, request.body/params/query)` from `src/lib/errors.ts` (throws `AppError` on failure), calls the service, then invalidates cache keys, returns plain data (Fastify serializes it).
- `<name>.routes.ts` — registers routes on the Fastify instance with `preHandler: authenticate` (read) or `preHandler: requireRole(...)` (write) from `src/middlewares/auth.middleware.ts`. New modules must be imported and registered in `buildApp()` in `src/app.ts`.

The `catalog` module is a generic CRUD factory (`catalogService`/`createCatalogController`) driven by `catalogResources` (an array of `{ path, delegate, schema }`) for simple entities (quantity-types, products, debtors, expense-templates) — it does full CRUD + archive/restore/permanent-delete generically. Resource-specific business rules (e.g. expense template recurrence scheduling, product pricing rules) are special-cased inside `catalogService.create`/`update` by checking `resource.delegate`.

**Caching**: `src/lib/cache.ts` exports `getOrSetLocal(key, ttlSeconds, factory)` (in-process `node-cache`, used for reads) and `invalidate(...keys)` / `invalidatePrefix(prefix)` (called after writes). `invalidatePrefix` only clears the local cache, not Redis. Controllers invalidate broadly and defensively (e.g. `stock:`, `catalog:product:`, `reports:`, `dashboard` after almost any stock-affecting write).

**Auth**: JWT access + refresh tokens (`@fastify/jwt`), roles are `ADMIN | MANAGER | OPERATOR`. `requireRole(...)` in the middleware gates write endpoints per-role.

**Testing** (`test/unit/services.test.ts`, `test/unit/routes.test.ts`): Bun test runner. `mock.module("../../src/lib/prisma.js", () => ({ prisma: prismaMock }))` replaces the whole Prisma client with a hand-built object exposing only the delegates/methods a test touches; `$transaction` is mocked to just invoke its callback with `prismaMock` (no real transaction semantics). Service modules must be imported dynamically (`await import(...)`) *after* `mock.module` runs, or the mock won't take effect. `routes.test.ts` uses a fake Fastify app that just records `{method, url}` per `register*Routes` call and asserts the exact route list.

### Stock & production domain model

- `Product.type`: `RAW_MATERIAL | FINISHED | BOTH`. `priceSell` is nullable and is **required unless the product is `RAW_MATERIAL`** — enforced in `catalogService.create`/`update` via `resolveProductPricing`, not in the Zod schema (Zod schema keeps `priceSell` plain-optional because `catalog.controller.ts` calls `resource.schema.partial()` for updates, which requires a plain `ZodObject`, not a `.refine()`-wrapped one).
- `salesService.allocateItems` (`sales.service.ts`) rejects selling a `RAW_MATERIAL` product directly.
- `StockBatch` rows are FIFO-consumed (oldest `dateBuy` first) wherever stock is drawn down: sales (`sales.service.ts:allocateItems`) and production consumption (`production.service.ts:consumeIngredients`) both implement the same "loop batches ordered by `dateBuy`, take `min(remaining, batch.quantityLeft)`" pattern independently — check both when changing FIFO behavior.
- `RecipeItem` is the bill-of-materials: `finishedProductId` → `rawProductId` + `quantityPerUnit` (no unit-conversion system — quantities are trusted to be in consistent units per raw product).
- `ProductionOrder` converts insumo → produto final: consumes the recipe's raw materials via FIFO (creates `StockMovement` type `OUT` per consumed batch), then creates a new `StockBatch` for the finished product with `supplierId: null` and `priceBuy` set to the *real* computed cost (`totalConsumedCost / quantityProduced`), plus a `StockMovement` type `IN`. Both movement types carry `productionOrderId` (a nullable FK, same pattern as `StockMovement.saleId`) instead of introducing new enum values.
- Editing a `ProductionOrder` (`productionService.update`) fully reverts the old consumption/output batch and re-runs consumption against the new input — blocked if the output batch already has `saleItems`. Same guard blocks `cancel`.

## Frontend architecture

- **Routing is not file-based.** `src/router.tsx` only defines `/`, `/setup`, `/dashboard`, and a catch-all `/dashboard/$` splat route. `src/components/dashboard/dashboard-screen.tsx` does the actual routing via a long `pathname === "..."` if/else chain that renders the matching page component. Adding a page requires: (1) the page component, (2) an import + `pathname === "/dashboard/..."` branch in `dashboard-screen.tsx`, (3) an entry in `src/components/dashboard/dashboard-navigation.ts` (`navigationGroups`), which also drives the sidebar and the header's page title (via `pageTitles`, built from the same array).
- **Per-domain layering**: `src/services/<domain>.service.ts` (plain async functions wrapping `src/lib/http.ts`'s axios instance, fully typed) → `src/hooks/<domain>/use-<domain>.ts` (TanStack Query `useQuery`/`useMutation`, mutations `invalidateQueries` on success and fire a toast via `src/lib/toast.ts`) → `src/components/<domain>/<domain>-page.tsx` (page + all its create/edit/delete dialogs in one file, no separate dialog files).
- **List page skeleton**: header block + filter bar + shadcn `Table` + pagination footer, repeated near-identically across every domain page. Loading state uses the shared `TableSkeletonRows` component (`src/components/shared/table-skeleton.tsx`) — pass a `columns` array describing each column's `variant` (`avatar` | `badge` | `actions` | `icon` | `button` | plain text) and `className`/`width` to mirror the real header, instead of one full-width pulsing bar.
- **`src/lib/http.ts`**: single axios instance with a request interceptor injecting the bearer token and a response interceptor that does a single in-flight refresh-token retry on 401 (dispatches `auth:expired` on the `window` if refresh fails, which `router.tsx` listens for). `getApiErrorMessage(error)` maps the backend's raw English `message` string to Portuguese via `apiErrorMessages` (exact match) → `dynamicApiErrorMessages` (regex-based, for messages that interpolate a name) → `fallbackApiErrorMessages` (by HTTP status). **Any new backend error string needs an entry here** or it falls back to a generic message.
- Numeric/currency inputs across the app use the same inline sanitizer (`value.replace(/[^0-9,]/g, "").replace(/(,.*),/g, "$1")`, comma as decimal separator) rather than a shared component.
- Related-entity `Select` pickers (e.g. product/supplier/quantity-type in a form) are populated by calling the domain's paginated list hook with `{ page: 1, limit: 100, status: "ACTIVE" }` — there's no dedicated "list all" endpoint.
