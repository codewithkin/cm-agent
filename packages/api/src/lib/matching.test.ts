import { describe, expect, test } from "bun:test";

import {
  findSmsForTransaction,
  findTransactionForSms,
  matchPair,
  type MatchableSms,
  type MatchableTransaction,
} from "./matching";

const at = (minutes: number) => new Date(Date.UTC(2026, 9, 22, 8, minutes));

const tx: MatchableTransaction = {
  id: "tx1",
  type: "CASH_OUT",
  currency: "USD",
  amount: 5_000,
  customerPhone: "+263772123456",
  reference: null,
  occurredAt: at(10),
};

const sms = (overrides: Partial<MatchableSms>): MatchableSms => ({
  id: "sms",
  type: "CASH_OUT",
  currency: "USD",
  amount: 5_000,
  counterpartyPhone: "+263772123456",
  reference: "REF1",
  receivedAt: at(9),
  ...overrides,
});

describe("matchPair", () => {
  test("matches on details within the time window", () => {
    expect(matchPair(tx, sms({}))).toBe("MATCHED");
    expect(matchPair(tx, sms({ receivedAt: at(30) }))).toBeNull();
  });

  test("same reference with different amount is a mismatch", () => {
    expect(matchPair({ ...tx, reference: "ref1" }, sms({ amount: 4_000 }))).toBe("MISMATCH");
  });

  test("different references never match", () => {
    expect(matchPair({ ...tx, reference: "OTHER" }, sms({}))).toBeNull();
  });

  test("a different customer number does not match", () => {
    expect(matchPair(tx, sms({ counterpartyPhone: "+263782000111" }))).toBeNull();
  });
});

describe("finding the best match", () => {
  test("prefers a reference match over a closer one", () => {
    const result = findSmsForTransaction({ ...tx, reference: "REF2" }, [
      sms({ id: "close", reference: null, receivedAt: at(10) }),
      sms({ id: "byRef", reference: "REF2", receivedAt: at(1) }),
    ]);
    expect(result?.item.id).toBe("byRef");
  });

  test("otherwise picks the closest in time", () => {
    const result = findTransactionForSms(sms({ reference: null, receivedAt: at(12) }), [
      { ...tx, id: "early", occurredAt: at(3) },
      { ...tx, id: "near", occurredAt: at(11) },
    ]);
    expect(result).toEqual({ item: expect.objectContaining({ id: "near" }), state: "MATCHED" });
  });
});
