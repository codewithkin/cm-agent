# CM Agent: App Build Plan

Building the Expo app from `designs/CM Agent Screens (standalone).html` (v2 screens). Each sub-feature is one commit on `main`.

## Rules from the design that change the backend

| Design says | Backend change |
| --- | --- |
| Only Coline counts the money to start or end a shift (B1, B12) | `shifts.open` / `shifts.close` are owner-only; a helper's phone sends Coline's approval through `sync.push` with `countedById` |
| Move money is Coline only (B10) | `movements.create` is owner-only |
| Helpers can't see cash or EcoCash balances (C11) | Balances, opening and closing counts are hidden from helpers; they still get low-money warnings |
| Helpers see only their own work (B7) | `transactions.list` returns only the helper's own entries |
| "Save without SMS" asks why (C2 shows the note) | `Transaction.note` |
| "Came 18 times before" (B3, B4) | `customers.byPhone` with visit count |
| Lock screen shows who is working and last shift (A4) | `auth.deviceUsers` adds that |
| Shift summary shows customers and problems (B13) | `shifts.get` adds both |
| Low money warning on all phones toggle (C10) | `BusinessSettings.lowWarningOnBooths` |

## How the app works

- **Booth phones are offline-first.** They keep a local copy of their own records (from `sync.pull`) and queue every change in an outbox that `sync.push` sends when there is internet.
- **The owner phone reads live** from the server, with the last result kept on screen while offline.
- **PIN unlock works offline**, using the salted verifier from `auth.deviceUsers`.
- **Shared logic** (balances, matching, SMS parser, money, time) is imported from `@cm-agent/api/lib/*`, so the phone and server agree.

## Motion and flow

Animations use Reanimated (already installed) and haptics from `expo-haptics`. They should make the counter faster to use, not slower: every animation is under 350 ms and never blocks a tap.

| Where | Motion |
| --- | --- |
| Anything tappable | Springs to 96% while pressed, light haptic on release |
| Screen content | Cards and rows fade up in a short stagger on entry, fade out on exit |
| Screen changes | Stack slides from the right; flows that finish something (new transaction, end shift) open as full-screen modals that slide up |
| PIN pad | Dots fill with a pop; a wrong PIN shakes the dots with an error haptic |
| Amount keypad | Digits slide in as they are typed; quick-amount chips bounce |
| Stepper | The active step grows and fills; finished steps turn into ticks |
| SMS waiting | Pulsing dot and a live timer; on arrival the card flips green with a success haptic |
| Saved screen | The tick pops in with a spring, then the "Next customer" countdown bar drains |
| Lists | New rows slide in; removed rows collapse (Reanimated layout transitions) |
| Banners and sheets | Slide down from the top / up from the bottom |

### Navigation flow

1. **Start:** Splash → (first launch) owner sign-in → choose phone → SMS permission → Who is serving?
2. **Every hand-over:** Who is serving? → PIN → Home (booth) or Today (owner phone). Idle for 2 minutes or "Change person" returns to Who is serving?
3. **Booth tabs:** Home · Transactions · ＋ New · SMS · Shift. The ＋ opens New transaction as a modal; SMS arriving anywhere opens the incoming-SMS sheet.
4. **Owner tabs:** Today · Check · History · Reports · More (people, phones, settings, who sees what).
5. **Guards:** helpers who reach a Coline-only page see "No access" with a way back; nothing Coline-only appears in a helper's tabs.

## Sub-features

### 1. Backend changes for the design
- [x] `Shift.openingCountedById`
- [x] `Transaction.note`
- [x] `BusinessSettings.lowWarningOnBooths`
- [x] Shift open/close: owner counts, for a serving helper
- [x] Movements: owner only
- [x] Hide balances from helpers in `shifts.*`
- [x] Helpers see only their own transactions
- [x] Note on transactions saved without SMS
- [x] `auth.deviceUsers` serving info
- [x] `customers.byPhone`
- [x] Customer and problem counts in `shifts.get`
- [x] Richer review items
- [x] `lowWarningOnBooths` in settings
- [x] `sync.push` carries Coline's approval

### 2. App foundation
- [x] Design tokens (colours, radii) in the theme
- [x] Fonts: Manrope and JetBrains Mono
- [x] Text, Icon and money formatting helpers
- [x] Device and session storage
- [x] tRPC client sends device and session headers
- [x] Local store for offline records
- [x] Outbox for offline writes
- [x] Sync engine (push, pull, heartbeat)
- [x] Network status
- [x] Offline PIN check

### 3. Shared components
- [x] Motion presets and pressable with spring and haptics
- [x] Currency badge, status chips, sync chip
- [x] Buttons
- [x] Cards, banners, avatar
- [x] Stepper
- [x] PIN pad
- [x] Amount keypad
- [x] Transaction row
- [x] Booth and owner bottom bars
- [x] Signature pad
- [x] Screen header

### 4. First launch (A1–A3)
- [x] Router setup and route guards (replaces the starter drawer)
- [x] A1 Splash
- [x] A2 Owner sign-in
- [x] A2 Choose phone
- [x] A3 Confirmation and SMS permission

### 5. Every hand-over (A4–A6)
- [x] A4 Who is serving?
- [x] A5 PIN entry
- [x] A6 Set PIN

### 6. Booth: serving customers (B1–B10)
- [x] B2 Home, no shift
- [x] B1 Start shift (Coline counts)
- [x] B2 Home, shift dashboard
- [x] SMS reader native module
- [x] B3 Incoming SMS sheet
- [x] B4 New transaction: amount and SMS wait
- [x] B4 Customer and name check
- [x] B5 Customer signature
- [x] B6 Saved
- [x] B7 Transactions list
- [x] B8 Transaction detail
- [x] B9 SMS inbox
- [x] B10 Move money

### 7. End the shift (B11–B13)
- [x] B11 Shift tab
- [x] B12 Coline PIN, count cash, count EcoCash, check
- [x] B13 Shift summary and share

### 8. Owner (C1–C11, X1)
- [x] Owner tab bar
- [x] C1 Today
- [x] C2 Review
- [x] C3 Day report and PDF
- [x] C4 History and CSV export
- [x] C5 Customer
- [x] C6 Monthly report
- [x] C7 Shift history
- [x] C8 People
- [x] C9 Phones
- [x] C10 Settings
- [x] C11 Who can see what
- [x] B2 Home for Coline on a booth phone
- [x] X1 No access
- [x] N1 Local notification for incoming SMS
