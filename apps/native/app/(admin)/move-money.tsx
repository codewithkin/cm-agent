import { MOVEMENT_EFFECT } from "@cm-agent/api/lib/balances";
import { Redirect, router } from "expo-router";
import { cn } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";

import { CurrencyBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Icon, type IconName } from "@/components/ui/icon";
import { MoneyInput } from "@/components/ui/money-input";
import { Screen } from "@/components/ui/screen";
import { Tap } from "@/components/ui/tap";
import { T } from "@/components/ui/text";
import { recordMovement } from "@/lib/actions";
import { useOpenShift, useShiftBalances } from "@/lib/booth";
import { amount } from "@/lib/format";
import type { LocalMovement } from "@/lib/local-db";
import { haptic } from "@/lib/motion";
import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";

type Choice = { label: string; hint: string; icon: IconName; kind: LocalMovement["kind"] };

const CHOICES: Choice[] = [
  { label: "Bought EcoCash", hint: "Cash to EcoCash", icon: "swap-horiz", kind: "FLOAT_BOUGHT" },
  { label: "Took cash to bank", hint: "Cash goes out", icon: "account-balance", kind: "CASH_DEPOSITED" },
  { label: "Coline added cash", hint: "Cash comes in", icon: "add-card", kind: "CASH_ADDED" },
  { label: "Coline took cash", hint: "Cash goes out", icon: "output", kind: "CASH_REMOVED" },
  { label: "Paid commission", hint: "From the cash", icon: "percent", kind: "CASH_REMOVED" },
];

function Change({ label, currency, before, after }: { label: string; currency: "USD" | "ZIG"; before: number; after: number }) {
  const up = after > before;
  const same = after === before;
  return (
    <View className={cn("flex-1 rounded-2xl p-3 gap-1", same ? "bg-white border border-line" : up ? "bg-leaf-soft" : "bg-peach")}>
      <View className="flex-row items-center gap-1">
        <CurrencyBadge currency={currency} />
        <T weight="bold" className="text-[12px]">
          {label}
        </T>
      </View>
      <T weight="semibold" className="text-[12px] text-subtle line-through">
        {amount(before)}
      </T>
      <View className="flex-row items-center gap-1">
        {!same ? <Icon name={up ? "arrow-upward" : "arrow-downward"} size={16} className={up ? "text-leaf" : "text-peach-ink"} /> : null}
        <T weight="heavy" className="text-[18px]">
          {amount(after)}
        </T>
      </View>
    </View>
  );
}

/** B10 Move money · Coline only: float bought, cash taken or added, commission paid. */
export default function MoveMoney() {
  const session = useObservable(sessionStore);
  const shift = useOpenShift();
  const balances = useShiftBalances(shift);
  const [choice, setChoice] = useState(0);
  const [currency, setCurrency] = useState<"USD" | "ZIG">("USD");
  const [cents, setCents] = useState(0);
  const [reason, setReason] = useState("");

  if (session?.user.role !== "OWNER") return <Redirect href="/no-access" />;
  const selected = CHOICES[choice] ?? CHOICES[0]!;

  if (!shift || !balances) {
    return (
      <Screen header={{ title: "Move money", subtitle: "Coline only", leading: "close" }}>
        <Card>
          <T weight="semibold" className="text-subtle">
            Open a shift on this phone first.
          </T>
        </Card>
      </Screen>
    );
  }

  const effect = MOVEMENT_EFFECT[selected.kind];
  const cashKey = currency === "USD" ? "cashUsd" : "cashZig";
  const floatKey = currency === "USD" ? "floatUsd" : "floatZig";

  function save() {
    if (!shift) return;
    recordMovement({ kind: selected.kind, currency, amount: cents, reason: reason.trim() || selected.label, shiftId: shift.id });
    haptic.success();
    router.back();
  }

  return (
    <Screen
      header={{ title: "Move money", subtitle: "Coline only", leading: "close" }}
      footer={<Button variant="success" label="Save" icon="check" disabled={cents <= 0} onPress={save} />}
    >
      <T weight="heavy" className="text-[13px] text-ink-soft">
        What happened?
      </T>
      <View className="flex-row flex-wrap gap-2">
        {CHOICES.map((option, index) => {
          const active = index === choice;
          return (
            <Tap
              key={option.label}
              scaleTo={0.94}
              feedback={false}
              onPress={() => {
                haptic.select();
                setChoice(index);
              }}
              className={cn("h-10 px-3 rounded-full flex-row items-center gap-1.5 border", active ? "bg-ink border-ink" : "bg-white border-line")}
            >
              <Icon name={option.icon} size={16} className={active ? "text-sun" : "text-ink-soft"} />
              <T weight="heavy" className={cn("text-[13px]", active ? "text-white" : "text-ink")}>
                {option.label}
              </T>
            </Tap>
          );
        })}
      </View>

      <Card className="gap-0 py-1">
        <MoneyInput currency={currency} label="Amount" cents={cents} onChange={setCents} onCurrencyChange={setCurrency} autoFocus />
      </Card>

      {cents > 0 ? (
        <View className="flex-row gap-2">
          <Change label="Cash" currency={currency} before={balances[cashKey]} after={balances[cashKey] + effect.cash * cents} />
          <Change label="EcoCash" currency={currency} before={balances[floatKey]} after={balances[floatKey] + effect.float * cents} />
        </View>
      ) : null}

      <Field icon="edit-note" placeholder="Note (optional)" value={reason} onChangeText={setReason} />
    </Screen>
  );
}
