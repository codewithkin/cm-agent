import { randomUUID } from "node:crypto";

import type { Currency, MatchState, Prisma, TransactionType } from "@cm-agent/db";
import { TRPCError } from "@trpc/server";

import { expectedBalances, type Balances } from "../lib/balances";
import { generateToken, hashToken, sha256 } from "../lib/crypto";
import { pinFields } from "../lib/secrets";
import { dayRange, toDateKey } from "../lib/time";
import { getSettings, SETTINGS_ID } from "./settings";
import type { Db } from "./types";

/*
 * Demo data: a week of realistic activity on a "Demo booth" phone, so the app
 * can be shown and tried before real use. Every row is tagged isDemo, so
 * clearDemoData removes exactly this and never touches real records.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAYS = 7;
const SENDER = "EcoCash";
const SIGNATURE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 120"><path d="M20 80 C60 20 90 110 130 60 S200 30 230 70 S270 90 285 50" fill="none" stroke="#141416" stroke-width="3" stroke-linecap="round"/></svg>',
  );

const CUSTOMERS = [
  { name: "Rudo Moyo", phone: "+263772123123", idNumber: "63-123456 F 42" },
  { name: "Farai Chikore", phone: "+263773456789", idNumber: "08-765432 M 18" },
  { name: "Nyasha Dube", phone: "+263774987654", idNumber: "42-334455 K 07" },
  { name: "Tendai Ncube", phone: "+263778456456", idNumber: "29-998877 P 63" },
  { name: "Tatenda Mhlanga", phone: "+263712880880", idNumber: "75-112233 T 25" },
  { name: "Chipo Sibanda", phone: "+263783908908", idNumber: "13-445566 Q 90" },
  { name: "Kuda Banda", phone: "+263771555222", idNumber: "58-667788 L 31" },
  { name: "Tsitsi Mutasa", phone: "+263779101010", idNumber: "22-990011 R 54" },
];

const AMOUNTS: Record<Currency, number[]> = {
  USD: [1_000, 2_000, 2_000, 5_000, 5_000, 10_000, 12_000, 20_000],
  ZIG: [20_000, 34_000, 50_000, 80_000, 100_000, 150_000],
};

/** Same sequence every time, so the demo looks the same on every phone. */
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

const localPhone = (phone: string) => `0${phone.slice(4)}`;
const money = (cents: number) => (cents / 100).toFixed(2);

/** Wording close to an EcoCash confirmation, in the shape the SMS parser reads. */
function smsBody(type: TransactionType, currency: Currency, amount: number, name: string, phone: string, reference: string, balance: number) {
  const label = currency === "USD" ? "USD" : "ZiG";
  return type === "CASH_OUT"
    ? `Cash Out of ${label} ${money(amount)} from ${name.toUpperCase()} ${localPhone(phone)} confirmed. Txn ID: ${reference}. New balance ${label} ${money(balance)}`
    : `Cash-In of ${label} ${money(amount)} to ${name.toUpperCase()} ${localPhone(phone)} successful. Txn ID: ${reference}. New balance ${label} ${money(balance)}`;
}

export async function hasDemoData(db: Db) {
  const [users, transactions] = await Promise.all([
    db.user.count({ where: { isDemo: true } }),
    db.transaction.count({ where: { isDemo: true } }),
  ]);
  return { active: users + transactions > 0, transactions };
}

