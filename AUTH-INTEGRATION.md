# Task 5.1 — Auth/JWT integration handoff

Review date: 2026-11-19 (Asia/Saigon). Local implementation only; no push, PR, or merge authorized.

## Baseline and isolation

- Isolated clone and branch: `codex/task5-1-auth-jwt`, based on `main` at `4517ea9b86829006e174c19158e48e12b784eef3`.
- Antigravity owns PR #29 and `feat/task5-1-1-product-customization-cart`; checkpoint audit fetched remote head `41f351733ba4c0b93e28fba16f6fc5838908cb9f` (previous audit: `001f1525`). Its working tree was not edited. No merge, cherry-pick, push, or PR creation was performed.
- Sources: SRS v1.4.0 FR-04/NFR-02, UC-07/08, UC-04 authentication, RTM, UML, ADR-005; PR #29 UI-SPEC-01. Assignment 2 PDF was not present in the checkout. Sprint backlog still contains generic planning; do not label Auth as Task 5.1.2 (PR #29 uses that number for payment).
- Requirements and QA agents inspected read-only; Backend agent owns API/auth, user entity, ownership migration, guards and API tests. Coordinator owns this handoff. No frontend or payment implementation.

## Approved API contract

| Endpoint | Input / authentication | Result |
| --- | --- | --- |
| `POST /auth/register` | `{email,password}` | 201 `{id,email,createdAt}`; invalid input 400, duplicate normalized email 409 |
| `POST /auth/login` | `{email,password}` | 200 `{accessToken,tokenType:"Bearer",user:{id,email,createdAt}}`; invalid credentials generic 401 |
| `GET /auth/me` | Bearer JWT | Safe current user; missing/invalid/expired token 401 |
| `POST /orders` | Existing order DTO + Bearer JWT | Existing PENDING order response; owner derived from verified user |
| `GET /orders` | Bearer JWT | Caller-owned orders only |
| `GET /orders/:id` | Bearer JWT | Missing/ownerless legacy order 404; existing other-owned order 403 without order data |

No global `/api` prefix is added: RTM's endpoint matrix matches current Nest routing. ADR-007 specifies that the public proxy strips `/api/*`; SRS `/api/auth` examples therefore represent the public deployment URL, while local/upstream Nest uses `/auth`. Configure the frontend API base URL for its deployment accordingly.

Passwords use bcrypt cost >=10, minimum six characters and a maximum of 72 UTF-8 bytes to avoid truncation. JWT uses Passport validation, HS256, mandatory finite expiry and environment configuration (`JWT_SECRET`, `JWT_EXPIRES_IN`). No user-selected role or owner. Public responses must never contain hashes. Existing numeric order IDs and DTOs remain unchanged. Nullable owner preserves legacy rows without exposing them to customers.

