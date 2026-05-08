# wasal-t — Dev Log
> Running log of every action taken during implementation. Updated after every task, feature, or bug fix.

---

## Phase 1 — Repo & Infrastructure Skeleton
**Date:** 2026-05-06

### Monorepo setup
- Chose **pnpm workspaces** + **Turborepo** as the monorepo toolchain
- Created `pnpm-workspace.yaml` declaring workspace globs: `services/*`, `apps/*`, `packages/*`, `tools/*`
- Created root `turbo.json` with task pipeline: `build` (depends on upstream `^build`), `dev` (persistent, no cache), `lint`, `type-check`

### Root config files created
- `package.json` — root package with `name: wasal-t`, workspace scripts (`build`, `dev`, `lint`, `type-check`, `format`), devDependencies:
  - `@typescript-eslint/eslint-plugin@^8.0.0`
  - `@typescript-eslint/parser@^8.0.0`
  - `eslint@^9.0.0`
  - `eslint-config-prettier@^9.0.0`
  - `prettier@^3.0.0`
  - `turbo@^2.0.0`
  - `typescript@^5.5.0`
- `tsconfig.json` — base TypeScript config (`target: ES2022`, `module: NodeNext`, `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`)
- `eslint.config.mjs` — flat ESLint config using `@typescript-eslint` plugin + `eslint-config-prettier`
- `.prettierrc` — single quotes, semi, trailing commas, 100 print width
- `.editorconfig` — 2-space indent, LF line endings, UTF-8, final newline
- `.gitignore` — ignores `node_modules/`, `dist/`, `.turbo/`, `.env*`, `*.log`, `coverage/`, `.next/`

### Directory skeleton created
```
services/
  gateway/     src/index.ts  package.json  tsconfig.json
  ride/        src/index.ts  package.json  tsconfig.json
  location/    src/index.ts  package.json  tsconfig.json
  matching/    src/index.ts  package.json  tsconfig.json
  notification/src/index.ts  package.json  tsconfig.json
apps/
  rider-web/   src/app/layout.tsx  src/app/page.tsx  package.json  tsconfig.json  next.config.ts
  driver-web/  src/app/layout.tsx  src/app/page.tsx  package.json  tsconfig.json  next.config.ts
packages/
  shared/      (empty — populated in Phase 2)
tools/
  driver-simulator/  src/index.ts  package.json  tsconfig.json
```

### Packages installed per workspace
- Each service (`gateway`, `ride`, `location`, `matching`, `notification`): devDependencies `tsx@^4.0.0`, `typescript@^5.5.0`
- Each Next.js app (`rider-web`, `driver-web`): dependencies `next@^15.0.0`, `react@^19.0.0`, `react-dom@^19.0.0`; devDependencies `@types/node@^22`, `@types/react@^19`, `@types/react-dom@^19`, `typescript@^5.5.0`
- `driver-simulator`: devDependencies `tsx@^4.0.0`, `typescript@^5.5.0`

### Resolved installed versions (from pnpm-lock.yaml)
- `typescript` → `5.9.3`
- `turbo` → `2.9.9`
- `eslint` → `9.39.4`
- `prettier` → `3.8.3`
- `next` → resolved at install time per workspace

### Docker infrastructure
- Created `docker-compose.yml` with three services:
  - **postgres** — image `postgres:16-alpine`, port `5432:5432`, volume `postgres_data`, env `POSTGRES_USER=wasal POSTGRES_PASSWORD=wasal POSTGRES_DB=wasalt`, healthcheck: `pg_isready`
  - **redis** — image `redis:7-alpine`, port `6379:6379`, volume `redis_data`, healthcheck: `redis-cli ping`
  - **kafka** — image `apache/kafka:3.8.0`, port `9092:9092`, volume `kafka_data`, KRaft mode (no Zookeeper), env: `KAFKA_PROCESS_ROLES=broker,controller`, `CLUSTER_ID=MkU3OEVBNTcwNTJENDM2Qk`, healthcheck: `kafka-topics.sh --list`
- All three containers confirmed **healthy** after `docker compose up -d`

