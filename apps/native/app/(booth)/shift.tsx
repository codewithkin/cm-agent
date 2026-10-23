import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { NoShiftCard } from "@/components/booth/no-shift-card";
import { CountBubble, CurrencyBadge } from "@/components/ui/badges";
import { Avatar, Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { SyncChip } from "@/components/ui/sync-chip";
import { Tap } from "@/components/ui/tap";
import { T } from "@/components/ui/text";
import { TypeTile } from "@/components/ui/transaction-row";
import { useOpenShift, useShiftTransactions, useSummary, useUnrecordedSms } from "@/lib/booth";
import { deviceStore } from "@/lib/device";
import { amount, clock, initials, stopwatch } from "@/lib/format";
import { lockNow } from "@/lib/idle-lock";
import { localDb } from "@/lib/local-db";
import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";

function Stopwatch({ since }: { since: Date | string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((tick) => tick + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <T weight="monoBold" className="text-[34px] text-white" style={{ fontVariant: ["tabular-nums"] }}>
      {stopwatch(since)}
    </T>
  );
}

function Action({ icon, label, onPress, badge, dark }: { icon: IconName; label: string; onPress: () => void; badge?: number; dark?: boolean }) {
  return (
    <Tap onPress={onPress} className={dark ? "flex-1 rounded-2xl bg-ink p-3 items-center gap-1.5" : "flex-1 rounded-2xl bg-white border border-line p-3 items-center gap-1.5"}>
      <View>
        <Icon name={icon} size={22} className={dark ? "text-white" : "text-ink"} />
        {badge ? <CountBubble count={badge} /> : null}
      </View>
      <T weight="heavy" className={dark ? "text-[12px] text-white" : "text-[12px]"}>
        {label}
      </T>
    </Tap>
  );
}

/** B11 Shift tab: who is working, for how long, and what they handled. */
export default function ShiftTab() {
  const session = useObservable(sessionStore);
  const device = useObservable(deviceStore);
  const shift = useOpenShift();
  const isOwner = session?.user.role === "OWNER";
  const transactions = useShiftTransactions(shift?.id);
  const summary = useSummary(transactions);
  const unrecorded = useUnrecordedSms().length;
  const opener = shift ? localDb.get().users[shift.openedById] : undefined;

  const endShift = () =>
    isOwner ? router.push("/shift/end") : router.push({ pathname: "/owner-pin", params: { next: "end" } });

  return (
    <Screen withTabBar header={{ title: "Shift", subtitle: device?.label, leading: null, large: true, right: <SyncChip /> }}>
      {!shift ? (
        <NoShiftCard
          isOwner={isOwner}
          onStart={() =>
            isOwner ? router.push("/shift/start") : router.push({ pathname: "/owner-pin", params: { next: "start" } })
          }
        />
      ) : (
        <>
          <View className="bg-ink rounded-3xl p-4 gap-3">
            <View className="flex-row items-center gap-3">
              <Avatar label={initials(opener?.name ?? session?.user.name ?? "?")} size={40} />
              <View className="flex-1">
                <T weight="heavy" className="text-white">
                  {opener?.name ?? session?.user.name}
                </T>
                <T weight="semibold" className="text-[12px] text-white/60">
                  Started {clock(shift.openedAt)}
                </T>
              </View>
              <View className="flex-row items-center gap-1 h-7 px-2.5 rounded-full bg-leaf-bright">
                <View className="w-1.5 h-1.5 rounded-full bg-white" />
                <T weight="heavy" className="text-[11px] text-white">
                  Open
                </T>
              </View>
            </View>
            <View>
              <T weight="semibold" className="text-[12px] text-white/60">
                Working for
              </T>
              <Stopwatch since={shift.openedAt} />
            </View>
          </View>

          <View className="flex-row gap-2">
            <Action icon="swap-horiz" label="Change person" onPress={lockNow} />
            <Action icon="sms" label="SMS" badge={unrecorded} onPress={() => router.push("/sms")} />
            <Action icon="lock" label="End shift" dark onPress={endShift} />
          </View>

          {isOwner ? (
            <View>
              <Tap onPress={() => router.push("/move-money")} className="flex-row items-center gap-3 p-3.5 rounded-3xl bg-peach">
                <Icon name="swap-horiz" size={22} className="text-peach-ink" />
                <T weight="heavy" className="flex-1 text-peach-ink">
                  Move money
                </T>
                <Icon name="chevron-right" size={22} className="text-peach-ink" />
              </Tap>
            </View>
          ) : (
            <View className="flex-row items-center gap-2 px-1">
              <Icon name="verified-user" size={16} className="text-subtle" />
              <T weight="semibold" className="text-[12px] text-subtle">
                Only Coline can count the money
              </T>
            </View>
          )}

          <Card title="Money in and out">
            {(["USD", "ZIG"] as const).flatMap((currency) =>
              (["CASH_IN", "CASH_OUT"] as const).map((type) => {
                const totals = summary[currency];
                const value = type === "CASH_IN" ? totals.cashInValue : totals.cashOutValue;
                const count = type === "CASH_IN" ? totals.cashInCount : totals.cashOutCount;
                if (count === 0) return null;
                return (
                  <View key={`${currency}-${type}`} className="flex-row items-center gap-3">
                    <TypeTile type={type} size={34} />
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <CurrencyBadge currency={currency} />
                        <T weight="heavy" className="text-[13px]">
                          {type === "CASH_IN" ? "cash-in" : "cash-out"}
                        </T>
                      </View>
                      <T weight="semibold" className="text-[11px] text-subtle">
                        {count} {count === 1 ? "time" : "times"}
                      </T>
                    </View>
                    <T weight="heavy">{amount(value)}</T>
                  </View>
                );
              }),
            )}
            {summary.transactionCount === 0 ? (
              <T weight="semibold" className="text-subtle text-[13px]">
                Nothing yet this shift.
              </T>
            ) : null}
          </Card>
        </>
      )}
    </Screen>
  );
}
