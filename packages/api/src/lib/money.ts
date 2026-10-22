import type { Currency } from "@cm-agent/db";
import { z } from "zod";

/** Largest single amount accepted anywhere: 1,000,000.00. */
export const MAX_AMOUNT_CENTS = 100_000_000;

export const centsSchema = z.number().int().min(0).max(MAX_AMOUNT_CENTS);

export const positiveCentsSchema = z.number().int().min(1).max(MAX_AMOUNT_CENTS);

const CURRENCY_LABEL: Record<Currency, string> = { USD: "USD", ZIG: "ZiG" };

/** 125000, "USD" → "USD 1,250.00". */
export function formatCents(cents: number, currency: Currency): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toLocaleString("en-US");
  const fraction = String(abs % 100).padStart(2, "0");
  return `${sign}${CURRENCY_LABEL[currency]} ${whole}.${fraction}`;
}

/** "1,250.5" → 125050. Returns null for anything that is not a plain amount. */
export function parseAmountToCents(text: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text.replace(/,/g, "").trim());
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  const cents = whole * 100 + fraction;
  return Number.isSafeInteger(cents) ? cents : null;
}