### Makefile targets added
- `make up` → `docker compose up -d`
- `make down` → `docker compose down`
- `make logs` → `docker compose logs -f`
- `make ps` → `docker compose ps`
- `make reset-db` → `docker compose down -v && docker compose up -d postgres`
- `make install` → `pnpm install`
- `make build` → `pnpm build`

---

## Phase 2 — Shared Packages
**Date:** 2026-05-06

### Workspace config change
- Added `"packages/shared/*"` glob to `pnpm-workspace.yaml` so each sub-package under `packages/shared/` is its own workspace member (the existing `packages/*` glob only covers one level deep)

### Turborepo pipeline change
- Verified `turbo.json` already had `"type-check": { "dependsOn": ["^build"] }` — this ensures downstream packages build their declaration files before dependents type-check against them

### Packages created

#### `packages/shared/types` — `@wasal-t/types`
- No runtime dependencies
- **Files created:**
  - `packages/shared/types/package.json` — name `@wasal-t/types`, exports `./dist/index.js` + `./dist/index.d.ts`
  - `packages/shared/types/tsconfig.json` — extends `../../../tsconfig.json`, rootDir `src`, outDir `dist`
  - `packages/shared/types/src/index.ts`
- **Types exported:**
  - `Role` — `'rider' | 'driver'`
  - `RideStatus` — `'draft' | 'pending' | 'matched' | 'cancelled' | 'completed' | 'failed'`
  - `RideEventType` — `'matched' | 'cancelled' | 'no_drivers' | 'failed'`
  - `User` — id, email, passwordHash, role, createdAt
  - `Rider` — userId, displayName, defaultPaymentMethod
  - `Driver` — userId, licenseNumber, vehicleMake, vehiclePlate
  - `Ride` — id, riderId, driverId, originLat, originLon, destLat, destLon, fare, status, createdAt, updatedAt
  - `Fare` — rideId, amount, currency
  - `OfferEvent` — rideId, riderId, origin/dest lat-lon, fare
  - `RideEvent` — rideId, type, optional driverId

#### `packages/shared/auth` — `@wasal-t/auth`
- Dependencies: `@wasal-t/types@workspace:*`, `jsonwebtoken@^9.0.0`
- Dev dependencies: `@types/jsonwebtoken@^9.0.0`
- **Files created:**
  - `packages/shared/auth/package.json`
  - `packages/shared/auth/tsconfig.json`
  - `packages/shared/auth/src/index.ts`
- **Functions exported:**
  - `signJwt(payload, secret, options?)` — wraps `jwt.sign`; default `expiresIn: '7d'`; accepts `SignOptions` to avoid `ms.StringValue` branded-type friction
  - `verifyJwt(token, secret)` → `JwtPayload` — wraps `jwt.verify`; throws on string payload
- **Types exported:** `JwtPayload` (`{ userId, role }`), re-exports `Role`
- **Fix applied:** used `SignOptions` parameter instead of bare `string` for `expiresIn` to satisfy `ms.StringValue` template-literal type in `@types/jsonwebtoken@9`

#### `packages/shared/db` — `@wasal-t/db`
- **ORM choice: Drizzle ORM** — TypeScript-native schema (no codegen step), lightweight, works cleanly in monorepo. Schema itself deferred to Phase 3.
- Dependencies: `drizzle-orm@^0.36.0`, `pg@^8.13.0`
- Dev dependencies: `@types/pg@^8.11.0`, `@types/node@^22`, `drizzle-kit@^0.28.0`
- **Files created:**
  - `packages/shared/db/package.json`
  - `packages/shared/db/tsconfig.json`
  - `packages/shared/db/src/index.ts`
- **Functions/types exported:**
  - `createPool(connectionString)` → `Pool` — creates a `pg.Pool`
  - `createDb(pool)` → `NodePgDatabase` — wraps pool in Drizzle
  - Re-exports `sql`, `eq`, `and`, `or`, `desc`, `asc` from `drizzle-orm` for convenience

