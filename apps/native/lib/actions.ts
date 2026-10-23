import { expectedBalances, type Balances } from "@cm-agent/api/lib/balances";
import { findSmsForTransaction, findTransactionForSms, matchPair } from "@cm-agent/api/lib/matching";
import { parseSms } from "@cm-agent/api/lib/sms-parser";
import * as Crypto from "expo-crypto";

import { openingOf } from "./booth";
import { deviceStore } from "./device";
import { toDate } from "./format";
import {
  localDb,
  patchRow,
  upsertRows,
  type LocalMovement,
  type LocalShift,
  type LocalSms,
  type LocalTransaction,
} from "./local-db";
import { enqueue } from "./outbox";
import { sessionStore } from "./session";
import { syncNow } from "./sync";

/*
 * Every change on a booth phone goes through here: it is saved to the local copy
 * straight away (so the screen updates offline) and queued for sync.push.
 * Local rows keep dates as ISO strings, the same as rows from sync.pull.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function requireDevice() {
  const device = deviceStore.get();
  if (!device) throw new Error("This phone is not set up");
  return device;
}

function requireUser() {
  const session = sessionStore.get();
  if (!session) throw new Error("Unlock the app first");
  return session.user;
}

function afterChange() {
  void syncNow();
}

const NULL_COUNTS = {
  expectedCashUsd: null,
  expectedFloatUsd: null,
  expectedCashZig: null,
  expectedFloatZig: null,
  countedCashUsd: null,
  countedFloatUsd: null,
  countedCashZig: null,
  countedFloatZig: null,
};

/** Coline counted the money: opens a shift for the person serving. */
export function startShift(input: { servingUserId: string; countedById: string; opening: Balances; note?: string }) {
  const device = requireDevice();
  const id = Crypto.randomUUID();
  const now = new Date();
  const stamp = now.toISOString();
  enqueue({
    kind: "openShift",
    actorId: input.servingUserId,
    countedById: input.countedById,
    data: { id, opening: input.opening, note: input.note, openedAt: now, servingUserId: input.servingUserId },
  });
  const shift: LocalShift = {
    id,
    deviceId: device.id,
    openedById: input.servingUserId,
    status: "OPEN",
    openedAt: stamp,
    openingCashUsd: input.opening.cashUsd,
    openingFloatUsd: input.opening.floatUsd,
    openingCashZig: input.opening.cashZig,
    openingFloatZig: input.opening.floatZig,
    openingNote: input.note ?? null,
    openingCountedById: input.countedById,
    closedAt: null,
    closedById: null,
    ...NULL_COUNTS,
    closeNote: null,
    closedWithUnrecordedSms: 0,
    reviewedAt: null,
    reviewedById: null,
    isDemo: false,
    createdAt: stamp,
    updatedAt: stamp,
  };
  upsertRows("shifts", [shift]);
  afterChange();
  return shift;
}

/** Coline counted the money at the end: closes the shift. */
export function endShift(input: {
  shift: LocalShift;
  countedById: string;
  counted: Balances;
  note?: string;
  unrecordedSms: number;
}) {
  const { shift } = input;
  const now = new Date();
  const stamp = now.toISOString();
  const tables = localDb.get();
  const expected = expectedBalances(
    openingOf(shift),
    Object.values(tables.transactions).filter((tx) => tx.shiftId === shift.id),
    Object.values(tables.movements).filter((movement) => movement.shiftId === shift.id),
  );
  enqueue({
    kind: "closeShift",
    actorId: requireUser().id,
    countedById: input.countedById,
    data: {
      shiftId: shift.id,
      counted: input.counted,
      note: input.note,
      acceptUnrecordedSms: true,
      closedAt: stamp,
    },
  });
  patchRow("shifts", shift.id, {
    status: "CLOSED",
    closedAt: stamp,
    closedById: input.countedById,
    expectedCashUsd: expected.cashUsd,
    expectedFloatUsd: expected.floatUsd,
    expectedCashZig: expected.cashZig,
    expectedFloatZig: expected.floatZig,
    countedCashUsd: input.counted.cashUsd,
    countedFloatUsd: input.counted.floatUsd,
    countedCashZig: input.counted.cashZig,
    countedFloatZig: input.counted.floatZig,
    closeNote: input.note ?? null,
    closedWithUnrecordedSms: input.unrecordedSms,
    updatedAt: stamp,
  });
  afterChange();
  return { expected };
}

export type NewTransaction = {
  type: "CASH_IN" | "CASH_OUT";
  currency: "USD" | "ZIG";
  amount: number;
  customerPhone: string;
  customerName: string;
  customerIdNumber: string;
  reference?: string;
  signature: string;
  smsId?: string;
  manual?: boolean;
  note?: string;
};

