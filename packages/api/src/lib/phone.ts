import { z } from "zod";

/**
 * Normalises a Zimbabwe mobile number to +2637XXXXXXXX.
 * Accepts 0772 123 456, 772123456, 263772123456 and +263 77 212 3456.
 * Returns null when the number is not a Zimbabwe mobile number.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let national: string | null = null;
  if (/^\+263\d{9}$/.test(digits)) national = digits.slice(4);
  else if (/^263\d{9}$/.test(digits)) national = digits.slice(3);
  else if (/^0\d{9}$/.test(digits)) national = digits.slice(1);
  else if (/^\d{9}$/.test(digits)) national = digits;
  if (!national?.startsWith("7")) return null;
  return `+263${national}`;
}

export const phoneSchema = z.string().transform((value, ctx) => {
  const phone = normalizePhone(value);
  if (!phone) {
    ctx.addIssue({ code: "custom", message: "Enter a Zimbabwe mobile number" });
    return z.NEVER;
  }
  return phone;
});