#### `packages/shared/redis` — `@wasal-t/redis`
- Dependencies: `ioredis@^5.4.0`
- **Files created:**
  - `packages/shared/redis/package.json`
  - `packages/shared/redis/tsconfig.json`
  - `packages/shared/redis/src/index.ts`
- **Functions exported:**
  - `createRedisClient(url)` → `Redis`
  - `publish(redis, channel, payload)` — JSON-serialises payload and publishes to a Redis Pub/Sub channel
  - `acquireLock(redis, key, value, ttlSeconds)` → `boolean` — `SET key value EX ttl NX`; returns `true` if lock acquired
  - `releaseLock(redis, key)` — `DEL key`
  - `geoAdd(redis, key, lon, lat, member)` — `GEOADD`
  - `geoSearch(redis, key, lon, lat, radiusKm, limit)` → `string[]` — `GEOSEARCH FROMLONLAT BYRADIUS ASC COUNT` via `redis.call`
- **Fix applied:** ioredis 5 requires `EX ttl NX` argument order (not `NX EX ttl`)

#### `packages/shared/kafka` — `@wasal-t/kafka`
- Dependencies: `kafkajs@^2.2.0`
- **Files created:**
  - `packages/shared/kafka/package.json`
  - `packages/shared/kafka/tsconfig.json`
  - `packages/shared/kafka/src/index.ts`
- **Functions exported:**
  - `createKafka(config)` → `Kafka`
  - `createProducer(kafka)` → `Producer` — connects before returning
  - `createConsumer(kafka, groupId)` → `Consumer` — connects before returning
  - `sendMessage(producer, topic, payload)` — JSON-serialises payload and sends single message
- **Types exported:** `Producer`, `Consumer`, `EachMessagePayload`

#### `packages/shared/sse` — `@wasal-t/sse`
- No runtime dependencies (uses Node.js built-ins only)
- Dev dependencies: `@types/node@^22`
- **Files created:**
  - `packages/shared/sse/package.json`
  - `packages/shared/sse/tsconfig.json`
  - `packages/shared/sse/src/index.ts`
- **Functions exported:**
  - `initSse(res)` — writes `200` with `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`, `X-Accel-Buffering: no` headers; sends opening newline
  - `sendSseEvent(res, event, data)` — writes `event: …\ndata: …\n\n`
  - `startHeartbeat(res, intervalMs?)` → `NodeJS.Timeout` — sends `: heartbeat\n\n` every 20 s (configurable)

### Packages installed (resolved versions)
| Package | Resolved |
|---|---|
| `jsonwebtoken` | `9.0.3` |
| `@types/jsonwebtoken` | `9.0.10` |
| `drizzle-orm` | `0.36.4` |
| `drizzle-kit` | `0.28.1` |
| `pg` | `8.20.0` |
| `@types/pg` | `8.20.0` |
| `ioredis` | `5.10.1` |
| `kafkajs` | `2.2.4` |

### Verification
- `pnpm install` — resolved 53 new packages, no errors
- All 6 packages: `tsc` (build) and `tsc --noEmit` (type-check) — clean, zero errors
- `dist/` output confirmed in all 6 packages after build

---

## Phase 3 — Database Schema & Migrations
**Date:** 2026-05-06

### ORM / migration tool
- **Drizzle ORM + Drizzle Kit** — already chosen in Phase 2; Drizzle Kit 0.28 reads `drizzle.config.ts` natively (no extra bundler step)

### `@wasal-t/auth` additions
- Added `bcryptjs@^2.4.3` as a runtime dependency
- Added `@types/bcryptjs@^2.4.6` as a dev dependency
- **Files modified:**
  - `packages/shared/auth/package.json`
  - `packages/shared/auth/src/index.ts`
- **Functions added:**
  - `hashPassword(password)` → `Promise<string>` — bcrypt hash with 12 salt rounds
  - `comparePassword(password, hash)` → `Promise<boolean>` — bcrypt compare

### `@wasal-t/db` additions

