import { BALANCE_KEYS, outOfTolerance, subtractBalances, type Balances } from "@cm-agent/api/lib/balances";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { cn } from "heroui-native";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { CountingChip } from "@/components/booth/counting-chip";
import { CurrencyBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Banner, Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { MoneyInput } from "@/components/ui/money-input";
import { Screen } from "@/components/ui/screen";
import { Stepper } from "@/components/ui/stepper";
import { T } from "@/components/ui/text";
import { endShift } from "@/lib/actions";
import { useOpenShift, useShiftBalances, useShiftTransactions, useUnrecordedSms } from "@/lib/booth";
import { deviceStore } from "@/lib/device";
import { amount, clock, toDate } from "@/lib/format";
import { localDb, useLocalSettings, useRows } from "@/lib/local-db";
import { haptic } from "@/lib/motion";
import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";

const LABELS: Record<keyof Balances, string> = {
  cashUsd: "Cash balance",
  floatUsd: "EcoCash balance",
  cashZig: "Cash balance",
  floatZig: "EcoCash balance",
};
const currencyOf = (key: keyof Balances) => (key.endsWith("Usd") ? "USD" : "ZIG") as "USD" | "ZIG";

/** B12 End shift · Coline counts cash, then EcoCash, then checks. */
export default function EndShift() {
  const { countedById } = useLocalSearchParams<{ countedById?: string }>();
  const session = useObservable(sessionStore);
  const device = useObservable(deviceStore);
  const settings = useLocalSettings();
  const shift = useOpenShift();
  const expected = useShiftBalances(shift);
  const transactions = useShiftTransactions(shift?.id);
  const unrecorded = useUnrecordedSms();
  const balanceSms = useRows(
    "smsMessages",
    (sms) => sms.deviceId === device?.id && sms.balanceAfter !== null,
    (a, b) => toDate(b.receivedAt).getTime() - toDate(a.receivedAt).getTime(),
    [device?.id],
  );

  const latest = (currency: "USD" | "ZIG") =>
    balanceSms.find((sms) => (sms.currency ?? "USD") === currency && (!shift || toDate(sms.receivedAt) >= toDate(shift.openedAt)));
  const floatFromSms = { USD: latest("USD"), ZIG: latest("ZIG") };

  const [step, setStep] = useState(0);
  const [endAnyway, setEndAnyway] = useState(false);
  const [note, setNote] = useState("");
  const [counted, setCounted] = useState<Balances>(() => ({
    cashUsd: expected?.cashUsd ?? 0,
    cashZig: expected?.cashZig ?? 0,
    floatUsd: floatFromSms.USD?.balanceAfter ?? expected?.floatUsd ?? 0,
    floatZig: floatFromSms.ZIG?.balanceAfter ?? expected?.floatZig ?? 0,
  }));
  const [ended, setEnded] = useState<string | null>(null);

  const variance = useMemo(() => (expected ? subtractBalances(counted, expected) : null), [counted, expected]);
  const outside = variance && settings ? outOfTolerance(variance, settings) : [];
  const ownerId = countedById ?? (session?.user.role === "OWNER" ? session.user.id : undefined);

  if (ended) return <Redirect href={{ pathname: "/shift/summary/[id]", params: { id: ended } }} />;
  if (!session || !ownerId) return <Redirect href="/no-access" />;
  if (!shift || !expected || !variance) return <Redirect href="/home" />;

  const set = (key: keyof Balances) => (cents: number) => setCounted((current) => ({ ...current, [key]: cents }));
  const go = (next: number) => {
    setStep(next);
  };
  const customers = new Set(transactions.filter((tx) => !tx.voidedAt).map((tx) => tx.customerPhone)).size;
  const problems = transactions.filter(
    (tx) => !tx.voidedAt && (tx.matchState === "NO_SMS" || tx.matchState === "MISMATCH" || tx.flaggedAt),
  ).length;
  const blockedBySms = unrecorded.length > 0 && !endAnyway;

  function finish() {
    if (!shift || !ownerId) return;
    endShift({ shift, countedById: ownerId, counted, note: note.trim() || undefined, unrecordedSms: unrecorded.length });
    haptic.success();
    setEnded(shift.id);
  }

  const footer =
    step === 0 ? (
      <Button label="Next: EcoCash balance" icon="arrow-forward" disabled={blockedBySms} onPress={() => go(1)} />
    ) : step === 1 ? (
      <Button label="Next: check" icon="arrow-forward" onPress={() => go(2)} />
    ) : (
      <Button variant="success" label="End shift" icon="lock" disabled={outside.length > 0 && !note.trim()} onPress={finish} />
    );

  const opener = localDb.get().users[shift.openedById];

  return (
    <Screen
      header={{
        title: "End shift",
        subtitle: `${opener?.name ?? ""} · since ${clock(shift.openedAt)}`,
        leading: step === 0 ? "close" : "back",
        onLeading: step === 0 ? undefined : () => go(step - 1),
      }}
      footer={footer}
    >
      <Stepper steps={["Cash", "EcoCash", "Check"]} current={step} />
      <CountingChip />

      <View key={step} className="gap-3">
        {step === 0 ? (
          <>
            <T weight="heavy" className="text-[24px] tracking-tight">
              Count the cash
            </T>
            {unrecorded.length > 0 && !endAnyway ? (
              <Card index={0} className="bg-alarm-soft border-0">
                <View className="flex-row items-center gap-2">
                  <Icon name="mark-chat-unread" size={20} className="text-alarm-ink" />
                  <T weight="heavy" className="flex-1 text-alarm-ink">
                    {unrecorded.length} SMS not saved. Save them first?
                  </T>
                </View>
                <View className="flex-row gap-2">
                  <Button variant="success" label="Save now" icon="add" size="md" className="flex-1" onPress={() => router.push("/sms")} />
                  <Button variant="caution" label="End anyway" size="md" className="flex-1" onPress={() => setEndAnyway(true)} />
                </View>
              </Card>
            ) : null}
            <Card index={1} className="gap-0 py-1">
              <MoneyInput currency="USD" icon="payments" label="Cash balance" cents={counted.cashUsd} onChange={set("cashUsd")} />
              <MoneyInput currency="ZIG" icon="payments" label="Cash balance" cents={counted.cashZig} onChange={set("cashZig")} />
            </Card>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <T weight="heavy" className="text-[24px] tracking-tight">
              Check the EcoCash balance
            </T>
            <Card index={1} className="gap-0 py-1">
              <MoneyInput currency="USD" icon="account-balance-wallet" label="EcoCash balance" cents={counted.floatUsd} onChange={set("floatUsd")} />
              <MoneyInput currency="ZIG" icon="account-balance-wallet" label="EcoCash balance" cents={counted.floatZig} onChange={set("floatZig")} />
            </Card>
            {floatFromSms.USD || floatFromSms.ZIG ? (
              <Banner
                tone="lilac"
                icon="sms"
                text={`EcoCash balances come from the SMS at ${clock((floatFromSms.USD ?? floatFromSms.ZIG)!.receivedAt)}`}
              />
            ) : (
              <Banner tone="amber" icon="info" text="No balance SMS this shift. Check the balance on the agent line and type it in." />
            )}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Card index={0} className="gap-0 py-1">
              <View className="flex-row py-2 border-b border-line">
                <T weight="heavy" className="flex-1 text-[11px] text-subtle">
                  MONEY
                </T>
                <T weight="heavy" className="w-24 text-right text-[11px] text-subtle">
                  EXPECTED
                </T>
                <T weight="heavy" className="w-24 text-right text-[11px] text-subtle">
                  COUNTED
                </T>
              </View>
              {BALANCE_KEYS.map((key, index) => {
                const gap = variance[key];
                return (
                  <View key={key} className={cn("py-2.5 gap-1", index < 3 && "border-b border-line")}>
                    <View className="flex-row items-center">
                      <View className="flex-1 flex-row items-center gap-1.5">
                        <CurrencyBadge currency={currencyOf(key)} />
                        <T weight="bold" className="text-[13px]">
                          {LABELS[key].replace(" balance", "")}
                        </T>
                      </View>
                      <T weight="semibold" className="w-24 text-right text-[13px] text-subtle">
                        {amount(expected[key])}
                      </T>
                      <T weight="heavy" className="w-24 text-right text-[14px]">
                        {amount(counted[key])}
                      </T>
                    </View>
                    {gap !== 0 ? (
                      <T weight="heavy" className={cn("text-[12px] text-right", outside.includes(key) ? "text-alarm-ink" : "text-amber-ink")}>
                        {gap < 0 ? "Short" : "Over"} {amount(Math.abs(gap))}
                      </T>
                    ) : null}
                  </View>
                );
              })}
            </Card>

            {outside.length === 0 ? (
              <Banner tone="leaf" icon="check-circle" text="Balanced. Everything adds up." />
            ) : (
              <Field label="What happened?" icon="edit-note" placeholder="Explain the difference" value={note} onChangeText={setNote} />
            )}

            <Card index={2} title="This shift">
              <View className="flex-row gap-2">
                {[
                  ["Transactions", transactions.filter((tx) => !tx.voidedAt).length],
                  ["Customers", customers],
                  ["Problems", problems],
                ].map(([label, value]) => (
                  <View key={String(label)} className="flex-1 rounded-2xl bg-page p-2.5">
                    <T weight="bold" className="text-[11px] text-subtle">
                      {label}
                    </T>
                    <T weight="heavy" className="text-[20px]">
                      {value}
                    </T>
                  </View>
                ))}
              </View>
            </Card>
          </>
        ) : null}
      </View>
    </Screen>
  );
}
