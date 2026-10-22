import { describe, expect, test } from "bun:test";

import { parseSms } from "./sms-parser";

// These messages are illustrative only. They are not real EcoCash wording;
// replace them with real samples from the booth phones once available.

describe("parseSms", () => {
  test("reads a cash-out confirmation", () => {
    const parsed = parseSms(
      "Cash Out of USD 50.00 from JOHN MOYO 0772123456 confirmed. Txn ID: CO241022.1534.A1B2C3. New balance USD 320.50",
    );
    expect(parsed).toEqual({
      status: "PARSED",
      type: "CASH_OUT",
      currency: "USD",
      amount: 5_000,
      counterpartyPhone: "+263772123456",
      counterpartyName: "JOHN MOYO",
      reference: "CO241022.1534.A1B2C3",
      balanceAfter: 32_050,
    });
  });

  test("reads a ZiG cash-in and ignores the balance when picking the amount", () => {
    const parsed = parseSms(
      "Balance: ZiG 1,200.00. Cash-In of ZiG 250 to 0782 000 111 successful. Ref: CI99887766",
    );
    expect(parsed.type).toBe("CASH_IN");
    expect(parsed.currency).toBe("ZIG");
    expect(parsed.amount).toBe(25_000);
    expect(parsed.balanceAfter).toBe(120_000);
    expect(parsed.reference).toBe("CI99887766");
    expect(parsed.counterpartyPhone).toBe("+263782000111");
  });

  test("a balance enquiry is BALANCE_ONLY", () => {
    const parsed = parseSms("Your EcoCash balance is USD 412.75");
    expect(parsed.status).toBe("BALANCE_ONLY");
    expect(parsed.balanceAfter).toBe(41_275);
    expect(parsed.amount).toBeNull();
  });

  test("a cash-out without a reference is PARTIAL", () => {
    expect(parseSms("Cash out USD 20 from 0772123456").status).toBe("PARTIAL");
  });

  test("unrelated text is UNPARSED", () => {
    expect(parseSms("Hello, your bundle expires tomorrow").status).toBe("UNPARSED");
  });
});
