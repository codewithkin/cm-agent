import { describe, expect, test } from "bun:test";

import { formatCents, parseAmountToCents } from "./money";

describe("parseAmountToCents", () => {
  test("reads whole and decimal amounts", () => {
    expect(parseAmountToCents("50")).toBe(5000);
    expect(parseAmountToCents("1,250.00")).toBe(125000);
    expect(parseAmountToCents("12.5")).toBe(1250);
    expect(parseAmountToCents(" 0.07 ")).toBe(7);
  });

  test("rejects anything else", () => {
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents("12.345")).toBeNull();
    expect(parseAmountToCents("-5")).toBeNull();
    expect(parseAmountToCents("USD 5")).toBeNull();
  });
});

describe("formatCents", () => {
  test("formats with currency label and thousands separators", () => {
    expect(formatCents(125000, "USD")).toBe("USD 1,250.00");
    expect(formatCents(34005, "ZIG")).toBe("ZiG 340.05");
    expect(formatCents(-500, "USD")).toBe("-USD 5.00");
  });
});
