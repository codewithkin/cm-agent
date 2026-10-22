import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** A random, URL-safe bearer token. Only its hash is stored. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Tokens are looked up by their hash, so a database leak does not expose them. */
export function hashToken(token: string): string {
  return sha256(token);
}

/** Compares two secrets without leaking where they differ through timing. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