#### Schema
- **File created:** `packages/shared/db/src/schema.ts`
- **Enums:**
  - `roleEnum` (`role`) — `'rider' | 'driver'`
  - `rideStatusEnum` (`ride_status`) — `'draft' | 'pending' | 'matched' | 'cancelled' | 'completed' | 'failed'`
- **Tables:**
  - `users` — `id uuid PK defaultRandom`, `email varchar(255) unique`, `password_hash text`, `role roleEnum`, `created_at timestamp defaultNow`
  - `riders` — `user_id uuid PK FK→users(id) cascade`, `display_name varchar(255)`, `default_payment_method varchar(100) nullable`
  - `drivers` — `user_id uuid PK FK→users(id) cascade`, `license_number varchar(100)`, `vehicle_make varchar(100)`, `vehicle_plate varchar(20) unique`
  - `rides` — `id uuid PK defaultRandom`, `rider_id uuid FK→users`, `driver_id uuid nullable FK→users`, `origin_lat float8`, `origin_lon float8`, `dest_lat float8`, `dest_lon float8`, `fare float8`, `status rideStatusEnum default 'draft'`, `created_at timestamp`, `updated_at timestamp .$onUpdate()`
- **Note:** `fare` uses `doublePrecision` (float8) to keep TypeScript type as `number`; `updated_at` uses Drizzle's `.$onUpdate(() => new Date())` for auto-update on `db.update()` calls

#### DB index update
- **File modified:** `packages/shared/db/src/index.ts`
- `createDb(pool)` now passes `{ schema }` to Drizzle → returns `AppDb` (`NodePgDatabase<typeof schema>`) for full relational query type safety
- Exports `* from './schema.js'` so callers get table references without a separate import
- Exports `AppDb` type alias

#### Drizzle Kit config
- **File created:** `packages/shared/db/drizzle.config.ts`
- `schema: './src/schema.ts'`, `out: './migrations'`, `dialect: 'postgresql'`
- `dbCredentials.url` reads `DATABASE_URL` env var; falls back to `postgresql://wasal:wasal@localhost:5432/wasalt`

#### Seed script
- **File created:** `packages/shared/db/scripts/seed.ts`
- Placed in `scripts/` (not `src/`) — excluded from `tsc` build, run directly via `tsx`
- Inserts 4 dev users: `alice@example.com`, `bob@example.com` (riders), `charlie@example.com`, `diana@example.com` (drivers); all with password `password123` (bcrypt-hashed)
- Guards against `noUncheckedIndexedAccess` by checking returned rows before use

#### Package.json changes
- **File modified:** `packages/shared/db/package.json`
- Added devDependencies: `bcryptjs@^2.4.3`, `@types/bcryptjs@^2.4.6`, `tsx@^4.0.0`
- Added scripts: `generate` (`drizzle-kit generate`), `migrate` (`drizzle-kit migrate`), `seed` (`tsx scripts/seed.ts`)

### Makefile additions
- `make migrate` → `pnpm --filter "@wasal-t/db" migrate`
- `make seed` → `pnpm --filter "@wasal-t/db" seed`

### Packages installed (resolved versions)
| Package | Resolved |
|---|---|
| `bcryptjs` | `2.4.3` |
| `@types/bcryptjs` | `2.4.6` |

### Commands run & outcomes
| Command | Outcome |
|---|---|
| `pnpm install` | +2 packages (bcryptjs, @types/bcryptjs) |
| `pnpm --filter "@wasal-t/auth" build` | Clean — dist generated |
| `pnpm --filter "@wasal-t/db" type-check` | Clean — zero errors |
| `pnpm --filter "@wasal-t/db" generate` | Generated `migrations/0000_confused_wendell_rand.sql` — 4 tables, 2 enums, 3 FKs |
| `pnpm --filter "@wasal-t/db" migrate` | Applied migration to postgres — ✓ |
| `pnpm --filter "@wasal-t/db" seed` | Inserted 4 users (2 riders, 2 drivers) — verified via psql |

---

## Phase 4 — Auth & API Gateway
**Date:** 2026-05-06

### Service: `services/gateway` — `@wasal-t/gateway`

