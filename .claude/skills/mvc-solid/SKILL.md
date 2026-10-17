---
name: mvc-solid
description: Architecture and coding standards for kofc9544-api. Use whenever adding or changing an endpoint, controller, service, mapper, model, or route; when refactoring existing code; or when the user asks about structure, layering, MVC, SOLID, or best practices in this repo.
---

# MVC + SOLID standards for kofc9544-api

This API is an h3 v2 app that runs locally and on AWS Lambda. All of it follows the layered MVC
structure below; keep it that way. Copy the patterns from the existing code (the golf domain is a
good reference: `player.mapper.ts`, `registration.service.ts`, `golf.controller.ts`).

## 1. Layers and what each one owns

```
Route ──▶ Controller ──▶ Service ──▶ Mapper ──▶ QueryExecutor (RDS SQL proxy) / AWS SDK
 (URL)     (HTTP in/out)   (business    (data access     Model = Drizzle schema
                            rules)       only)
                ▲
                └── View: src/utils/response.ts (envelope), src/views/ (image URLs, emails)
```

| Layer | Location | Owns | Must NOT |
|---|---|---|---|
| **Route** | `src/routes/<domain>.routes.ts` | `new H3()`; path + verb → controller method | Contain logic |
| **Controller** (C) | `src/controllers/<domain>.controller.ts` | Read params/body, validate, call **one** service method, return a view | Run queries, import models or `drizzle-orm`, hold business rules, catch errors itself |
| **Service** | `src/service/<domain>.service.ts` | Business rules and workflows across mappers (register team → players → email) | Import `h3`, set status codes, build SQL |
| **Mapper** | `src/mapper/<entity>.mapper.ts` | Drizzle queries for **one** table, run through the injected executor; AWS adapters (`cdn`, `mail`) | Hold business rules, call other mappers, know about HTTP |
| **Model** (M) | `src/models/<Entity>.ts` | Drizzle `mysqlTable` schema matching the real table | Hold behaviour |
| **View** (V) | `src/utils/response.ts`, `src/views/` | Response envelope, paged lists, CDN URLs, composed emails | Hold logic beyond formatting |
| **DTO / validator** | `src/dto/`, `src/validators/` | Request types; turning untrusted input into a DTO or a `BadRequestError` | Touch the database |
| **Errors** | `src/errors/` | `AppError` + `BadRequest/Unauthorized/Forbidden/NotFound/Conflict` | |
| **Config** | `src/config/` | Every env var (read at access time), mail recipients | |

Mappers and services never import from `src/controllers/`.

## 2. SOLID, as practised here

**S: Single Responsibility.** One mapper per table, one service per workflow (`PlayerImportService`
is separate from `PlayerService`), pure helpers for pure logic (`event-schedule.ts`,
`views/email/compose.ts`). No `console.log` debugging in committed code.

**O: Open/Closed.** Extend with data, not branches: a new committee form is an entry in
`FORMS` (`views/email/compose.ts`) plus `REQUIRED` (`validators/mail.validator.ts`) and
`config/mail-recipients.ts`.

**L: Liskov.** Every mapper method returns typed data or throws. Never return error strings or
`{ success: false }`.

**I: Interface Segregation.** Services depend on the slice they use:
`type TeamStore = Pick<TeamMapper, "findByIdOrName" | "insert">`. Cross-domain needs are small
interfaces (`GolfMailer`, `PasswordResetMailer`, `EventMailer`, `CreatorLookup`).

**D: Dependency Inversion.** Dependencies come in through the constructor; the module exports a
wired singleton for production:

```ts
export class RegistrationService {
    constructor(
        private readonly teams: Pick<TeamMapper, "findByIdOrName" | "insert">,
        private readonly players: Pick<PlayerMapper, "insert">,
        private readonly mailer: GolfMailer,
    ) {}
    // ...
}
export const registrationService = new RegistrationService(teamMapper, playerMapper, mailService);
```