Before API startup, copy the example environment into an ignored local `.env` and set `JWT_SECRET` to a generated secret (at least 32 bytes). For example, generate one locally with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`; never commit the output. `JWT_EXPIRES_IN` accepts positive seconds or a duration with `s`, `m`, `h`, or `d` (default `1d`). Missing/placeholder secrets fail startup deliberately.

## Integration after PR #29 merges

1. Fetch the new `main` in this isolated clone, inspect the merged commit and rerun baseline checks. Do not modify Antigravity's tree or merge its PR automatically.
2. Wait for explicit user instructions before integrating main. Reconcile `apps/api/src/app.module.ts` so customization migration `1731974400000` precedes Auth migration `1732060800000`, production synchronization remains disabled, and AuthModule is imported. Keep query logging disabled for credentials.
3. Reconcile `orders.service.ts` by retaining PR #29's size/topping/note validation and server-side prices alongside caller ownership. Adapt PR #29's order HTTP tests to authenticate fixture users and retain its customization assertions.
4. Implement the PR #29 auth modal in a subsequent UI change: login/register, safe token lifecycle, expiry/logout, Authorization header, cart/input preservation and return to checkout after login or 401. Preserve the PENDING duplicate-submit guard and scope pending-order state to its account on account switching. Guest access may browse/edit cart but cannot submit an order. Google OAuth is prototype-only and outside this scope.
5. Verify keyboard focus trap, Escape/close/focus restoration, labels, announced errors, password visibility, duplicate-submit blocking and network retry. Use dark text on caramel buttons or darken their background for readable contrast.
6. Verify two-user isolation, legacy rows, expired/tampered JWTs, duplicate-email races, migration up/down on a disposable PostgreSQL database, frontend checkout, and all API/web quality gates on the combined source.
7. Request user approval for push/opening a PR only after baseline and integration evidence is available. Never automatically merge.

## Release boundaries

- API guards intentionally reject PR #29's existing anonymous order requests. Source compatibility and backend test success do not establish end-to-end checkout compatibility. UI integration is a release dependency.
- Payment, idempotency, stock concurrency and loyalty are separate unfinished scopes. Future UC-10 must check ownership before returning idempotent replay data.
- The incremental Auth migration requires the existing order schema. Empty production database bootstrap remains a baseline migration dependency shared with PR #29.
- Migration rollback removes the new account table and ownership fields, so back up accounts before rollback; preserving legacy order rows does not make Auth rollback lossless.
- Latest PR #29 rejects automatic rollback under a forward-only policy; Auth still implements destructive `down()`. Resolve this policy mismatch before deployment. Do not run Auth rollback in production. If destructive restoration/recreation is approved, rotate `JWT_SECRET` before reopening traffic: recreated numeric user IDs can otherwise make an old unexpired token authenticate a different account. A regression test for this recovery scenario is missing.
- `OrdersService` is a semantic overlap: retain customization prices and item snapshots while supplying the authenticated owner. `OrdersController`, `OrdersModule`, and `order.entity.ts` are Auth-only changes versus PR #29; PR #29 changes `order-item.entity.ts`, so both entity relationships must remain. Its direct service tests need a fixture owner argument, and standalone HTTP tests need authentication setup.
- The repository tracks generated API artifacts and some dependencies. Keep them out of the Auth diff; installation/build side effects are not implementation changes.

## Verification evidence

Baseline main frontend (unchanged source):

- `node --test tests/*.test.mjs`: PASS, 11 tests.
- `npm run test:component -- --runInBand --testMatch '**/tests/*.test.tsx'`: PASS, 1 suite / 1 component test. The unmodified `npm test -- --runInBand` ran the 11 Node tests but failed discovery for Jest: its `<rootDir>` test glob expands with mixed Windows separators in this `.codex` clone path. The explicit relative glob executes the existing test; no test was skipped or source changed.
- `npm run lint`: PASS, exit 0.
- `npm run build`: PASS, exit 0 after permission to fetch the configured Google Fonts. Initial sandbox build failed fetching Geist/Geist Mono.

Backend baseline: 14/14 tests and build PASS; lint exits 0 with two pre-existing warnings in `products.service.ts`.

Final backend verification executed by Backend agent:

- `npm test -- --runInBand`: PASS, 32 tests / 6 suites (including Auth HTTP and JWT configuration regression coverage).
- `npm run test:e2e -- --runInBand`: PASS, 1 test against the disposable PostgreSQL environment.
- `npm run lint`: PASS, exit 0; two unchanged warnings in `products.service.ts` remain.
- `npm run build`: PASS, exit 0.
- PostgreSQL harness: PASS, details below. Its dedicated container was stopped and removed afterward.

QA's source review identified malformed Unicode validation and PostgreSQL integer overflow in order IDs; both were corrected and exercised. These checks do not claim complete security certification, frontend Auth completion, or compatibility with the not-yet-merged PR #29 source.

Real PostgreSQL verification: PASS on a dedicated disposable container, using a random loopback port, without accessing Antigravity's database. The harness and log are retained beside this clone as `../verify-auth-postgres.cjs` and `../auth-postgres-verification.log`:

- Production migration preserves a legacy order; migrated schema has zero delta against TypeORM entity metadata.
- Concurrent registrations for the same normalized email return 201/409; stored bcrypt cost is 10 and actual login succeeds.
- Anonymous order access returns 401, forged owner input 400, caller-owned order 200, foreign order 403, legacy/missing order 404, out-of-range ID 400, and public menu 200.
- Down/up migration cycle removes account/ownership data as documented, preserves both order rows, and reapplies cleanly.

To repeat the database check, build `apps/api`, provision a fresh **disposable** PostgreSQL database, set `DATABASE_HOST=127.0.0.1`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, and a test `JWT_SECRET`, then run `node ../../../verify-auth-postgres.cjs` from `apps/api`. The harness checks for an empty database before provisioning fixtures. Do not point it at an existing application database.

## Local checkpoint audit (2026-11-19)

- Two read-only reviewers audited security and PR #29 integration. Auth implementation was preserved; only this handoff was updated during checkpoint work.
- Re-ran `npm test -- --runInBand`: 32/32 tests, 6/6 suites PASS. Classification: 10 baseline unit tests with mocked collaborators, 7 JWT-config unit cases, and 15 HTTP tests with mocked repositories (11 Auth + 4 Products). Security assertions are a subset of those tests, not additional end-to-end certification.
- Re-ran API lint: exit 0, the same two product spread warnings. Built with `npm run build -- --path ../../../auth-checkpoint-tsconfig.json`, preserving source settings but redirecting output to ignored `apps/api/build/auth-checkpoint-20261119` and disabling incremental output. Temporary config/output is not committed. Initial output-redirection attempts failed path/type-root resolution; the corrected config uses explicit local type roots.
- PostgreSQL harness results above are historical evidence from the implementation session, not re-executed during this checkpoint. The separate application E2E test checks only `GET /` -> `Hello World!` with a database-connected AppModule; it is not an Auth or security E2E test.
- Missing coverage: persisted order PENDING/totals/items and transaction rollback on invalid carts; oversized quantity/amount bounds; old-token invalidation after account recreation; browser login/cart/expiry/account-switch flows. Order ownership tests are in the external PostgreSQL harness, not the default CI suite. FR-05 stock/order-code scope remains incomplete.
- Checkpoint excludes secrets, `.env`, dependency directories, generated artifacts and temporary evidence. `.env.example` contains an empty JWT secret and is a reviewed configuration template.
