import { describe, expect, test } from "bun:test";

import { normalizePhone, phoneSchema } from "./phone";

describe("normalizePhone", () => {
  test("accepts the usual ways of writing a mobile number", () => {
    for (const input of ["0772123456", "0772 123 456", "772123456", "263772123456", "+263 77 212 3456"]) {
      expect(normalizePhone(input)).toBe("+263772123456");
    }
  });

  test("rejects landlines and foreign or short numbers", () => {
    expect(normalizePhone("0242123456")).toBeNull();
    expect(normalizePhone("+27821234567")).toBeNull();
    expect(normalizePhone("07721234")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
});

describe("phoneSchema", () => {
  test("outputs the normalised number", () => {
    expect(phoneSchema.parse("0772 123 456")).toBe("+263772123456");
  });

  test("fails with a readable message", () => {
    const result = phoneSchema.safeParse("12345");
    expect(result.success).toBe(false);
  });
});
