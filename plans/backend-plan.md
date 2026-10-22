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
- [ ] Enums (role, currency, transaction type, match state, movement kind, device kind, shift status, SMS parse status, audit action)
- [ ] `BusinessSettings` model
- [ ] `User` model
- [ ] `Device` model
- [ ] `Session` model
- [ ] `Customer` model
- [ ] `Shift` model
- [ ] `Transaction` model
- [ ] `Movement` model
- [ ] `SmsMessage` model
- [ ] `AuditEvent` model
- [ ] Re-export generated Prisma types from `@cm-agent/db`

### 2. Shared helpers
- [ ] Zod schemas for the enums
- [ ] Money helpers (cents parsing and formatting)
- [ ] Zimbabwe time helpers (day and month ranges)
- [ ] Phone number normalisation
- [ ] Token generation and hashing
- [ ] Password and PIN hashing, offline PIN verifier
- [ ] Audit log recorder

### 3. Auth
- [ ] Owner setup code env var
- [ ] Read device and session tokens into the tRPC context
- [ ] Allow auth headers through CORS
- [ ] `deviceProcedure`, `userProcedure`, `ownerProcedure`
- [ ] `auth.bootstrapOwner`
- [ ] `auth.registerDevice`
- [ ] `auth.deviceUsers` (lock screen list + offline PIN verifiers)
- [ ] `auth.unlock` (PIN → session, lockout after 5 wrong PINs)
- [ ] `auth.lock`
- [ ] `auth.me`
- [ ] `auth.changePin`
- [ ] `auth.changePassword`
- [ ] `auth.resetOwnerPin`

### 4. Team
- [ ] `team.list`
- [ ] `team.addHelper`
- [ ] `team.resetPin`
- [ ] `team.setActive`
- [ ] `team.rename`

### 5. Devices
- [ ] `devices.list`
- [ ] `devices.revoke`
- [ ] `devices.heartbeat`

### 6. Settings
- [ ] `settings.get`
- [ ] `settings.update`

### 7. Shifts and balances
- [ ] Expected-balance calculator
- [ ] Transaction summary calculator
- [ ] `shifts.current`
- [ ] `shifts.open`
- [ ] `shifts.balances`
- [ ] `shifts.close`
- [ ] `shifts.list`
- [ ] `shifts.get`

### 8. Customers
- [ ] Customer upsert service
- [ ] `customers.search`
- [ ] `customers.get`

### 9. SMS
- [ ] EcoCash SMS parser
- [ ] SMS ↔ transaction matching
- [ ] `sms.ingest`
- [ ] `sms.unrecorded`
- [ ] `sms.list`
- [ ] `sms.ignore`
- [ ] `sms.latestBalance`
- [ ] `sms.parsePreview`

### 10. Transactions
- [ ] `transactions.create`
- [ ] `transactions.list`
- [ ] `transactions.get`
- [ ] `transactions.flag`
- [ ] `transactions.edit`
- [ ] `transactions.void`

### 11. Movements
- [ ] `movements.create`
- [ ] `movements.list`
- [ ] `movements.void`

### 12. Review
- [ ] `review.queue`
- [ ] `review.markChecked`

### 13. Reports
- [ ] `reports.day`
- [ ] `reports.month`
- [ ] CSV helper
- [ ] `reports.exportCsv`
- [ ] `reports.logbook`
- [ ] `reports.today`

### 14. Sync
- [ ] `sync.pull`
- [ ] `sync.push`

### 15. Docs
- [ ] Backend section in the README
