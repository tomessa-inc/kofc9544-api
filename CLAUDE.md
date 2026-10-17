# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Local development (port 3000, ts-node with DEBUG=sequelize:sql*)
npm run start

# Watch mode with auto-restart
npm run develop

# Build TypeScript to dist/ (also copies views/ and package.json)
npm run build

# Unit tests (src/test/unit/**, ts-node, no build needed, <1s)
npm run test:unit
npm run test:unit:watch
npm run test:coverage   # coverage of mapper/controllers/utils/service, report in build/coverage

# Legacy test run (requires build first — runs from dist/test/)
npm test

# Deploy
npm run deploy-stage
npm run deploy-production
```

To run a single unit test file: `TS_NODE_TRANSPILE_ONLY=true npx mocha --spec src/test/unit/mapper/team.mapper.test.ts`.

A PostToolUse hook in `.claude/settings.json` runs `npm run test:unit` after every edit to business-logic code and blocks on failures. Every new or changed function needs a unit test. See the testing section of the `mvc-solid` skill for the stub helpers and conventions.

## Architecture

**Runtime targets**: Local H3 server (`src/app.local.ts`) and AWS Lambda via `serverless-http` (`src/lambda.ts`). Both wrap `src/app.ts` with `toNodeHandler(app)`; `app.ts` is a `new H3()` that `mount()`s one `new H3()` sub-app per file in `src/routes/`.

**h3 v2** (ESM-only, loaded from this CommonJS build via Node's `require(esm)`, so Node >= 22 locally and the `nodejs22.x` Lambda runtime; tsconfig uses `module: nodenext`). Use the v2 APIs, not the deprecated v1 aliases: `defineHandler`, `event.res.status = 500` (not `setResponseStatus`), `event.req.headers.get()` (not `getHeader`), `event.req.formData()` (not `readFormData`), `readBody<T>(event)` (returns `undefined` for GET/empty bodies), `toNodeHandler` (not `toNodeListener`), `mockEvent` in tests. Routes sharing a path must use the same param name (see `src/routes/media.routes.ts`).

**Request flow (target)**: Route → Controller → Service → Mapper → DB/AWS SDK. Follow the `mvc-solid` skill (`.claude/skills/mvc-solid/SKILL.md`) for all new or changed code: layered MVC and SOLID principles.

- **Routes** (`src/routes/`): Define H3 routers with path + controller method bindings only. Entry point `src/routes/index.ts` mounts all sub-routers.
- **Controllers** (`src/controllers/`): Thin h3 v2 `defineHandler()` wrappers — read request params/body, validate input, call one service method, map errors to HTTP status, return response using utils in `src/utils/response.ts`. No queries or business rules.
- **Services** (`src/service/`): Business logic and workflows that span multiple mappers. Receive mappers via constructor (interfaces), export a default singleton. No `h3` imports.
- **Mappers** (`src/mapper/`): Data access only. Extend `BaseMapper`. One mapper per entity; build Drizzle queries and run them via `getSQLData`, or wrap AWS SDK calls (S3, SES, CloudFront). Legacy mappers still contain business logic — migrate it into services incrementally when touching a feature.
- **Models** (`src/models/`): The codebase is mid-migration from Sequelize to Drizzle ORM. New models use Drizzle schema definitions; legacy models use Sequelize. Mongoose is present but secondary.
- **DTOs / validators / errors**: Request/response types in `src/dto/`, input validation in `src/validators/`, domain errors (`NotFoundError`, `ConflictError`, …) in `src/errors/`. Services throw domain errors; controllers map them centrally.

**DB connections** (`src/db/`): Three ORM setups coexist — `Drizzle.ts`, `Sequelize.ts`, `Mongoose.ts`. Drizzle is the preferred path going forward.

**AWS integrations**: S3 (media storage), CloudFront (CDN invalidation), SES (email), Resource Groups Tagging API — all wrapped in dedicated mapper classes in `src/mapper/`.

## Environment

Requires a `.env` file with: `TOKEN_SECRET`, `STAGE`, `NODE_ENV`, `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`. See `sam-template.yaml` for the full set of environment variables injected at deploy time.

The expected local database is a MySQL database named `simpleplay`.

## Deployment

Uses AWS SAM (`sam-template.yaml`). Build output goes to `dist/`. The `postbuild` script copies `src/views/` and `package*.json` into `dist/` for Lambda packaging.