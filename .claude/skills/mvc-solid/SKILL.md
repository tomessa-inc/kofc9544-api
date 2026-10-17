---
name: mvc-solid
description: Architecture and coding standards for kofc9544-api. Use whenever adding or changing an endpoint, controller, service, mapper, model, or route; when refactoring existing code; or when the user asks about structure, layering, MVC, SOLID, or best practices in this repo.
---

# MVC + SOLID standards for kofc9544-api

This API is an H3 app that runs locally and on AWS Lambda. Every new or changed
feature uses the layered MVC structure below and follows SOLID. The existing
code mixes these concerns (most business logic sits in mappers today), so new
work moves toward this target one piece at a time.

## 1. Layers and what each one owns

```
Route ──▶ Controller ──▶ Service ──▶ Mapper ──▶ Model (Drizzle schema)
 (URL)     (HTTP in/out)   (business    (data access   (table shape
                            rules)       only)          + types)
                ▲
                └── View: response shaping (src/utils/response.ts, src/views/*.ejs)
```

| Layer | Location | Owns | Must NOT |
|---|---|---|---|
| **Route** | `src/routes/<domain>.routes.ts` | URL + HTTP verb → controller method | Contain logic, parse bodies |
| **Controller** (C) | `src/controllers/<domain>.controller.ts` | Read params/body, call validator, call **one** service method, map errors to HTTP status, return a View | Run queries, import models or `drizzle-orm`, hold business rules, send email directly |
| **Service** | `src/service/<domain>.service.ts` | Business rules, workflows across several mappers (e.g. register team → create players → send email), transactions | Import `h3`, read `event`, set status codes, build SQL |
| **Mapper** (data access) | `src/mapper/<entity>.mapper.ts` | Build Drizzle queries for **one** entity/table and run them via `getSQLData`; AWS SDK wrappers (S3, SES, CloudFront) | Hold business rules, call other domain mappers, know about HTTP |
| **Model** (M) | `src/models/<Entity>.ts` | Drizzle `mysqlTable` schema + inferred types | Hold behaviour |
| **View** (V) | `src/utils/response.ts`, `src/dto/`, `src/views/*.ejs` | Response envelope (`useResponseSuccess`, `useResponseError`, `usePageResponseSuccess`), DTOs that pick the public fields, email templates | Hold logic beyond formatting |

Types shared between layers (request DTOs such as `OptionsPlayer`) live in
`src/dto/<domain>.dto.ts`, not in a controller. Mappers and services must
never import from `src/controllers/`.

## 2. SOLID, applied to this codebase

**S: Single Responsibility**
- One controller per resource area, one service per business domain, one mapper per table/entity.
- A function does one thing. When a method validates *and* queries *and* emails (like `apiRegisterTournament` today), split it: the controller validates, the service orchestrates, the mappers persist, and `mailMapper` sends.
- No `console.log` debugging left in committed code.

**O: Open/Closed**
- Extend behaviour by adding a class or strategy, not by adding `if (type === ...)` branches to shared code. Example: a new email type is a new template/config entry, not another branch inside `MailMapper`.
- `BaseMapper` holds only behaviour that is truly common to all mappers. Don't change it to suit one subclass.

**L: Liskov Substitution**
- A subclass of `BaseMapper` (or of any base class) must work wherever the base is expected. Don't override a method to throw, or change what its arguments or return value mean.
- Mapper methods return typed data (`Promise<Team[]>`), never sometimes-data, sometimes-error-string.

**I: Interface Segregation**
- Define small interfaces for what a consumer actually needs (`TeamReader { findById(id) }`) instead of passing the whole mapper.
- Split oversized option bags such as `paramsOptions` into purpose-specific types (`PaginationParams`, `SearchParams`).

**D: Dependency Inversion**
- Services depend on mapper **interfaces**, received through the constructor. The module still exports a default singleton (matching the existing `export const teamMapper = new TeamMapper()` style), so callers stay simple and tests can inject fakes.
- Config (secrets, hosts) comes from `process.env` through one config module. Never hard-code it. The literal JWT secret in `BaseMapper.generateAccessToken` is a known violation to fix.

```ts
// src/service/registration.service.ts
import type { TeamWriter } from "../mapper/team.mapper";
import type { PlayerWriter } from "../mapper/golf.mapper";
import type { Mailer } from "../mapper/mail.mapper";
import { teamMapper, golfMapper, mailMapper } from "../mapper";
import { ConflictError } from "../errors";
import type { RegistrationDto } from "../dto/golf.dto";

export class RegistrationService {
    constructor(
        private readonly teams: TeamWriter,
        private readonly players: PlayerWriter,
        private readonly mailer: Mailer,
    ) {}

    public async register(dto: RegistrationDto) {
        let teamId: string | undefined;

        if (dto.players.length >= 2) {
            const created = await this.teams.createTeam(dto.teamName, dto.players[0].player);
            if (!created) throw new ConflictError("Team name already exists");
            teamId = created.id;
        }

        await this.players.createPlayers(dto.players, teamId);
        await this.mailer.sendRegistration(dto);
        return { teamId };
    }
}

export const registrationService = new RegistrationService(teamMapper, golfMapper, mailMapper);
```