#### Goal
Single HTTP entry point for all clients. Handles authentication (register/login), verifies JWTs, and reverse-proxies all other requests to downstream microservices.

#### Ports
| Service | Port |
|---|---|
| Gateway | 3000 |
| Ride service | 3001 |
| Location service | 3002 |
| Notification service | 3004 |

#### Dependencies added to `services/gateway/package.json`
| Package | Resolved | Purpose |
|---|---|---|
| `express` | `4.22.1` | HTTP server & router |
| `http-proxy-middleware` | `3.0.5` | Reverse proxy to downstream services |
| `@wasal-t/auth` | `workspace:*` | JWT sign/verify, password hashing |
| `@wasal-t/db` | `workspace:*` | Drizzle db access for auth routes |
| `@types/express` | `4.17.25` | TypeScript types for Express |
| `@types/node` | `^22` | TypeScript types for Node.js globals |

#### Files created

- **`services/gateway/src/types/express.d.ts`** — Augments `Express.Request` with `user?: JwtPayload` via `declare global { namespace Express }` pattern. Uses `export {}` to mark as a module so the `declare global` block is valid.

- **`services/gateway/src/middleware/authenticate.ts`** — `authenticate(req, res, next)` middleware: extracts `Bearer` token from `Authorization` header, verifies with `verifyJwt`, attaches decoded payload to `req.user`. Returns 401 on missing/invalid token.

- **`services/gateway/src/middleware/requireRole.ts`** — `requireRole(role)` factory: returns an Express middleware that checks `req.user.role === role`. Returns 403 if mismatched.

- **`services/gateway/src/routes/auth.ts`** — Express `IRouter` with three routes:
  - `POST /auth/register/rider` — validates `{ email, password, displayName }`; inserts `users` (role=rider) + `riders` in a Drizzle transaction; returns JWT; 409 on duplicate email
  - `POST /auth/register/driver` — validates `{ email, password, licenseNumber, vehicleMake, vehiclePlate }`; inserts `users` (role=driver) + `drivers` in a Drizzle transaction; returns JWT; 409 on duplicate email
  - `POST /auth/login` — looks up user by email, compares bcrypt password, returns JWT; always returns 401 for both "not found" and "wrong password" (no user enumeration)
  - Split from single `/auth/register` so rider-web and driver-web each own a clean, independent contract; makes future per-role additions (email verification, onboarding steps) non-branching

