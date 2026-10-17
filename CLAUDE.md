# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Local server on port 9000 (ts-node)
npm run start

# Watch mode with auto-restart
npm run develop

# Build TypeScript to dist/ (also copies package*.json for Lambda packaging)
npm run build

# Unit tests (src/test/unit/**, ts-node, no build needed, <1s)
npm test                # same as npm run test:unit
npm run test:unit:watch
npm run test:coverage   # report in build/coverage

# Deploy
npm run deploy-stage
npm run deploy-production
```

To run a single test file: `TS_NODE_TRANSPILE_ONLY=true npx mocha --no-config --require ts-node/register --require src/test/unit/setup.ts --extension ts src/test/unit/mapper/golf.mappers.test.ts`.

A PostToolUse hook in `.claude/settings.json` runs the unit suite after every edit to a `.ts` file under `src/` and blocks on failures. Every new or changed function needs a unit test. See the `mvc-solid` skill for the test helpers and conventions.

## Architecture

Follow the `mvc-solid` skill (`.claude/skills/mvc-solid/SKILL.md`) for all new or changed code.

**Request flow**: Route → Controller → Service → Mapper → SQL executor / AWS SDK.

- **Routes** (`src/routes/`): one `new H3()` sub-app per file binding paths to controller methods; `src/app.ts` adds CORS and `mount()`s them.
- **Controllers** (`src/controllers/`): handlers wrapped in `controller()` (`controllers/controller.ts`), which turns thrown errors into responses via `handleError`. Each validates input, calls one service method, and returns a view.
- **Services** (`src/service/`): business logic and workflows. Dependencies are narrow `Pick<Mapper, ...>` slices received through the constructor; each module exports a default singleton.
- **Mappers** (`src/mapper/`): data access only, one per table (or AWS service: `cdn.mapper`, `mail.mapper`). Build queries with the Drizzle builder in `db/query-builder.ts` and run them through an injected `QueryExecutor` (`db/executor.ts`).
- **Models** (`src/models/`): Drizzle `mysqlTable` schemas only. Drizzle is the only ORM.
- **Views** (`src/views/`, `src/utils/response.ts`): the response envelope (`useResponseSuccess`, `usePagedListResponse`), CDN image URLs, and composed emails (`views/email/compose.ts`).
- **DTOs / validators / errors**: `src/dto/`, `src/validators/`, `src/errors/`. Services throw `AppError` subclasses; unexpected errors become a generic 500 so internals never reach clients.
- **Config** (`src/config/`): every environment variable is read here, at access time. Mail recipients are in `config/mail-recipients.ts`.

**Database access**: queries are not sent over a MySQL connection. `RdsProxyExecutor` posts the prepared statement (`{ sql, params }`) to the RDS SQL proxy at `RDS_HOST/RDS_DB`; failures throw.

**h3 v2** (ESM-only, loaded from this CommonJS build via Node's `require(esm)`, so Node >= 22 locally and the `nodejs22.x` Lambda runtime; tsconfig uses `module: nodenext`). Use the v2 APIs: `defineHandler`, `event.res.status`, `event.req.headers.get()`, `event.req.formData()`, `readBody<T>(event)` (undefined for GET/empty bodies), `toNodeHandler`, `mockEvent` in tests. Routes sharing a path must use the same param name (see `src/routes/media.routes.ts`).

**Drizzle tips**: `strictNullChecks` must stay on (Drizzle's insert/update types depend on it). Inside correlated `sql` subqueries, name outer columns literally (`team.id`, not `${team.id}`): Drizzle renders `${team.id}` unqualified in single-table selects, which binds to the subquery's table.

## Environment

Requires a `.env` file with `TOKEN_SECRET` (JWT signing; startup of auth fails without it), `STAGE`, `NODE_ENV`, `RDS_HOST`, `RDS_DB`. See `sam-template.yaml` for what is injected at deploy time.

Passwords are hashed with scrypt (`service/password.service.ts`; never store or compare them yourself). Legacy plain-text passwords still sign in and are re-hashed on that login; `npm run passwords:hash` (dry run) / `npm run passwords:hash -- --apply` hashes all remaining ones against the database in `RDS_HOST`/`RDS_DB`. Once that has run everywhere, the plain-text fallback in `PasswordService.verify` can be removed.

## Deployment

AWS SAM (`sam-template.yaml`, runtime `nodejs22.x`). Build output goes to `dist/`; `postbuild` copies `package*.json` there for Lambda packaging. Deploys must set `TOKEN_SECRET`.
