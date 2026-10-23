import { expectedBalances, lowBalances, type BalanceKey, type Balances } from "@cm-agent/api/lib/balances";
import { summarizeTransactions } from "@cm-agent/api/lib/summary";
import { useMemo } from "react";

import type { MatchStatus } from "@/components/ui/badges";

import { deviceStore } from "./device";
import { toDate } from "./format";
import { useLocalSettings, useRows, type LocalShift, type LocalSms, type LocalTransaction } from "./local-db";
import { useObservable } from "./observable";

/** SMS that should have a logbook entry (same rule as the server). */
export function isUnrecordedSms(sms: LocalSms, deviceId: string | undefined) {
  return (
    sms.deviceId === deviceId &&
    !sms.transactionId &&
    !sms.ignoredAt &&
    (sms.parseStatus === "PARSED" || sms.parseStatus === "PARTIAL")
  );
}

/** What the status chip shows for an entry. */
export function statusOf(tx: Pick<LocalTransaction, "voidedAt" | "matchState">): MatchStatus {
  if (tx.voidedAt) return "CANCELLED";
  return tx.matchState;
}

export const newestFirst = (a: { occurredAt: Date | string }, b: { occurredAt: Date | string }) =>
  toDate(b.occurredAt).getTime() - toDate(a.occurredAt).getTime();

export function openingOf(shift: LocalShift): Balances {
  return {
    cashUsd: shift.openingCashUsd,
    floatUsd: shift.openingFloatUsd,
    cashZig: shift.openingCashZig,
    floatZig: shift.openingFloatZig,
  };
}

/** The open shift on this phone, from the local copy. */
export function useOpenShift(): LocalShift | null {
  const device = useObservable(deviceStore);
  const shifts = useRows("shifts", (shift) => shift.deviceId === device?.id && shift.status === "OPEN", undefined, [
    device?.id,
  ]);
  return shifts[0] ?? null;
}

/** Entries in a shift, newest first; pass servedById to show only one person's. */
export function useShiftTransactions(shiftId: string | undefined, servedById?: string) {
  return useRows(
    "transactions",
    (tx) => tx.shiftId === shiftId && (!servedById || tx.servedById === servedById),
    newestFirst,
    [shiftId, servedById],
  );
}

export function useUnrecordedSms() {
  const device = useObservable(deviceStore);
  return useRows(
    "smsMessages",
    (sms) => isUnrecordedSms(sms, device?.id),
    (a, b) => toDate(b.receivedAt).getTime() - toDate(a.receivedAt).getTime(),
    [device?.id],
  );
}

/** Counts and values for a list of entries, skipping cancelled ones. */
export function useSummary(transactions: LocalTransaction[]) {
  return useMemo(() => summarizeTransactions(transactions.filter((tx) => !tx.voidedAt)), [transactions]);
}

/** Expected cash and EcoCash balances for a shift (shown to Coline only). */
export function useShiftBalances(shift: LocalShift | null): Balances | null {
  const transactions = useRows("transactions", (tx) => tx.shiftId === shift?.id, undefined, [shift?.id]);
  const movements = useRows("movements", (movement) => movement.shiftId === shift?.id, undefined, [shift?.id]);
  return useMemo(
    () => (shift ? expectedBalances(openingOf(shift), transactions, movements) : null),
    [shift, transactions, movements],
  );
}

/** Which balances are low. Helpers only see this if Coline turned the warning on. */
export function useLowWarnings(balances: Balances | null, isOwner: boolean): BalanceKey[] {
  const settings = useLocalSettings();
  return useMemo(() => {
    if (!balances || !settings) return [];
    if (!isOwner && !settings.lowWarningOnBooths) return [];
    return lowBalances(balances, settings);
  }, [balances, settings, isOwner]);
}

export const BALANCE_LABEL: Record<BalanceKey, string> = {
  cashUsd: "USD cash",
  floatUsd: "USD EcoCash",
  cashZig: "ZiG cash",
  floatZig: "ZiG EcoCash",
};