/** Saves a cash-in or cash-out on the open shift and links its SMS if one fits. */
export function recordTransaction(shift: LocalShift, input: NewTransaction): LocalTransaction {
  const device = requireDevice();
  const user = requireUser();
  const id = Crypto.randomUUID();
  const now = new Date();
  const stamp = now.toISOString();
  const tables = localDb.get();

  const entry = {
    id,
    type: input.type,
    currency: input.currency,
    amount: input.amount,
    customerPhone: input.customerPhone,
    reference: input.reference ?? null,
    occurredAt: now,
  };
  const candidates = Object.values(tables.smsMessages)
    .filter(
      (sms) =>
        sms.deviceId === device.id &&
        !sms.transactionId &&
        !sms.ignoredAt &&
        Math.abs(toDate(sms.receivedAt).getTime() - now.getTime()) <= DAY_MS,
    )
    .map((sms) => ({ ...sms, receivedAt: toDate(sms.receivedAt) }));
  const chosen = input.smsId ? candidates.find((sms) => sms.id === input.smsId) : undefined;
  const match = chosen
    ? { item: chosen, state: matchPair(entry, chosen) ?? ("MISMATCH" as const) }
    : findSmsForTransaction(entry, candidates);
  const matchState = match?.state ?? (input.manual ? "MANUAL" : "NO_SMS");
  const reference = input.reference ?? match?.item.reference ?? null;

  enqueue({
    kind: "transaction",
    actorId: user.id,
    data: {
      id,
      type: input.type,
      currency: input.currency,
      amount: input.amount,
      customerPhone: input.customerPhone,
      customerName: input.customerName,
      customerIdNumber: input.customerIdNumber,
      reference: reference ?? undefined,
      signature: input.signature,
      smsId: match?.item.id,
      manual: input.manual ?? false,
      note: input.note,
      occurredAt: now,
    },
  });

  const existingCustomer = Object.values(tables.customers).find((customer) => customer.phone === input.customerPhone);
  const customerId = existingCustomer?.id ?? Crypto.randomUUID();
  upsertRows("customers", [
    {
      id: customerId,
      phone: input.customerPhone,
      name: input.customerName,
      idNumber: input.customerIdNumber,
      firstSeenAt: existingCustomer?.firstSeenAt ?? stamp,
      isDemo: false,
      createdAt: existingCustomer?.createdAt ?? stamp,
      updatedAt: stamp,
    },
  ]);

  const transaction: LocalTransaction = {
    id,
    type: input.type,
    currency: input.currency,
    amount: input.amount,
    fee: null,
    commission: null,
    customerId,
    customerPhone: input.customerPhone,
    customerName: input.customerName,
    customerIdNumber: input.customerIdNumber,
    reference,
    shiftId: shift.id,
    deviceId: device.id,
    servedById: user.id,
    occurredAt: stamp,
    matchState,
    note: input.note ?? null,
    flaggedAt: null,
    flagReason: null,
    flaggedById: null,
    voidedAt: null,
    voidReason: null,
    voidedById: null,
    reviewedAt: null,
    reviewedById: null,
    isDemo: false,
    createdAt: stamp,
    updatedAt: stamp,
    pending: true,
  };
  upsertRows("transactions", [transaction]);
  if (match) patchRow("smsMessages", match.item.id, { transactionId: id });
  afterChange();
  return transaction;
}

/** Coline only: cash or float moving that isn't a customer. */
export function recordMovement(input: {
  kind: LocalMovement["kind"];
  currency: "USD" | "ZIG";
  amount: number;
  reason: string;
  shiftId: string;
}) {
  const device = requireDevice();
  const user = requireUser();
  const id = Crypto.randomUUID();
  const now = new Date();
  const stamp = now.toISOString();
  enqueue({
    kind: "movement",
    actorId: user.id,
    data: { id, kind: input.kind, currency: input.currency, amount: input.amount, reason: input.reason, occurredAt: now },
  });
  upsertRows("movements", [
    {
      id,
      kind: input.kind,
      currency: input.currency,
      amount: input.amount,
      reason: input.reason,
      userId: user.id,
      shiftId: input.shiftId,
      deviceId: device.id,
      occurredAt: stamp,
      voidedAt: null,
      voidReason: null,
      voidedById: null,
      isDemo: false,
      createdAt: stamp,
      updatedAt: stamp,
      pending: true,
    },
  ]);
  afterChange();
}

/**
 * An EcoCash SMS just arrived on this phone. Stores it locally (parsed with the
 * same parser as the server), links it to an entry typed before it arrived,
 * and queues it. Returns the stored SMS, or null for other senders.
 */
export function receiveSms(input: { sender: string; body: string; receivedAt: Date }, allowedSenders: string[]): LocalSms | null {
  const allowed = allowedSenders.some((sender) => sender.toLowerCase() === input.sender.toLowerCase());
  if (!allowed) return null;
  const device = requireDevice();
  const tables = localDb.get();
  if (Object.values(tables.smsMessages).some((sms) => sms.body === input.body && sms.sender === input.sender)) {
    return null;
  }

  const id = Crypto.randomUUID();
  const receivedStamp = input.receivedAt.toISOString();
  const parsed = parseSms(input.body);
  enqueue({ kind: "sms", data: { id, sender: input.sender, body: input.body, receivedAt: input.receivedAt } });

  const sms: LocalSms = {
    id,
    deviceId: device.id,
    sender: input.sender,
    body: input.body,
    bodyHash: "",
    receivedAt: receivedStamp,
    parseStatus: parsed.status,
    type: parsed.type,
    currency: parsed.currency,
    amount: parsed.amount,
    counterpartyPhone: parsed.counterpartyPhone,
    counterpartyName: parsed.counterpartyName,
    reference: parsed.reference,
    balanceAfter: parsed.balanceAfter,
    transactionId: null,
    ignoredAt: null,
    ignoredReason: null,
    reviewedAt: null,
    reviewedById: null,
    isDemo: false,
    createdAt: receivedStamp,
    updatedAt: receivedStamp,
    pending: true,
  };

  const waiting = Object.values(tables.transactions)
    .filter((tx) => tx.deviceId === device.id && !tx.voidedAt && tx.matchState !== "MATCHED")
    .filter((tx) => !Object.values(tables.smsMessages).some((other) => other.transactionId === tx.id))
    .map((tx) => ({ ...tx, occurredAt: toDate(tx.occurredAt) }));
  const match = parsed.type ? findTransactionForSms({ ...sms, receivedAt: input.receivedAt }, waiting) : null;
  if (match) {
    sms.transactionId = match.item.id;
    patchRow("transactions", match.item.id, { matchState: match.state, reference: match.item.reference ?? sms.reference });
  }
  upsertRows("smsMessages", [sms]);
  afterChange();
  return sms;
}
