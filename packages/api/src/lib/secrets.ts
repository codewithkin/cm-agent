import { randomBytes } from "node:crypto";

import { z } from "zod";

import { sha256 } from "./crypto";

export const pinSchema = z.string().regex(/^\d{4}$/, "PIN must be 4 digits");

export const passwordSchema = z.string().min(8, "Use at least 8 characters").max(128);

export function hashSecret(secret: string): Promise<string> {
  return Bun.password.hash(secret, { algorithm: "argon2id" });
}

export function verifySecret(secret: string, hash: string): Promise<boolean> {
  return Bun.password.verify(secret, hash);
}

/**
 * Lets a registered phone check a PIN while offline: the phone computes
 * sha256(`${pinSalt}:${pin}`) and compares it with pinVerifier.
 * The server itself always checks pinHash (argon2id).
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
