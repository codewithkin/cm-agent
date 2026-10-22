import { describe, expect, test } from "bun:test";

import { sha256 } from "./crypto";
import { hashSecret, pinFields, pinSchema, verifySecret } from "./secrets";

describe("secrets", () => {
  test("hashes and verifies a password", async () => {
    const hash = await hashSecret("correct horse");
    expect(await verifySecret("correct horse", hash)).toBe(true);
    expect(await verifySecret("wrong horse", hash)).toBe(false);
  });

  test("pin fields include an offline verifier the phone can recompute", async () => {
    const fields = await pinFields("4821");
    expect(fields.pinVerifier).toBe(sha256(`${fields.pinSalt}:4821`));
    expect(await verifySecret("4821", fields.pinHash)).toBe(true);
    expect(fields.pinFailedAttempts).toBe(0);
  });

  test("PINs are exactly 4 digits", () => {
    expect(pinSchema.safeParse("1234").success).toBe(true);
    expect(pinSchema.safeParse("123").success).toBe(false);
    expect(pinSchema.safeParse("12a4").success).toBe(false);
  });
});
