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
