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

`docker-compose.yml` runs the API and its Postgres database. It works on Coolify (Docker Compose build pack) and locally with `docker compose up`.

- The server image (`apps/server/Dockerfile`) generates the Prisma client while building and runs `prisma migrate deploy` each time it starts, so new migrations apply on redeploy.
- Postgres data lives in the `postgres-data` volume.
- Hard-coded: `NODE_ENV=production`, port `3000`, database name `cm_agent`, CORS open to any origin (the phones use bearer tokens).

### Environment variables

| Variable | Who sets it |
| --- | --- |
| `OWNER_SETUP_CODE` | You. At least 12 characters; Coline's starting password (phone `+263 775 101 506`). She can change both in Settings |
| `SERVICE_USER_POSTGRES`, `SERVICE_PASSWORD_POSTGRES` | Coolify generates them (locally they default to `cm_agent`) |
| `SERVICE_FQDN_SERVER_3000` | Coolify, from the domain you give the `server` service |

The app's `EXPO_PUBLIC_SERVER_URL` (set on EAS) is that domain, e.g. `https://api.example.com`.

## Local Development and Demo Data

1. Create the local database (Postgres 18 is at `C:/Program Files/PostgreSQL/18/bin`):

   ```bash
   "/c/Program Files/PostgreSQL/18/bin/createdb.exe" -h localhost -U postgres cm_agent
   ```

2. In `apps/server/.env`, set `DATABASE_URL=postgresql://postgres:<your password>@localhost:5432/cm_agent` and `OWNER_SETUP_CODE` (any 12+ characters).
3. Apply the migrations: `pnpm --filter @cm-agent/db exec prisma migrate deploy`.
4. Start the server: `pnpm run dev:server`. It always makes sure Coline's account exists, and in development it also adds the demo data. You can also run `pnpm --filter server seed`.

Coline's account is created automatically on first start (locally and in production): phone `+263 775 101 506`, password = the value of `OWNER_SETUP_CODE`, first PIN `1506` (she is asked to choose a new one). She can change the phone number and password in **Settings → Owner account**. Demo helpers: `Helper 1 (demo)` PIN `1111`, `Helper 2 (demo)` PIN `2222`.

**Demo data** is a week on a "Demo booth" phone: closed shifts with counts, matched SMS, and a few problems for the review queue (no SMS, a mismatch, a reported entry, a cancelled one, a short shift, an unsaved SMS). Every demo row is tagged `isDemo`.

- **Production:** only added when Coline taps **Settings → Demo data → Add demo data**.
- **Clear demo data** removes only demo rows, then tells every phone to reload its copy (`BusinessSettings.dataResetAt`).

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

## Mobile App

The Expo app in `apps/native` follows `designs/CM Agent Screens (standalone).html`. The build plan, screen by screen, is in [plans/ui-plan.md](plans/ui-plan.md).

### How it works

- **Booth phones are offline-first.** Records live in a local SQLite store (`lib/local-db.ts`). Every change goes into an outbox (`lib/outbox.ts`) that `sync.push` sends when there is internet; `sync.pull` brings changes down (`lib/sync.ts`).
- **The owner phone reads live** through tRPC and React Query, keeping the last result on screen while offline.
- **PIN unlock works offline** against the synced verifier (`lib/pin.ts`). Coline's PIN on a helper's phone approves the start and end of a shift.
- **EcoCash SMS** are read with Google's SMS User Consent API through a small local Expo module (`modules/sms-reader`, Android only). While the booth screens are open the app listens for the next SMS; Android asks "Allow?" for each message and only allowed ones reach the app. No SMS permissions are requested.
- **Motion** is limited to press feedback, the PIN pad, toggles and progress (`lib/motion.ts`, the `Tap` pressable). Screens and cards have no entry or exit animations.
- **Reports** (`reports.insights`) answer the owner's questions for today, this week, this month or last month, and save as an A4 PDF (`lib/report-pdf.ts`).

### Routes

| Path | Screens |
| --- | --- |
| `/setup/*` | A1 splash, A2 owner sign-in and choose phone, A3 how SMS reading works |
| `/lock/*` | A4 who is serving, A5 PIN, A6 set PIN, forgot PIN |
| `(booth)` tabs | B2 home, B7 transactions, B9 SMS inbox, B11 shift |
| `/transaction/*` | B4–B5 new transaction, B6 saved, B8 detail |
| `/shift/*`, `/owner-pin` | B1 start, B12 end, B13 summary, Coline's PIN |
| `(owner)` tabs | C1 today, C2 review, C4 history, C6 reports, more |
| `(admin)` | C3 day report, C5 customer, C7 shifts, C8 people, C9 phones, C10 settings, C11 access, B10 move money (Coline only) |

### Android permissions

The app asks for only `INTERNET`, `ACCESS_NETWORK_STATE`, `VIBRATE` and `POST_NOTIFICATIONS` (set in `app.json` under `android.permissions`). SMS, phone state, call log, microphone, storage, exact alarms and drawing over other apps are explicitly removed (`android.blockedPermissions`), so Play Protect and Play review don't flag the app.

### Running on a phone

The SMS reader is native code, so the app needs a development build (not Expo Go):

```bash
pnpm --filter native exec expo run:android
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
