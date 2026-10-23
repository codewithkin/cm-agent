import { BALANCE_KEYS, ZERO_BALANCES, type Balances } from "@cm-agent/api/lib/balances";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import Animated from "react-native-reanimated";

import { CountingChip } from "@/components/booth/counting-chip";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { startShift } from "@/lib/actions";
import { useOpenShift } from "@/lib/booth";
import { deviceStore } from "@/lib/device";
import { amount, clock, dayLabel, toDate } from "@/lib/format";
import { useRows } from "@/lib/local-db";
import { enterUp, exitFade, haptic } from "@/lib/motion";
import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";

const ROWS: { key: keyof Balances; currency: "USD" | "ZIG"; label: string }[] = [
  { key: "cashUsd", currency: "USD", label: "Cash balance" },
  { key: "floatUsd", currency: "USD", label: "EcoCash balance" },
  { key: "cashZig", currency: "ZIG", label: "Cash balance" },
  { key: "floatZig", currency: "ZIG", label: "EcoCash balance" },
];

/** B1 Start shift · Coline checks the money, pre-filled from the last closing count. */
export default function StartShift() {
  const { countedById } = useLocalSearchParams<{ countedById?: string }>();
  const session = useObservable(sessionStore);
  const device = useObservable(deviceStore);
  const open = useOpenShift();
  const closed = useRows(
    "shifts",
    (shift) => shift.deviceId === device?.id && shift.status === "CLOSED",
    (a, b) => toDate(b.closedAt ?? b.openedAt).getTime() - toDate(a.closedAt ?? a.openedAt).getTime(),
    [device?.id],
  );
  const last = closed[0];
  const lastCount = useMemo<Balances | null>(
    () =>
      last && last.countedCashUsd !== null
        ? {
            cashUsd: last.countedCashUsd,
            floatUsd: last.countedFloatUsd ?? 0,
            cashZig: last.countedCashZig ?? 0,
            floatZig: last.countedFloatZig ?? 0,
          }
        : null,
    [last],
  );

  const [counts, setCounts] = useState<Balances>(lastCount ?? ZERO_BALANCES);
  const [note, setNote] = useState("");
  const [started, setStarted] = useState(false);
  const changedKeys = lastCount ? BALANCE_KEYS.filter((key) => counts[key] !== lastCount[key]) : [];
  const ownerId = countedById ?? (session?.user.role === "OWNER" ? session.user.id : undefined);

  if (!session || !ownerId) return null;
  // Someone already opened a shift on this phone.
  if (open && !started) return <Redirect href="/home" />;

  function confirm() {
    if (!session || !ownerId) return;
    setStarted(true);
    startShift({ servingUserId: session.user.id, countedById: ownerId, opening: counts, note: note.trim() || undefined });
    haptic.success();
    router.dismissTo("/home");
  }

  return (
    <Screen
      header={{ title: "Start shift", subtitle: `${session.user.name} · ${device?.label ?? ""}`, leading: "close" }}
      footer={
        <Button
          label="Yes, this is correct"
          icon="check"
          disabled={changedKeys.length > 0 && note.trim().length === 0}
          onPress={confirm}
        />
      }
    >
      <CountingChip />
      <Card index={1} className="gap-0 py-1">
        {ROWS.map((row) => {
          const changed = changedKeys.includes(row.key);
          return (
            <Animated.View key={row.key}>
              <MoneyInput
                currency={row.currency}
                label={row.label}
                cents={counts[row.key]}
                changed={changed}
                onChange={(cents) => setCounts((current) => ({ ...current, [row.key]: cents }))}
              />
              {changed && lastCount ? (
                <Animated.View entering={enterUp(0)} exiting={exitFade} className="pb-2">
                  <T weight="bold" className="text-[12px] text-sun-ink">
                    {dayLabel(last?.closedAt ?? new Date())}: {amount(lastCount[row.key])}. Add a note.
                  </T>
                </Animated.View>
              ) : null}
            </Animated.View>
          );
        })}
      </Card>

      {changedKeys.length > 0 ? (
        <Animated.View entering={enterUp(2)} exiting={exitFade}>
          <Field
            label="Why is it different?"
            icon="edit-note"
            placeholder="e.g. Paid commission to Coline"
            value={note}
            onChangeText={setNote}
          />
        </Animated.View>
      ) : null}

      <T weight="semibold" className="text-[12px] text-subtle text-center">
        {last?.closedAt
          ? `Last count: ${dayLabel(last.closedAt)} ${clock(last.closedAt)} · tap a number to change it`
          : "First shift on this phone · enter today's money"}
      </T>
    </Screen>
  );
}