/** Adds the demo week. Needs the owner, who "counted" each demo shift. */
export async function applyDemoData(db: Db, ownerId: string) {
  if ((await hasDemoData(db)).active) {
    throw new TRPCError({ code: "CONFLICT", message: "Demo data is already added" });
  }
  const random = seededRandom(20_261_022);
  const now = new Date();

  // People and the demo phone.
  const helpers = [
    { id: randomUUID(), name: "Helper 1 (demo)", pin: "1111" },
    { id: randomUUID(), name: "Helper 2 (demo)", pin: "2222" },
  ];
  for (const helper of helpers) {
    await db.user.create({
      data: { id: helper.id, name: helper.name, role: "HELPER", isDemo: true, ...(await pinFields(helper.pin)) },
    });
  }
  const device = await db.device.create({
    data: {
      label: "Demo booth",
      kind: "BOOTH",
      tokenHash: hashToken(generateToken()),
      registeredById: ownerId,
      lastSyncedAt: now,
      lastSeenAt: now,
      appVersion: "1.0.0",
      isDemo: true,
    },
  });

  // Customers (an existing real customer with the same number is reused, not tagged).
  const customers: { id: string; name: string; phone: string; idNumber: string }[] = [];
  for (const details of CUSTOMERS) {
    const existing = await db.customer.findUnique({ where: { phone: details.phone } });
    const customer =
      existing ??
      (await db.customer.create({
        data: { ...details, firstSeenAt: new Date(now.getTime() - 60 * 24 * HOUR_MS), isDemo: true },
      }));
    customers.push({ id: customer.id, name: details.name, phone: details.phone, idNumber: details.idNumber });
  }

  let opening: Balances = { cashUsd: 50_000, floatUsd: 40_000, cashZig: 150_000, floatZig: 300_000 };
  const transactions: Prisma.TransactionCreateManyInput[] = [];
  const smsMessages: Prisma.SmsMessageCreateManyInput[] = [];
  const movements: Prisma.MovementCreateManyInput[] = [];

  for (let daysAgo = DAYS - 1; daysAgo >= 0; daysAgo--) {
    const dayStart = dayRange(toDateKey(new Date(now.getTime() - daysAgo * 24 * HOUR_MS))).start;
    const today = daysAgo === 0;
    const helper = helpers[daysAgo % 2]!;
    const openedAt = new Date(Math.min(dayStart.getTime() + 8.2 * HOUR_MS, now.getTime() - 2 * HOUR_MS));
    const endAt = today ? now : new Date(dayStart.getTime() + 17.7 * HOUR_MS);
    const shiftId = randomUUID();
    const shiftTransactions: Prisma.TransactionCreateManyInput[] = [];
    const shiftMovements: Prisma.MovementCreateManyInput[] = [];

    const count = 6 + Math.floor(random() * 6);
    for (let i = 0; i < count; i++) {
      const type: TransactionType = random() < 0.55 ? "CASH_OUT" : "CASH_IN";
      const currency: Currency = random() < 0.65 ? "USD" : "ZIG";
      const amount = pick(AMOUNTS[currency], random);
      const customer = pick(customers, random);
      const occurredAt = new Date(openedAt.getTime() + ((i + 1) / (count + 1)) * (endAt.getTime() - openedAt.getTime()));
      const reference = `DM${toDateKey(occurredAt).replace(/-/g, "")}${String(i).padStart(2, "0")}${Math.floor(random() * 9000 + 1000)}`;

      // A few problems, so Review and the reports have something to show.
      let matchState: MatchState = "MATCHED";
      let note: string | null = null;
      let flag: { at: Date; reason: string } | null = null;
      let voided: { at: Date; reason: string } | null = null;
      if (daysAgo === 1 && i === 2) {
        matchState = "MANUAL";
        note = "Customer's phone was off";
      } else if (daysAgo === 0 && i === 1) {
        matchState = "MISMATCH";
      } else if (daysAgo === 2 && i === 3) {
        flag = { at: new Date(occurredAt.getTime() + 5 * 60_000), reason: "Typed wrong amount, should be 300" };
      } else if (daysAgo === 3 && i === 0) {
        voided = { at: new Date(occurredAt.getTime() + HOUR_MS), reason: "Wrong amount" };
      }

      const id = randomUUID();
      const transaction: Prisma.TransactionCreateManyInput = {
        id,
        type,
        currency,
        amount,
        commission: type === "CASH_OUT" ? Math.round(amount * 0.004) : null,
        customerId: customer.id,
        customerPhone: customer.phone,
        customerName: customer.name,
        customerIdNumber: customer.idNumber,
        reference: matchState === "MANUAL" ? null : reference,
        signature: SIGNATURE,
        shiftId,
        deviceId: device.id,
        servedById: helper.id,
        occurredAt,
        matchState,
        note,
        flaggedAt: flag?.at ?? null,
        flagReason: flag?.reason ?? null,
        flaggedById: flag ? helper.id : null,
        voidedAt: voided?.at ?? null,
        voidReason: voided?.reason ?? null,
        voidedById: voided ? ownerId : null,
        isDemo: true,
      };
      shiftTransactions.push(transaction);

      if (matchState !== "MANUAL") {
        const smsAmount = matchState === "MISMATCH" ? amount - 1_800 : amount;
        const running = expectedBalances(opening, shiftTransactions.map((tx) => ({ ...tx, commission: tx.commission ?? null, voidedAt: null })), []);
        const balance = running[currency === "USD" ? "floatUsd" : "floatZig"];
        const body = smsBody(type, currency, smsAmount, customer.name, customer.phone, reference, balance);
        smsMessages.push({
          deviceId: device.id,
          sender: SENDER,
          body,
          bodyHash: sha256(`${SENDER}|${body}`),
          receivedAt: new Date(occurredAt.getTime() - 20_000),
          parseStatus: "PARSED",
          type,
          currency,
          amount: smsAmount,
          counterpartyPhone: customer.phone,
          counterpartyName: customer.name.toUpperCase(),
          reference,
          balanceAfter: balance,
          transactionId: voided ? null : id,
          isDemo: true,
        });
      }
    }

    if (daysAgo === 4) {
      shiftMovements.push({
        kind: "FLOAT_BOUGHT",
        currency: "USD",
        amount: 20_000,
        reason: "Bought EcoCash",
        userId: ownerId,
        shiftId,
        deviceId: device.id,
        occurredAt: new Date(openedAt.getTime() + 3 * HOUR_MS),
        isDemo: true,
      });
    }

    const expected = expectedBalances(
      opening,
      shiftTransactions.map((tx) => ({ type: tx.type, currency: tx.currency, amount: tx.amount, commission: tx.commission ?? null, voidedAt: tx.voidedAt ? new Date(tx.voidedAt) : null })),
      shiftMovements.map((movement) => ({ kind: movement.kind, currency: movement.currency, amount: movement.amount, voidedAt: null })),
    );
    // One shift that didn't balance, for the review queue.
    const counted = daysAgo === 2 ? { ...expected, cashUsd: expected.cashUsd - 500 } : expected;

    await db.shift.create({
      data: {
        id: shiftId,
        deviceId: device.id,
        openedById: helper.id,
        openingCountedById: ownerId,
        status: today ? "OPEN" : "CLOSED",
        openedAt,
        openingCashUsd: opening.cashUsd,
        openingFloatUsd: opening.floatUsd,
        openingCashZig: opening.cashZig,
        openingFloatZig: opening.floatZig,
        ...(today
          ? {}
          : {
              closedAt: endAt,
              closedById: ownerId,
              expectedCashUsd: expected.cashUsd,
              expectedFloatUsd: expected.floatUsd,
              expectedCashZig: expected.cashZig,
              expectedFloatZig: expected.floatZig,
              countedCashUsd: counted.cashUsd,
              countedFloatUsd: counted.floatUsd,
              countedCashZig: counted.cashZig,
              countedFloatZig: counted.floatZig,
              closeNote: daysAgo === 2 ? "Short USD 5. Gave change twice." : null,
            }),
        isDemo: true,
      },
    });
    transactions.push(...shiftTransactions);
    movements.push(...shiftMovements);
    if (!today) opening = counted;
  }

  // One EcoCash SMS today that nobody has saved yet.
  const waiting = customers[3]!;
  const waitingBody = smsBody("CASH_OUT", "USD", 2_000, waiting.name, waiting.phone, `DM${toDateKey(now).replace(/-/g, "")}991234`, 31_000);
  smsMessages.push({
    deviceId: device.id,
    sender: SENDER,
    body: waitingBody,
    bodyHash: sha256(`${SENDER}|${waitingBody}`),
    receivedAt: new Date(now.getTime() - 20 * 60_000),
    parseStatus: "PARSED",
    type: "CASH_OUT",
    currency: "USD",
    amount: 2_000,
    counterpartyPhone: waiting.phone,
    counterpartyName: waiting.name.toUpperCase(),
    reference: `DM${toDateKey(now).replace(/-/g, "")}991234`,
    balanceAfter: 31_000,
    isDemo: true,
  });

  await db.transaction.createMany({ data: transactions });
  await db.movement.createMany({ data: movements });
  await db.smsMessage.createMany({ data: smsMessages, skipDuplicates: true });

  return { helpers: helpers.map(({ name, pin }) => ({ name, pin })), transactions: transactions.length, days: DAYS };
}

