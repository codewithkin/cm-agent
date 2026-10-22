import type { Currency, SmsParseStatus, TransactionType } from "@cm-agent/db";

import { parseAmountToCents } from "./money";
import { normalizePhone } from "./phone";

/**
 * Reads EcoCash confirmation SMS.
 *
 * EcoCash does not publish its message wording, so this parser looks for
 * common patterns rather than one exact template. Tune the patterns below
 * once real sample messages from the booth phones are available.
 */

export type ParsedSms = {
  status: SmsParseStatus;
  type: TransactionType | null;
  currency: Currency | null;
  amount: number | null;
  counterpartyPhone: string | null;
  counterpartyName: string | null;
  reference: string | null;
  balanceAfter: number | null;
};

const CURRENCY = String.raw`(USD|US\$|ZiG|ZWG|\$)`;
const AMOUNT = String.raw`(\d[\d,]*(?:\.\d{1,2})?)`;

const MONEY_RE = new RegExp(`${CURRENCY}\\s?${AMOUNT}`, "i");
const BALANCE_RE = new RegExp(
  String.raw`(?:new\s+)?(?:wallet\s+)?bal(?:ance)?\.?\s*(?:is|:)?\s*${CURRENCY}?\s?${AMOUNT}`,
  "i",
);
const PHONE_RE = /(?:\+?263|0)\s?7\d(?:\s?\d){7}/;
const REFERENCE_RE =
  /\b(?:txn\s*id|trans(?:action)?\s*(?:id|ref)|approval\s*code|ref(?:erence)?(?:\s*no\.?)?)\s*[:.#]?\s*([A-Z0-9][A-Z0-9.-]{5,})/i;
const NAME_RE = /\b(?:from|to)\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,3})/;
const CASH_OUT_RE = /cash\s*-?\s*out|withdraw/i;
const CASH_IN_RE = /cash\s*-?\s*in\b|deposit/i;

function readCurrency(token: string): Currency {
  return /^(zig|zwg)$/i.test(token) ? "ZIG" : "USD";
}

function readType(body: string): TransactionType | null {
  if (CASH_OUT_RE.test(body)) return "CASH_OUT";
  if (CASH_IN_RE.test(body)) return "CASH_IN";
  return null;
}

export function parseSms(body: string): ParsedSms {
  const text = body.replace(/\s+/g, " ").trim();

  const balanceMatch = BALANCE_RE.exec(text);
  // Read the transaction amount from the text without the balance part,
  // so "New balance USD 120.00" is never taken as the amount.
  const withoutBalance = balanceMatch ? text.replace(balanceMatch[0], " ") : text;
  const moneyMatch = MONEY_RE.exec(withoutBalance);

  // A balance-only message still says which wallet it is about.
  const currencyToken = moneyMatch?.[1] ?? balanceMatch?.[1];
  const currency = currencyToken ? readCurrency(currencyToken) : null;
  const amount = moneyMatch?.[2] ? parseAmountToCents(moneyMatch[2]) : null;
  const balanceAfter = balanceMatch?.[2] ? parseAmountToCents(balanceMatch[2]) : null;

  const phoneMatch = PHONE_RE.exec(text);
  const counterpartyPhone = phoneMatch ? normalizePhone(phoneMatch[0]) : null;
  const reference = REFERENCE_RE.exec(text)?.[1]?.replace(/[.-]+$/, "") ?? null;
  const counterpartyName = NAME_RE.exec(text)?.[1]?.trim() ?? null;
  const type = readType(text);

  let status: SmsParseStatus;
  if (type && amount !== null && currency && reference) status = "PARSED";
  else if (type || (amount !== null && reference)) status = "PARTIAL";
  else if (balanceAfter !== null) status = "BALANCE_ONLY";
  else status = "UNPARSED";

  return { status, type, currency, amount, counterpartyPhone, counterpartyName, reference, balanceAfter };
}
