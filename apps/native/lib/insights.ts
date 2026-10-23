import type { RouterOutputs } from "@/utils/trpc";

import { amount, dayLabel, localDateKey } from "./format";

export type Insights = RouterOutputs["reports"]["insights"];

export type PeriodKey = "TODAY" | "WEEK" | "MONTH" | "LAST_MONTH";

export const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: "TODAY", label: "Today" },
  { value: "WEEK", label: "This week" },
  { value: "MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
];

/** The first and last day of a period, as "YYYY-MM-DD" keys. Weeks start on Monday. */
export function periodDates(period: PeriodKey, now = new Date()): { from: string; to: string } {
  const today = localDateKey(now);
  if (period === "TODAY") return { from: today, to: today };
  if (period === "WEEK") {
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    return { from: localDateKey(monday), to: today };
  }
  if (period === "MONTH") return { from: localDateKey(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  return {
    from: localDateKey(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    to: localDateKey(new Date(now.getFullYear(), now.getMonth(), 0)),
  };
}

/** A "YYYY-MM-DD" key as a local midday Date, so labels never slip a day. */
export function keyDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year!, month! - 1, day!, 12);
}

/** "Thu 22 Oct" or "Mon 19 Oct – Thu 22 Oct". */
export function rangeLabel(from: string, to: string): string {
  return from === to ? dayLabel(keyDate(from)) : `${dayLabel(keyDate(from))} – ${dayLabel(keyDate(to))}`;
}

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** 12 → "12:00–13:00". */
export function hourLabel(hour: number): string {
  const pad = (n: number) => String(n % 24).padStart(2, "0");
  return `${pad(hour)}:00–${pad(hour + 1)}:00`;
}

/** "+12%" / "−8%" / "same", or null when there was nothing before. */
export function changeLabel(change: number | null): string | null {
  if (change === null) return null;
  if (change === 0) return "same";
  return change > 0 ? `+${change}%` : `−${Math.abs(change)}%`;
}

/** "USD 5.00 and ZiG 20.00", skipping a currency that is 0. */
export function moneyPair(usd: number, zig: number): string {
  const parts = [usd ? `USD ${amount(usd)}` : null, zig ? `ZiG ${amount(zig)}` : null].filter(Boolean);
  return parts.length ? parts.join(" and ") : "nothing";
}

/** One-line answers, shared by the Reports screen and its PDF. */
export function answers(data: Insights) {
  const { missing, needs, customers } = data;
  const missingText =
    missing.closedShifts === 0
      ? "No shifts were closed in this period yet."
      : missing.shortShifts === 0
        ? `Nothing missing. All ${missing.closedShifts} closed shift${missing.closedShifts === 1 ? "" : "s"} balanced${missing.overShifts ? `, ${missing.overShifts} had extra money` : ""}.`
        : `${missing.shortShifts} of ${missing.closedShifts} shifts were short: ${moneyPair(missing.shortUsd, missing.shortZig)} missing.`;

  const needLines = (["USD", "ZIG"] as const).flatMap((currency) => {
    const label = currency === "USD" ? "USD" : "ZiG";
    const need = needs[currency];
    const lines: string[] = [];
    if (need.cash.cents > 0) {
      lines.push(
        `Start the day with at least ${label} ${amount(need.cash.cents)} cash${need.cash.date ? ` (needed on ${dayLabel(keyDate(need.cash.date))})` : ""}.`,
      );
    }
    if (need.float.cents > 0) {
      lines.push(
        `Keep at least ${label} ${amount(need.float.cents)} on EcoCash${need.float.date ? ` (needed on ${dayLabel(keyDate(need.float.date))})` : ""}.`,
      );
    }
    return lines;
  });

  const busyText =
    data.busiestHour === null
      ? "No transactions in this period."
      : `Busiest time: ${hourLabel(data.busiestHour)}${data.days >= 7 && data.busiestWeekday !== null ? `, and ${WEEKDAYS[data.busiestWeekday]}s are the busiest day` : ""}.`;

  const customerText =
    customers.unique === 0
      ? "No customers in this period."
      : `${customers.unique} customer${customers.unique === 1 ? "" : "s"}: ${customers.newCount} new, ${customers.returning} came back.`;

  return { missingText, needLines, busyText, customerText };
}