/**
 * Removes everything tagged as demo. Demo helpers who were also used for real
 * work are deactivated instead of deleted, so real records keep their names.
 * Phones see dataResetAt change and reload their local copy.
 */
export async function clearDemoData(db: Db) {
  const [demoUsers, demoDevices, demoTransactions] = await Promise.all([
    db.user.findMany({ where: { isDemo: true }, select: { id: true } }),
    db.device.findMany({ where: { isDemo: true }, select: { id: true } }),
    db.transaction.findMany({ where: { isDemo: true }, select: { id: true } }),
  ]);
  const userIds = demoUsers.map((user) => user.id);
  const deviceIds = demoDevices.map((device) => device.id);
  const transactionIds = demoTransactions.map((tx) => tx.id);

  await db.smsMessage.deleteMany({ where: { OR: [{ isDemo: true }, { transactionId: { in: transactionIds } }] } });
  await db.auditEvent.deleteMany({ where: { OR: [{ entityId: { in: transactionIds } }, { actorId: { in: userIds } }] } });
  const removed = await db.transaction.deleteMany({ where: { isDemo: true } });
  await db.movement.deleteMany({ where: { isDemo: true } });
  await db.shift.deleteMany({ where: { isDemo: true } });
  await db.session.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { deviceId: { in: deviceIds } }] } });
  await db.customer.deleteMany({ where: { isDemo: true, transactions: { none: {} } } });
  await db.device.deleteMany({ where: { isDemo: true, shifts: { none: {} }, transactions: { none: {} }, movements: { none: {} }, smsMessages: { none: {} } } });
  await db.device.updateMany({ where: { isDemo: true }, data: { revokedAt: new Date() } });

  const unused = { shifts: { none: {} }, transactions: { none: {} }, movements: { none: {} }, auditEvents: { none: {} } };
  await db.user.deleteMany({ where: { isDemo: true, ...unused } });
  await db.user.updateMany({ where: { isDemo: true }, data: { active: false } });

  await getSettings(db);
  await db.businessSettings.update({ where: { id: SETTINGS_ID }, data: { dataResetAt: new Date() } });
  return { transactions: removed.count };
}
