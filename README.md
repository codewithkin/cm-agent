# cm-agent

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React Native, Expo, Hono, TRPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **React Native** - Build mobile apps using React
- **Expo** - Tools for React Native development
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Hono** - Lightweight, performant server framework
- **tRPC** - End-to-end type-safe APIs
- **Bun** - Runtime environment
- **Prisma** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Database Setup

Generate the Prisma client before development, typechecking, or building, including in CI and deployment builds. Run this again after changing the Prisma schema:

```bash
pnpm run db:generate
```

This project uses PostgreSQL with Prisma.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details.

3. Apply the schema to your database:

```bash
pnpm run db:push
```

Then, run the development server:

```bash
pnpm run dev
```

From `apps/native`, run the `ios` script for iOS or the `android` script for Android to build and launch the app. See [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/) for device setup.
The API is running at [http://localhost:3000](http://localhost:3000).

## Environment Configuration

Each app owns its environment schema in `.env.schema`. Varlock generates `src/env.ts` during installation; run `pnpm run env:generate` after changing a schema. Commit schemas, and keep secrets in ignored env files or your deployment platform.

Import the generated `ENV` accessor in application code. Shared database and auth packages receive configuration or initialized clients from the application. See [Varlock's monorepo guide](https://varlock.dev/guides/monorepos/).

Bun's automatic env loading is disabled in `bunfig.toml`; the framework integration or server bootstrap loads Varlock. Node deployments must include Varlock and its dependencies alongside the app schema.

Run standalone Node/Bun tools that use Varlock from the owning app directory so they load that app's schema and env files. `env:generate` only generates TypeScript files; it does not initialize environment values in a subsequent command.

## Deployment

### Docker Compose

- Target: server
- Config: `docker-compose.yml` (app Dockerfiles live in `apps/*/Dockerfile`)
- Build images: pnpm run docker:build
- Start: pnpm run docker:up
- Logs: pnpm run docker:logs
- Stop: pnpm run docker:down

Environment variables are read from each app's `.env` file (baked into web builds for public variables) and overridden in `docker-compose.yml` for container networking.

For more details, see the guide on [Deploying with Docker Compose](https://www.better-t-stack.dev/docs/guides/docker).

## Backend API

The tRPC API in `packages/api` is served by `apps/server` at `/trpc`. The full task breakdown is in [plans/backend-plan.md](plans/backend-plan.md).

### Auth

The app uses its own lightweight auth, with no email sign-ups:

1. **Owner account.** Created once with `auth.bootstrapOwner`, which needs `OWNER_SETUP_CODE` from `apps/server/.env`.
2. **Registered phones.** `auth.registerDevice` (owner phone number + password) returns a device token. Send it as `Authorization: Bearer <deviceToken>`.
3. **PIN unlock.** `auth.unlock` (person + 4-digit PIN) returns a session token valid for 12 hours. Send it as `x-session-token`. Five wrong PINs lock the person out for 15 minutes.

`auth.deviceUsers` returns each person's `pinSalt` and `pinVerifier`, so a phone can check a PIN offline by comparing `sha256(pinSalt + ":" + pin)`.

### Routers

| Router | What it covers |
| --- | --- |
| `auth` | Owner setup, phone registration, PIN unlock and lock, PIN and password changes |
| `team` | Helpers: list, add, reset PIN, deactivate, rename (owner only) |
| `devices` | Registered phones, sign-out of a lost phone, heartbeat |
| `settings` | Business name, agent codes, tolerances, low-balance levels, EcoCash SMS senders |
| `shifts` | Open, live balances, close with variance, history, summary |
| `transactions` | Cash-in / cash-out entries: create, list, detail, flag, edit, void |
| `movements` | Float bought, cash added or taken, and so on |
| `sms` | EcoCash SMS ingest, parsing, matching, unrecorded inbox |
| `customers` | Repeat-customer search and customer detail |
| `review` | The owner's queue of flags, unrecorded SMS and variances |
| `reports` | Today, end-of-day, monthly, CSV export, logbook data for PDF |
| `sync` | `pull` changes since a time, `push` work done offline |

### Conventions

- Money is whole cents (`Int`) plus a `Currency` (`USD` or `ZIG`).
- Days and months follow Zimbabwe time (UTC+2).
- Records are never deleted: transactions and movements are voided, and every change is written to `AuditEvent`.
- The SMS parser (`packages/api/src/lib/sms-parser.ts`) uses general patterns. Tune it with real EcoCash messages from the booth phones.

### Tests

```bash
pnpm --filter @cm-agent/api test
```

## Project Structure

```
cm-agent/
├── apps/
│   ├── native/      # Mobile application (React Native, Expo)
│   └── server/      # Backend API (Hono, TRPC)
├── packages/
│   ├── api/         # API layer / business logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run dev:server`: Start only the server
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run dev:native`: Start the React Native/Expo development server
- `pnpm run db:push`: Push schema changes to database
- `pnpm run db:generate`: Generate database client/types
- `pnpm run db:migrate`: Run database migrations
- `pnpm run db:studio`: Open database studio UI
- `pnpm run docker:build`: Build the Docker Compose images
- `pnpm run docker:up`: Build and start the Docker Compose stack
- `pnpm run docker:logs`: Tail logs from the Docker Compose stack
- `pnpm run docker:down`: Stop the Docker Compose stack