Mappers take their executor the same way:
`constructor(private readonly executor: QueryExecutor = sqlExecutor) {}`.

## 3. Controller pattern

```ts
export class GolfController {
    public static apiRegisterTournament = controller(async (event) => {
        const registration = validateRegistration(await readBody<Body>(event));
        const { emailSent } = await registrationService.register(registration);
        return useResponseSuccess({ message: "Registration successful", emailSent });
    });
}
```

- `controller()` (`controllers/controller.ts`) catches everything and calls `handleError`:
  `AppError` → its status and message; anything else → logged, generic 500
  (`"Internal server error"`). Never write try/catch or set `event.res.status` in a handler.
- Lists: `pagedList(rows, params, defaultSort)`; rows carry an overall `total` column.
- Params: `parseListParams(getRouterParams(event))`, `validateTextId`, `validateNumericId`;
  `bearerToken(event)` for the session token.
- Keep URLs and the `{ code, data, error, message }` envelope stable: the frontend depends on them.

## 4. Data access

- Drizzle only. Build queries with `db` from `db/query-builder.ts` and run them with
  `this.executor.run(query)`. Values are always bound parameters; never concatenate input into SQL.
- In correlated `sql` subqueries, name outer columns literally (`WHERE player.TeamId = team.id`):
  `${team.id}` renders unqualified in a single-table select and binds to the subquery's table.
- Paginate in SQL (`toPage(params)` → `offset`/`limit`).
- Never select `password` or `token` columns into anything returned to clients.

## 5. Errors, validation, security

- Validate every external input in `src/validators/` (no validation library; ask before adding one).
- Services throw domain errors. A failure after data is saved (e.g. email) is reported in the
  result (`emailSent: false`), not thrown, so clients don't retry and duplicate.
- Secrets and hosts come from `config`. Tokens: `TokenService` (purpose-scoped JWTs).

## 6. TypeScript and style

- `strict` with `strictNullChecks` (Drizzle's types require it). Avoid `any`; use `unknown` + a validator.
- Inject with `private readonly`. `const` over `let`; never `var`.
- Names: `<Entity>Mapper`, `<Domain>Service`, `<Domain>Controller`; files `<entity>.mapper.ts`,
  `<domain>.service.ts`, `<domain>.controller.ts`, `<domain>.routes.ts`.
- No commented-out code. 4-space indent, double quotes.

## 7. Testing

- Every new or changed function gets a unit test in the same change: `src/test/unit/`, mocha + chai.
  `npm test` runs it in under a second; `npm run test:coverage` for coverage.
- A PostToolUse hook re-runs the suite after edits under `src/`; fix failures before moving on.
- **Mappers**: `new PlayerMapper(fakeExecutor(result))` (`helpers/fake-executor.ts`) and assert
  `db.last.sql` / `db.last.params`.
- **Services**: construct with fakes for each dependency (see `test/unit/service/*.test.ts`).
- **Controllers**: `api()` (`helpers/http.ts`) hits the real routes over HTTP; stub services with
  `stubMethod(service, "method", impl)` (`helpers/stubs.ts`) and restore in `afterEach` (reverse order).
  `mount(handler, method, path)` for unrouted handlers. Add one end-to-end test per workflow that
  stubs only `sqlExecutor.run` and AWS clients.
- Tests can't reach AWS: `setup.ts` points every SDK client at a closed local port.
- A real bug you are not fixing now: `it.skip("BUG: <correct behaviour>")`, never assert the bug.

## Checklist before finishing

- [ ] Route only binds a path; controller only validates, calls one service, returns a view
- [ ] Business logic in a service with constructor-injected `Pick<>` dependencies
- [ ] Mapper touches one table, typed returns, executor injected, no secrets columns returned
- [ ] Input validated; errors thrown as domain errors
- [ ] No hard-coded secrets, no unjustified `any`, no `console.log` debugging
- [ ] Tests added; `npm test`, `npx tsc --noEmit` and `npm run build` pass
