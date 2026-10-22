import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { z } from "zod";

import { sha256 } from "./crypto";

export const pinSchema = z.string().regex(/^\d{4}$/, "PIN must be 4 digits");

export const passwordSchema = z.string().min(8, "Use at least 8 characters").max(128);

type ScryptParams = { N: number; r: number; p: number; maxmem: number };

// node:crypto rather than Bun.password, so the native app can type-check this package.
const scrypt = promisify(scryptCallback) as (
  secret: string,
  salt: Buffer,
  keyLength: number,
  params: ScryptParams,
) => Promise<Buffer>;

const PARAMS: ScryptParams = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;

/** Stored as `scrypt$N$r$p$salt$key` (base64), so the cost can be raised later. */
export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(secret, salt, KEY_LENGTH, PARAMS);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifySecret(secret: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !salt || !key) return false;
  const expected = Buffer.from(key, "base64");
  const actual = await scrypt(secret, Buffer.from(salt, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: PARAMS.maxmem,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Lets a registered phone check a PIN while offline: the phone computes
 * sha256(`${pinSalt}:${pin}`) and compares it with pinVerifier.
 * The server itself always checks pinHash (scrypt).
 */
export function createPinVerifier(pin: string): { pinSalt: string; pinVerifier: string } {
  const pinSalt = randomBytes(16).toString("hex");
  return { pinSalt, pinVerifier: sha256(`${pinSalt}:${pin}`) };
}

/** Every User field that changes when a PIN is set. */
export async function pinFields(pin: string) {
  return {
    pinHash: await hashSecret(pin),
    ...createPinVerifier(pin),
    pinFailedAttempts: 0,
    pinLockedUntil: null,
  };
}
