/** Dates arrive from the API as ISO strings (no superjson), and as Dates locally. */
export type DateLike = Date | string;

export function toDate(value: DateLike): Date {
  return value instanceof Date ? value : new Date(value);
}

/** 125000 → "1,250.00" (the currency is shown as a badge next to it). */
export function amount(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${whole}.${String(abs % 100).padStart(2, "0")}`;
}

/** 125000 → "1,250" for tight table cells. */
export function wholeAmount(cents: number): string {
  return amount(cents).slice(0, -3);
}

/** "12.50" or "12" typed on the keypad → 1250. */
export function centsFromInput(text: string): number {
  if (!text) return 0;
  const [whole = "0", fraction = ""] = text.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}

/** +263772123456 → "0772 ••• 456". */
export function maskPhone(phone: string): string {
  const local = phone.startsWith("+263") ? `0${phone.slice(4)}` : phone;
  return `${local.slice(0, 4)} ••• ${local.slice(-3)}`;
}

/** +263772123456 → "+263 772 123 456". */
export function prettyPhone(phone: string): string {
  if (!phone.startsWith("+263") || phone.length !== 13) return phone;
  return `+263 ${phone.slice(4, 7)} ${phone.slice(7, 10)} ${phone.slice(10)}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "10:42" in the phone's local time (Zimbabwe). */
export function clock(value: DateLike): string {
  const date = toDate(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "Thu 22 Oct". */
export function dayLabel(value: DateLike): string {
  const date = toDate(value);
  return `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** "3 Mar 2026". */
export function shortDate(value: DateLike): string {
  const date = toDate(value);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "October 2026" for a "2026-10" key. */
export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return `${LONG_MONTHS[(month ?? 1) - 1]} ${year}`;
}

/** "2026-10-22" for the phone's local day. */
export function localDateKey(value: DateLike = new Date()): string {
  const date = toDate(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "9 h 33 m". */
export function duration(from: DateLike, to: DateLike = new Date()): string {
  const minutes = Math.max(0, Math.round((toDate(to).getTime() - toDate(from).getTime()) / 60_000));
  return `${Math.floor(minutes / 60)} h ${minutes % 60} m`;
}

/** "06:30:12" for the shift timer. */
export function stopwatch(from: DateLike, to: DateLike = new Date()): string {
  const seconds = Math.max(0, Math.floor((toDate(to).getTime() - toDate(from).getTime()) / 1000));
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
}

/** "Good morning" / "Good afternoon" / "Good evening". */
export function greeting(date = new Date()): string {
  const hour = date.getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/** "Helper 1" → "H1", "Coline Murahwa" → "CM". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const [first = "", second = ""] = parts;
  if (/^\d+$/.test(second)) return `${first[0] ?? ""}${second}`.toUpperCase();
  return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase() || "?";
}
