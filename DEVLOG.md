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
