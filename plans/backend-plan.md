# CM Agent: Backend Plan

Backend work for the EcoCash agent app, broken into small sub-features. Each sub-feature is one commit.

- **Stack:** Hono + tRPC on Bun (`apps/server`, `packages/api`), Prisma + PostgreSQL (`packages/db`).
- **Money:** every amount is stored as whole cents (`Int`) with a `Currency` (USD or ZiG).
- **Time:** day and month boundaries use Zimbabwe time (UTC+2, no daylight saving).
- **Auth:** custom and lightweight. One owner account (phone + password), registered phones (device tokens), and a 4-digit PIN per person (session tokens).

## Request headers

| Header | Meaning |
| --- | --- |
| `Authorization: Bearer <deviceToken>` | A registered phone. Returned once by `auth.registerDevice` |
| `x-session-token: <sessionToken>` | The person who unlocked the phone with their PIN. Returned by `auth.unlock` |

Procedure levels: `publicProcedure` → `deviceProcedure` (phone registered) → `userProcedure` (PIN unlocked) → `ownerProcedure` (owner only).

## Features and sub-features

### 1. Database schema
- [x] Enums (role, currency, transaction type, match state, movement kind, device kind, shift status, SMS parse status, audit action)
- [x] `BusinessSettings` model
- [x] `User` model
- [x] `Device` model
- [x] `Session` model
- [x] `Customer` model
- [x] `Shift` model
- [x] `Transaction` model
- [x] `Movement` model
- [x] `SmsMessage` model
- [x] `AuditEvent` model
- [x] Re-export generated Prisma types from `@cm-agent/db`

### 2. Shared helpers
- [x] Zod schemas for the enums
- [x] Money helpers (cents parsing and formatting)
- [x] Zimbabwe time helpers (day and month ranges)
- [x] Phone number normalisation
- [x] Token generation and hashing
- [x] Password and PIN hashing, offline PIN verifier
- [x] Audit log recorder

### 3. Auth
- [x] Owner setup code env var
- [x] Read device and session tokens into the tRPC context
- [x] Allow auth headers through CORS
- [x] `deviceProcedure`, `userProcedure`, `ownerProcedure`
- [x] `auth.bootstrapOwner`
- [x] `auth.registerDevice`
- [x] `auth.deviceUsers` (lock screen list + offline PIN verifiers)
- [x] `auth.unlock` (PIN → session, lockout after 5 wrong PINs)
- [x] `auth.lock`
- [x] `auth.me`
- [x] `auth.changePin`
- [x] `auth.changePassword`
- [x] `auth.resetOwnerPin`

### 4. Team
- [x] `team.list`
- [x] `team.addHelper`
- [x] `team.resetPin`
- [x] `team.setActive`
- [x] `team.rename`

### 5. Devices
- [x] `devices.list`
- [x] `devices.revoke`
- [x] `devices.heartbeat`

### 6. Settings
- [x] `settings.get`
- [x] `settings.update`

### 7. Shifts and balances
- [x] Expected-balance calculator
- [x] Transaction summary calculator
- [x] `shifts.current`
- [x] `shifts.open`
- [x] `shifts.balances`
- [x] `shifts.close`
- [x] `shifts.list`
- [x] `shifts.get`

### 8. Customers
- [x] Customer upsert service
- [x] `customers.search`
- [x] `customers.get`

### 9. SMS
- [x] EcoCash SMS parser
- [x] SMS ↔ transaction matching
- [x] `sms.ingest`
- [x] `sms.unrecorded`
- [x] `sms.list`
- [x] `sms.ignore`
- [x] `sms.latestBalance`
- [x] `sms.parsePreview`

### 10. Transactions
- [x] `transactions.create`
- [x] `transactions.list`
- [x] `transactions.get`
- [x] `transactions.flag`
- [x] `transactions.edit`
- [x] `transactions.void`

### 11. Movements
- [x] `movements.create`
- [x] `movements.list`
- [x] `movements.void`

### 12. Review
- [x] `review.queue`
- [x] `review.markChecked`

### 13. Reports
- [x] `reports.day`
- [x] `reports.month`
- [x] CSV helper
- [x] `reports.exportCsv`
- [x] `reports.logbook`
- [x] `reports.today`

### 14. Sync
- [x] `sync.pull`
- [x] `sync.push`

### 15. Docs
- [x] Backend section in the README