## 3. Controller pattern

Controllers stay thin. Each handler reads input, validates it, calls one
service method, and returns a View.

```ts
// src/controllers/golf.controller.ts
export class GolfController {
    public static apiRegisterTournament = defineHandler(async (event) => {
        try {
            const dto = validateRegistration(await readBody<unknown>(event));
            const result = await registrationService.register(dto);
            return useResponseSuccess(result);
        } catch (error) {
            return handleError(event, error);
        }
    });
}
```

- Use `getRouterParams`, `readBody` and `event.req`/`event.res` only in controllers. This is h3 v2: use `defineHandler` and `event.res.status = n`, not the deprecated v1 `defineEventHandler`/`setResponseStatus`.
- Put error-to-status mapping in a single `handleError(event, error)` helper (in `src/utils/response.ts`). It maps `ValidationError → 400`, `NotFoundError → 404`, `ConflictError → 409`, and anything else to `500` with a generic message. Don't repeat `setResponseStatus` in every catch block.
- Return a DTO or a picked set of fields, never raw DB rows that might carry columns that shouldn't go out.

## 4. Errors and validation

- Domain errors live in `src/errors/index.ts` (`AppError`, `ValidationError`, `NotFoundError`, `ConflictError`, `UnauthorizedError`), each carrying a `status`.
- Services **throw** domain errors. They don't return `{ success: false, message }` objects.
- Validate every external input at the controller boundary with a function in `src/validators/<domain>.validator.ts` that returns a typed DTO or throws `ValidationError`. Ask before adding a validation library such as zod. The repo doesn't have one today.
- Never swallow errors. A `.catch(e => console.log(e))` that resolves to `undefined` (as in `getSQLData`) hides failures; let the error propagate or rethrow it.

## 5. Data access rules

- New models are Drizzle schemas. Don't add Sequelize or Mongoose models.
- Build queries with the Drizzle query builder (`eq`, `and`, `or`, `sql\`\``) so values are parameterized. Never concatenate user input into SQL strings.
- Each mapper method handles one query or one cohesive unit of work, with a typed return value inferred from the schema (`typeof team.$inferSelect`).
- Paginate in SQL (`limit`/`offset`), not by loading full tables into memory.

## 6. TypeScript and style

- Avoid `any`. Type parameters, return values, and DTOs explicitly. Use `unknown` plus validation for untrusted input.
- Mark injected dependencies `private readonly`.
- Use `const` over `let`, and never `var`.
- Names: `<Entity>Mapper`, `<Domain>Service`, `<Domain>Controller`, with files named `<entity>.mapper.ts`, `<domain>.service.ts`, `<domain>.controller.ts`, and `<domain>.routes.ts`. Route paths are kebab-case.
- Delete unused imports and commented-out code in any file you touch.
- Match the surrounding code's formatting (4-space indent, double quotes in controllers and mappers).

## 7. Testing

- Every new or changed function gets a unit test in the same change. Unit tests live in `src/test/unit/` (mocha + chai), mirroring `src/`.
- Run them with `npm run test:unit` (ts-node, no build, under a second). Coverage: `npm run test:coverage`.
- A PostToolUse hook (`.claude/hooks/run-unit-tests.sh`) re-runs the suite after every edit to `src/{mapper,service,controllers,utils,models,routes}` or `src/test/unit`. If it reports failures, fix them before doing anything else.
- **Services**: constructor-inject fake mappers.
- **Mappers**: use `stubSQL(mapper, result)` from `src/test/unit/helpers/sql-stub.ts`. It replaces `getSQLData`, so you can assert the generated SQL and bound params without a DB.
- **AWS mappers / legacy Sequelize models / other singletons**: use `stubMethod(target, "method", impl)` and always `restore()` in `afterEach`.
- **Controllers**: use `api()` from `src/test/unit/helpers/http.ts` to hit the real routes via supertest, or `mount(handler, method, path)` for handlers no route exposes.
- When a test reveals a real bug you are not fixing in this change, add an `it.skip("BUG: <what should happen>")` with the correct expectation. Never assert the buggy behaviour as correct.
- Test validators directly with good and bad payloads.

## 8. Working with legacy code

- Don't rewrite whole legacy mappers unprompted. When you touch a feature, move *that* feature's business logic into a service, and leave the mapper doing data access only.
- Keep public route paths and response envelopes (`{ code, data, error, message }`) stable. The frontend depends on them.
- If a change would ripple widely (for example `BaseMapper`, or switching the DB execution path), describe the plan and confirm with the user first.

## Checklist before finishing

- [ ] The route only binds a path to a controller method
- [ ] The controller has no queries, no business rules, and no model or `drizzle-orm` imports
- [ ] Business logic is in a service with constructor-injected dependencies
- [ ] Each mapper touches only its own entity and has typed returns
- [ ] Input is validated, and errors are thrown as domain errors and mapped centrally
- [ ] No hard-coded secrets, no `any` without justification, no leftover `console.log`
- [ ] Every new or changed function has unit tests, and `npm run test:unit` is green
- [ ] `npm run build` passes
