# CM Agent: Screens Plan

Screen-by-screen brief for the designer. It covers every screen in the first release, what each must show, and the states to design.

- **Client:** Coline Murahwa, an EcoCash agent. Her son and daughter often serve customers for her.
- **Business name:** not decided yet. Use `[Business name]` as a placeholder and keep the logo area swappable. "CM Agent" is a working name only.
- **Full feature spec:** [EcoCash Agent App: Feature Spec](https://claude.ai/artifact/NvFEV6iZNq1sixVJmdCDnb)
- **Platform:** Android only. Expo / React Native app installed directly on three phones, not through the Play Store.

---

## 1. Who uses it, on which phone

| Device | Who uses it | What they mainly do |
| --- | --- | --- |
| Booth phone 1 | Helpers and Coline | Serve customers, record transactions, open and close shifts |
| Booth phone 2 | Helpers and Coline | Same as booth phone 1. Both phones share one set of records |
| Owner phone | Coline only | Watch balances, review flags, read daily and monthly reports |

The app has two roles:

- **Owner (Coline):** sees and changes everything, and gets owner tools on the booth phones too.
- **Helper:** records transactions and opens and closes **their own** shift. Helpers can't edit or delete a saved entry, only flag it for the owner.

## 2. Design principles

1. **Used outdoors at a busy counter.** It needs high contrast, readable in direct sunlight, with large type for money.
2. **One hand, fast.** Touch targets at least 48 dp. The main actions (Cash-in, Cash-out) are reachable with the thumb. Recording a normal transaction should take about 15 seconds.
3. **Money is never ambiguous.** Always show the currency next to the amount: `USD 1,250.00`, `ZiG 340.00`. Give USD and ZiG distinct visual treatments (badge colour plus label) that work in both themes. Never rely on colour alone.
4. **Status by icon + word + colour,** never colour alone. This applies to match states, variance and sync.
5. **Offline is normal, not an error.** Show sync status calmly, as a small chip. Don't use blocking dialogs for it.
6. **Low-end Android phones.** Flat UI, few heavy images or animations, and a 360 × 800 dp baseline frame.
7. **Light and dark themes.** The project already has a theme toggle (HeroUI Native + Tailwind via Uniwind).
8. **No EcoCash or Econet logos or brand colours.** Mention EcoCash in text only.
9. **English copy in v1,** kept short. Leave room for Shona and Ndebele later, since those strings run longer.

## 3. Shared components to design first

| Component | Notes |
| --- | --- |
| **Balance tile** | Currency badge, label (Cash / Float), large amount. States: normal, low (warning), unknown (not counted yet) |
| **Shift banner** | "Tatenda is serving · since 08:12", plus a tap to switch user |
| **Type toggle** | Cash-in / Cash-out. Large, segmented, clearly different icons |
| **Currency toggle** | USD / ZiG |
| **Amount keypad** | Custom numeric keypad with a big amount display above it. No system keyboard |
| **Match chip** | `Matched` (tick) · `No SMS` (amber) · `Unrecorded SMS` (red) · `Mismatch` (red) · `Manual` (grey) |
| **Variance badge** | `Balanced` · `Short USD 5.00` · `Over USD 2.00` |
| **Sync chip** | `Synced 14:32` · `Syncing…` · `Offline · 12 waiting` |
| **Transaction row** | Type icon, amount with currency, customer number (masked: 0772 ••• 123), time, served-by initials, match chip |
| **Signature pad** | Full-width area, a Clear button, and a "Customer signs here" baseline |
| **PIN keypad** | 4 dots plus a numeric keypad, with shake-on-wrong |
| **Empty, error and offline states** | One illustration style for all |

## 4. Navigation map

```
First launch          Every hand-over              Booth phone (tabs)                Owner phone (tabs)
─────────────         ───────────────              ──────────────────                ──────────────────
Splash                Lock: who is serving?        Home                              Today
Device setup ──────►  PIN entry ─────────────────► Transactions                      Review
SMS permission                                     SMS inbox                         History
                                                   Shift                             Reports
                                                                                     More (Team, Devices, Settings)
```

On a booth phone, Coline sees the booth tabs plus an **Owner tools** entry that opens the owner screens.

---

## 5. Screens

Each screen lists: **purpose · who sees it · content · actions · states**.

### A. Setup and sign-in (custom lightweight auth)

There are no email sign-ups and no third-party logins. Coline has one owner account. Each phone is registered once. After that, everyone unlocks with their own 4-digit PIN, which also works offline.

**A1. Splash**
- App mark (placeholder) and `[Business name]`.
- Goes to Device setup on first launch, otherwise to the Lock screen.

**A2. Device setup** (first launch only, done by Coline)
- Step 1: owner sign-in with phone number and password.
- Step 2: "What is this phone?" with three large options: Booth phone 1, Booth phone 2, Owner phone.
- Step 3: confirmation, e.g. "This phone is Booth phone 1".
- States: wrong password, no internet ("Setup needs internet once. After that the app works offline."), phone already registered (offer to replace it).

**A3. SMS permission explainer** (booth phones only)
- Explains in plain words why the app reads EcoCash SMS: it fills in transactions for you and checks them.
- One button opens the Android permission prompt.
- Denied state: explains that the app still works but entries must be typed in, and gives a "Try again" button.

**A4. Lock screen: who is serving?**
- Shown on launch, after 2 minutes idle, and on "Switch user".
- Avatar tiles (initials + name) for each active person on this phone. Coline's tile is marked Owner.
- Small sync chip and `[Business name]` at the top.

**A5. PIN entry**
- The chosen person's avatar and name, 4 PIN dots and the PIN keypad.
- States: wrong PIN (shake + "Wrong PIN, 3 tries left"), locked after 5 tries ("Ask Coline to reset your PIN"), and "Forgot PIN?" (helpers are told to ask the owner; the owner gets a reset that needs the password).

**A6. Set or change PIN**
- Enter the new PIN twice. Used for a helper's first sign-in and for an owner reset.

### B. Booth screens (helpers and Coline)

**B1. Open shift**
- Purpose: confirm what is in the drawer and the float before serving.
- Content: four inputs (USD cash, USD float, ZiG cash, ZiG float), filled in from the last close and labelled "From last close · 17:45 yesterday". The float can also be filled from the latest EcoCash balance SMS.
- Actions: "Counts are correct, start shift", or edit a value. If a value differs from the last close, the screen asks for a short note.
- States: first shift ever (blank inputs), previous shift not closed (block, and tell the helper to ask the owner, or let the owner close it).

**B2. Home (shift dashboard)** — the most-used screen
- Top: shift banner and sync chip.
- **Four balance tiles:** USD cash, USD float, ZiG cash, ZiG float. These are the expected balances right now.
- **Two big buttons:** Cash-in and Cash-out.
- **Unrecorded SMS strip:** "2 EcoCash SMS not recorded yet". Tap to open the SMS inbox. Red when the count is above 0.
- Low-balance warning banner, e.g. "USD cash below USD 50. Top up before cash-outs."
- Today's last 5 transactions (transaction rows), plus "See all".
- States: no shift open (a big "Open shift" call to action), offline (sync chip only), owner signed in (adds an Owner tools entry).

**B3. Incoming SMS sheet**
- Purpose: a bottom sheet that pops up when an EcoCash SMS arrives (on any screen), or from the Android notification.
- Content: "Cash-out · USD 50.00 from 0772 ••• 123 · Ref [reference]". The real reference format comes from Coline's SMS samples.
- Actions: "Record it" opens B4 with fields filled in; "Later" sends it to the SMS inbox.

**B4. New transaction**
- Header: type toggle and currency toggle.
- Amount display with the amount keypad.
- Customer phone (+263 prefix). As the number is typed, repeat customers appear as suggestions; picking one fills name and ID.
- Customer name, and ID / passport number.
- EcoCash reference, filled from the SMS or typed manually, with a match chip beside it.
- **Cash-out only, an SMS gate:** a status block at the top.
  - Waiting: "Waiting for EcoCash SMS…" with a spinner. "Pay out" is disabled.
  - Confirmed: big green "SMS confirmed: pay out USD 50.00". "Pay out" is enabled.
  - Override: "Record without SMS" behind a confirmation. The entry is flagged.
- Primary action: "Next: customer signature".
- States: filled from SMS (fields locked, with an "Edit" link), manual, validation errors (missing ID, amount 0), insufficient expected cash for a cash-out (warning, doesn't block).

**B5. Customer signature**
- Shows a recap line at the top: "Cash-out · USD 50.00 · Rudo Moyo".
- Large signature pad, landscape-friendly. Clear and Save.
- Optional "Add ID photo" (Release 2; leave a slot in the design).

**B6. Saved confirmation**
- Big tick, a one-line summary and the match chip.
- Updated balance: "USD cash now USD 420.00".
- Actions: "Next customer" (primary), "View entry".
- Auto-returns to Home after a few seconds.

**B7. Transactions (shift list)**
- Today's or this shift's transactions, newest first.
- Filters: All, Cash-in, Cash-out, USD, ZiG, Flagged. Search by phone number or reference.
- Totals strip at the top: count and value per currency.
- States: empty ("No transactions yet this shift"), filtered empty.

**B8. Transaction detail**
- All fields, the signature image, served-by, device, time, and the raw SMS text (collapsible).
- Match chip with an explanation, e.g. "No SMS found for this reference".
- History: created, flagged, edited, voided, each with who, when and why.
- Helper action: "Flag for Coline" with a reason.
- Owner actions: "Edit" and "Void", each requiring a reason. A voided entry shows struck through with a Voided badge; nothing is ever deleted.

**B9. SMS inbox**
- EcoCash SMS that have no recorded entry yet, newest first, with a red count badge on the tab.
- Each row: type, amount, number, reference, time, and a "Record" button.
- Second segment: "All SMS today", with the match state on each.
- State: all clear ("Every SMS today is recorded").

**B10. Cash or float movement**
- Purpose: record money moving that isn't a customer transaction.
- Kind picker: Float bought (cash → float), Cash deposited at bank, Cash added by owner, Cash taken by owner, Commission paid out.
- Currency, amount, reason (required), who.
- Shows the effect before saving, e.g. "USD cash 420 → 220 · USD float 300 → 500".

**B11. Shift tab**
- Current shift: who, start time, transaction count, value handled per currency, flags.
- Actions: "Switch user" (to the Lock screen; the shift stays open) and "Close shift".
- Past shifts on this phone (owner only).

**B12. Close shift**
- Step 1, count cash: one input per currency, with the expected amount shown underneath for reference.
- Step 2, float: filled from the latest EcoCash balance SMS ("From SMS at 17:41"), or typed in.
- Step 3, review: a table of expected, counted and variance for each of the four balances, with variance badges.
- If any variance is outside Coline's tolerance, a required note ("What happened?") appears before Confirm.
- Unrecorded SMS warning: "2 SMS not recorded. Record them first?" with a "Record now" button (preferred) or "Close anyway" (flagged).
- Confirm closes the shift, then shows B13.

**B13. Shift summary**
- Receipt-style card: who, times, counts and values per currency, commission, variance, flags.
- Actions: "Done" (back to the Lock screen) and "Share" (image to WhatsApp).
- The same card is reused for any past shift on the owner side.

### C. Owner screens (Coline)

**C1. Today**
- Combined live balances, the four tiles, summed across both booth phones.
- Per booth phone: who is serving, since when, and a sync chip ("Booth 2 · last synced 14:32").
- Today so far: cash-in and cash-out totals per currency, number of transactions, commission.
- Flags count, which taps through to Review.
- Shortcut to today's end-of-day report.
- States: no shifts open, a booth phone offline for a long time ("Booth 1 hasn't synced since 11:05").

**C2. Review (flags queue)**
- Everything that needs Coline: no-SMS entries, unrecorded SMS, mismatches, helper flags, variances with notes, edits.
- Grouped by day, each with a type icon and a short reason.
- Actions per item: open, "Mark as checked", edit or void (opens B8).
- State: empty ("Nothing to review").

**C3. End-of-day report**
- Date picker at the top (defaults to today).
- Sections:
  1. Header: date, shifts, who served, times.
  2. Totals per currency: cash-ins and cash-outs (count + value), commission.
  3. Balances table: opening, expected, counted, variance for cash and float in each currency.
  4. Flags list.
  5. Per helper: transactions, value handled, variance on their shifts.
- Actions: "Share as image" (WhatsApp), "Export PDF".
- Also arrives as a push notification when the last shift of the day closes: "Today: 48 transactions · balanced". Design the notification text too.

**C4. History (logbook)**
- Every transaction, grouped by day. Search by phone, name, ID number or reference. Filters: helper, type, currency, match state, date range.
- Tapping a row opens the transaction detail (B8). Tapping a customer opens C5.

**C5. Customer detail**
- Phone, name, ID number, first seen, transaction count and totals.
- That customer's transactions.

**C6. Monthly report**
- Month picker.
- Chart: daily transaction value for the month, cash-in vs cash-out, with a currency switch.
- Month totals per currency, commission, number of customers.
- Per helper breakdown.
- Variance log: every non-zero variance with its note.
- Largest transactions and top repeat customers.
- Export: "PDF logbook" (laid out like the paper book, with signatures) and "CSV / Excel".
- States: month in progress ("1–22 Oct so far"), no data.

**C7. Shift history**
- All shifts, newest first, with who, phone, times and a variance badge. Tapping one opens the shift summary (B13).

**C8. Team**
- List of people: name, role, phone they use, active or inactive.
- Add helper: name and first PIN (or "set on first sign-in").
- Per person: reset PIN, deactivate. Deactivating removes them from the Lock screen; their history stays.

**C9. Devices**
- Booth phone 1, Booth phone 2, Owner phone: last synced, app version, items waiting to sync.
- "Sign out this phone" for a lost phone, with a strong confirmation.

**C10. Settings**
- Business: business name (placeholder until decided), agent code(s) per currency, logo upload.
- Money rules: variance tolerance per currency (default 0), low cash and low float thresholds per currency.
- SMS: EcoCash sender name or number, and a "Test with a pasted SMS" tool.
- Data: how long to keep records, backup now, last backup time.
- Owner account: change password and owner PIN.
- Appearance: theme. Language comes later.

**C11. Sync details** (reached from any sync chip)
- Per phone: last synced, items waiting, last error in plain words. A "Sync now" button.

---

## 6. States to design across the app

| State | Where | Treatment |
| --- | --- | --- |
| Offline | Everywhere | Sync chip changes to `Offline · n waiting`. No modal |
| First run / empty | Home, Transactions, History, Reports, Review | Friendly one-liner with the next action |
| Loading | Reports, History | Skeleton rows. No full-screen spinners |
| Unrecorded SMS | Home, SMS tab, Close shift | Red count badge plus strip |
| Low balance | Home, Today | Amber banner naming the currency and amount |
| Locked / idle | Any screen | Returns to the Lock screen; the current form draft is kept |
| Permission denied (SMS) | Home, New transaction | Info banner saying manual entry is on, with a "Fix" link |

## 7. Deliverables wanted from design

1. Component sheet (section 3), in light and dark.
2. All screens in section 5 at 360 × 800 dp, light theme. Dark theme for B2, B4, C1, C3.
3. A clickable flow for: Lock → PIN → Open shift → Cash-out with the SMS gate → Signature → Saved → Close shift → Shift summary.
4. Copy for the end-of-day push notification and the incoming-SMS Android notification.
5. A placeholder logo lockup that can take the final business name later.

## 8. Notes for development (not for the designer)

- **Stack:** existing Better-T-Stack monorepo. Expo Router (`apps/native`), Hono + tRPC on Bun (`apps/server`, `packages/api`), Prisma + PostgreSQL (`packages/db`).
- **Suggested routes:** `(auth)/setup`, `(auth)/lock`, `(auth)/pin`; `(booth)/(tabs)/{index,transactions,sms,shift}` with stacks for `transaction/new`, `transaction/[id]`, `signature`, `movement/new`, `shift/open`, `shift/close`; `(owner)/(tabs)/{index,review,history,reports,more}` with `report/day/[date]`, `report/month/[month]`, `customer/[id]`, `team`, `devices`, `settings`. These replace the starter `(drawer)` routes.
- **Custom auth, lightweight:**
  - One owner account (phone + password hashed with `Bun.password`).
  - Device registration issues a long-lived device token, stored in `expo-secure-store` and checked by tRPC middleware.
  - Per-person 4-digit PINs, hashed. The hashes are synced to registered devices so unlocking works offline.
  - The active person's ID is attached to every write and to the audit log.
- **Prisma models** (from the spec): `Transaction`, `Customer`, `Shift`, `Movement`, `SmsMessage`, `User`, `Device`, `AuditEvent`. Money as integer cents with a currency enum. Unique EcoCash reference. No hard deletes.
- **SMS reading:** Google's SMS User Consent API in a local native module. No `READ_SMS` / `RECEIVE_SMS`: Android asks the person to allow each SMS, which keeps the app acceptable to Play Protect and Play review.