- **`services/gateway/src/app.ts`** — Express `Application`. Sets up:
  - `express.json()` body parser
  - `GET /health` — unauthenticated liveness check
  - `POST /auth/*` → `authRouter` (unprotected)
  - `* /rides/*` → `authenticate` → reverse proxy to `RIDE_SERVICE_URL`
  - `* /location/*` → `authenticate` → reverse proxy to `LOCATION_SERVICE_URL`
  - `* /notifications/*` → `authenticate` → reverse proxy to `NOTIFICATION_SERVICE_URL`
  - Proxy uses `http-proxy-middleware` with `changeOrigin: true` and an `on.proxyReq` hook that forwards `X-User-Id` and `X-User-Role` headers to downstream services (so they don't need to re-verify JWTs)

- **`services/gateway/src/index.ts`** — Entry point; reads `PORT` env var (default 3000), calls `app.listen`.

- **`services/gateway/.env.example`** — Documents all required env vars: `PORT`, `DATABASE_URL`, `JWT_SECRET`, `RIDE_SERVICE_URL`, `LOCATION_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`.

#### Files modified

- **`services/gateway/package.json`** — Added `start` script (`node dist/index.js`); added dependencies and devDependencies listed above.

#### Config values
| Env var | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Gateway listen port |
| `DATABASE_URL` | `postgresql://wasal:wasal@localhost:5432/wasalt` | Postgres connection |
| `JWT_SECRET` | `dev-secret` | JWT signing/verification secret |
| `RIDE_SERVICE_URL` | `http://localhost:3001` | Ride service upstream |
| `LOCATION_SERVICE_URL` | `http://localhost:3002` | Location service upstream |
| `NOTIFICATION_SERVICE_URL` | `http://localhost:3004` | Notification service upstream |

#### Fix applied
- `TS2742: The inferred type of 'app'/'router' cannot be named without a reference to .pnpm/...` — fixed by adding explicit type annotations: `const app: Application = express()` and `const router: IRouter = Router()`.

#### Commands run & outcomes
| Command | Outcome |
|---|---|
| `pnpm install` | +91 packages (express, http-proxy-middleware, types) |
| `pnpm --filter "@wasal-t/gateway" type-check` | Clean — zero errors |
| `pnpm --filter "@wasal-t/gateway" build` | Clean — `dist/` generated with all files |

---

## Phase 5 — Task 1: POST /fares (Ride Service bootstrap) — 2026-05-07

### Technologies / Decisions
- **Express 4** — same as gateway; consistent stack across services
- **Haversine formula** — pure-math great-circle distance; no external geocoding dependency needed for demo fare estimation
- **Fare model**: base $2.00 + $1.50/km, minimum $3.00, rounded to 2 decimal places; intentionally simple for demo
- **Trust-the-network auth**: ride service reads `X-User-Id` / `X-User-Role` headers injected by the gateway — no JWT parsing in downstream services

### Files created
| File | Purpose |
|---|---|
| `services/ride/src/app.ts` | Express app — `GET /health`, mounts `/fares` router |
| `services/ride/src/routes/fares.ts` | `POST /fares` handler + `haversineKm` + `calcFare` |
| `services/ride/src/index.ts` | Entry point; listens on `PORT` (default 3001) |

### Files modified
| File | Change |
|---|---|
| `services/ride/package.json` | Added `express`, `@wasal-t/auth`, `@wasal-t/db` deps; added `start` script |

### Packages installed (resolved versions in workspace)
| Package | Version |
|---|---|
| `express` | ^4.21.0 (already resolved in workspace) |
| `@types/express` | ^4.17.0 (already resolved) |
| `@types/node` | ^22 (already resolved) |
| `@wasal-t/auth` | workspace:* |
| `@wasal-t/db` | workspace:* |

### Functions / features implemented
| Symbol | File | Description |
|---|---|---|
| `haversineKm(lat1, lon1, lat2, lon2)` | `src/routes/fares.ts` | Great-circle distance in km via Haversine |
| `calcFare(distanceKm)` | `src/routes/fares.ts` | Returns `max(3, 2 + km × 1.5)` |
| `POST /fares` handler | `src/routes/fares.ts` | Validates headers + body; inserts draft ride; returns `{ rideId, fare }` |

### Config values
| Variable | Default | Notes |
|---|---|---|
| `PORT` | `3001` | Ride service port |
| `DATABASE_URL` | `postgresql://wasal:wasal@localhost:5432/wasalt` | Same DB as gateway |

### Commands run
| Command | Outcome |
|---|---|
| `pnpm install` | No new packages downloaded (deps already in workspace) |
| `pnpm --filter "@wasal-t/ride" type-check` | Clean — zero errors |

## Phase 5 — Task 2: POST /rides/:rideId (confirm ride) — 2026-05-07

### Technologies / Decisions
- **Kafka producer singleton** (`kafka.ts`) — lazy-initialised once on first request; avoids connecting before Kafka is ready at startup
- **`db.select().from(rides).where(eq(...))` pattern** — used instead of the relational `db.query.rides.findFirst` API to avoid a dual-drizzle-orm-instance type error (two resolution paths produce incompatible `SQL<unknown>` private property declarations)

### Files created
| File | Purpose |
|---|---|
| `services/ride/src/kafka.ts` | Kafka singleton: reads `KAFKA_BROKERS` env var, exposes `getProducer()` |
| `services/ride/src/routes/rides.ts` | `POST /rides/:rideId` handler |

### Files modified
| File | Change |
|---|---|
| `services/ride/package.json` | Added `@wasal-t/kafka: workspace:*` dependency |
| `services/ride/src/app.ts` | Imported and mounted `ridesRouter` at `/rides` |

### Packages installed
| Package | Version |
|---|---|
| `@wasal-t/kafka` | `workspace:*` (already resolved; no new download) |

### Functions / features implemented
| Symbol | File | Description |
|---|---|---|
| `getProducer()` | `src/kafka.ts` | Lazy singleton — connects producer on first call, returns cached thereafter |
| `POST /rides/:rideId` handler | `src/routes/rides.ts` | Validates `x-user-id`/`x-user-role` headers; fetches ride; checks status=`draft` and ownership; UPDATEs status to `pending`; publishes `{ rideId, origin, destination }` to Kafka topic `ride-requests`; returns 202 |

### Config values
| Variable | Default | Notes |
|---|---|---|
| `KAFKA_BROKERS` | `localhost:9092` | Comma-separated broker list for ride service Kafka producer |

### Commands run
| Command | Outcome |
|---|---|
| `pnpm install` | Already up to date — no new downloads |
| `pnpm --filter "@wasal-t/ride" type-check` | Clean — zero errors |
| `pnpm --filter "@wasal-t/ride" build` | Clean — `dist/` updated |

---

## Phase 5 — Task 3: PATCH /rides/:rideId (driver accept/decline) — 2026-05-07

### Technologies / Decisions
- **Redis Pub/Sub** — two channels used: `offer-result:{rideId}:{driverId}` wakes the Matching Service's per-offer listener; `ride:{rideId}:matched` wakes the Notification Service for the rider's SSE stream
- **Trust-the-network auth** — driver identity comes from `x-user-id` / `x-user-role` headers injected by the gateway, consistent with all other downstream services
- **No status guard on decline** — on decline the ride status stays `pending` (matching loop continues looking for the next driver); only `accept=true` transitions the ride to `matched`

### Files created
| File | Purpose |
|---|---|
| `services/ride/src/redis.ts` | Redis singleton: reads `REDIS_URL` env var, exposes `getRedis()` |

### Files modified
| File | Change |
|---|---|
| `services/ride/src/routes/rides.ts` | Added `PATCH /:rideId` handler; imported `publish` from `@wasal-t/redis` and `getRedis` from `../redis.js` |
| `services/ride/package.json` | Added `@wasal-t/redis: workspace:*` dependency |

### Packages installed
| Package | Version |
|---|---|
| `@wasal-t/redis` | `workspace:*` (ioredis already resolved in workspace) |

### Functions / features implemented
| Symbol | File | Description |
|---|---|---|
| `getRedis()` | `src/redis.ts` | Lazy singleton — creates ioredis client on first call, returns cached thereafter |
| `PATCH /rides/:rideId` handler | `src/routes/rides.ts` | Validates driver role; fetches ride; checks `status='pending'`; on accept: UPDATEs status to `matched` + sets `driverId`, publishes to `offer-result:{rideId}:{driverId}` + `ride:{rideId}:matched`; on decline: publishes `offer-result:{rideId}:{driverId}` with `accepted=false`; returns updated status |

### Config values
| Variable | Default | Notes |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL for ride service |

### Commands run
| Command | Outcome |
|---|---|
| `pnpm install` | No new packages downloaded (ioredis already in workspace) |
| `pnpm --filter "@wasal-t/ride" type-check` | Clean — zero errors |

---

## Phase 5 — Tasks 4 & 5: DELETE + GET /rides/:rideId — 2026-05-07

### Technologies / Decisions
- **Cancel guard**: only blocks cancel on `cancelled` or `completed` — allows cancelling a `pending` or `matched` ride (matching loop listens for the Pub/Sub signal and exits cleanly)
- **GET role check**: riders can only see their own ride; drivers can only see rides they are assigned to (`driver_id = callerId`); returns 403 otherwise — no information leakage about unrelated rides

### Files modified
| File | Change |
|---|---|
| `services/ride/src/routes/rides.ts` | Added `DELETE /:rideId` and `GET /:rideId` handlers |

### Functions / features implemented
| Symbol | File | Description |
|---|---|---|
| `DELETE /rides/:rideId` handler | `src/routes/rides.ts` | Validates rider ownership; rejects if already `cancelled`/`completed`; UPDATEs status to `cancelled`; publishes `ride:{rideId}:cancelled` to Redis Pub/Sub so Matching Service exits its loop |
| `GET /rides/:rideId` handler | `src/routes/rides.ts` | Both riders and drivers may call; riders checked against `riderId`, drivers against `driverId`; returns full ride row |

### Commands run
| Command | Outcome |
|---|---|
| `pnpm --filter "@wasal-t/ride" type-check` | Clean — zero errors |

---

## Phase 6 — Location Service — 2026-05-07

### Technologies / Decisions
- **Express** — same server framework as all other services
- **@wasal-t/redis** — reuses shared workspace package for `geoAdd`, `geoSearch`, and raw ioredis client; no new packages installed
- **Two-key TTL pattern** — `GEOADD drivers:available` + `SET driver:alive:<id> 1 EX 10` in parallel; alive key acts as a heartbeat with 10s TTL so stale geo entries are detectable without scanning timestamps
- **GEOSEARCH via `redis.call`** — the shared `geoSearch` helper already uses `GEOSEARCH FROMLONLAT BYRADIUS ASC COUNT`; location service calls it then filters by alive-key existence
- **Cleanup job** — `setInterval` every 60s; runs `ZRANGE` on `drivers:available`, checks alive keys in bulk, `ZREM`s stale members; started in `index.ts` after `app.listen` resolves
- **Internal-only `GET /nearby-drivers`** — no auth check since this endpoint is called directly by Matching Service (phase 7) over the internal network, not via the gateway
- **PORT 3002** — matches gateway default `LOCATION_SERVICE_URL = 'http://localhost:3002'`

### Files created
| File | Purpose |
|---|---|
| `services/location/src/redis.ts` | Redis singleton: reads `REDIS_URL` env var, exposes `getRedis()` |
| `services/location/src/routes/location.ts` | `POST /drivers/location` and `GET /nearby-drivers` handlers |
| `services/location/src/cleanup.ts` | `startCleanup()` — 60s interval sweep to ZREM stale geo members |
| `services/location/src/app.ts` | Express app: mounts `locationRouter` and `/health` |

### Files modified
| File | Change |
|---|---|
| `services/location/src/index.ts` | Replaced TODO stub with actual server startup + `startCleanup()` call |
| `services/location/package.json` | Added `@wasal-t/redis: workspace:*`, `express`, `@types/express`, `@types/node` dependencies; added `start` script |

### Packages installed
| Package | Version |
|---|---|
| `@wasal-t/redis` | `workspace:*` (ioredis already resolved in workspace, no new download) |
| `express` | `^4.21.0` (already in workspace, no new download) |

### Functions / features implemented
| Symbol | File | Description |
|---|---|---|
| `getRedis()` | `src/redis.ts` | Lazy singleton — creates ioredis client on first call, returns cached thereafter |
| `POST /drivers/location` | `src/routes/location.ts` | Validates `x-user-role: driver` header; rejects non-numbers for lat/lon; runs `geoAdd(drivers:available)` + `SET driver:alive:<driverId> 1 EX 10` in parallel; returns 204 |
| `GET /nearby-drivers` | `src/routes/location.ts` | Parses `lat`, `lon`, `radiusKm` (default 5), `limit` (default 10) query params; runs `geoSearch`; filters candidates by `EXISTS driver:alive:<id>`; returns `{ drivers: string[] }` |
| `startCleanup()` | `src/cleanup.ts` | Sets a 60s interval; fetches all geo members via `ZRANGE`; bulk-checks alive keys; `ZREM`s members with no alive key |

### Config values
| Variable | Default | Notes |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `PORT` | `3002` | HTTP listen port; matches gateway `LOCATION_SERVICE_URL` default |

### Commands run
| Command | Outcome |
|---|---|
| `pnpm install` | Already up to date — no new downloads |
| `pnpm --filter "@wasal-t/location" type-check` | Clean — zero errors |
| `pnpm --filter "@wasal-t/location" build` | Clean — `dist/` generated |
