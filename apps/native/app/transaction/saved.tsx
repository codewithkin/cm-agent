import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CurrencyBadge, StatusChip } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Tap } from "@/components/ui/tap";
import { T } from "@/components/ui/text";
import { TypeTile } from "@/components/ui/transaction-row";
import { statusOf, useOpenShift, useShiftTransactions, useSummary } from "@/lib/booth";
import { amount, clock, maskPhone } from "@/lib/format";
import { localDb } from "@/lib/local-db";
import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";

const NEXT_CUSTOMER_MS = 5000;

function Stat({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <View className="flex-1 bg-page rounded-2xl p-2.5 gap-1">
      <T weight="bold" className="text-[11px] text-subtle">
        {label}
      </T>
      {children ?? (
        <T weight="heavy" className="text-[14px]">
          {value}
        </T>
      )}
    </View>
  );
}

/** B6 Saved: a tick, then a 5-second bar drains to "Next customer". */
export default function Saved() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const session = useObservable(sessionStore);
  const tx = useObservable(localDb).transactions[id];
  const shift = useOpenShift();
  const mine = useShiftTransactions(shift?.id, session?.user.role === "OWNER" ? undefined : session?.user.id);
  const summary = useSummary(mine);

  const progress = useSharedValue(1);
  useEffect(() => {
    progress.value = withTiming(0, { duration: NEXT_CUSTOMER_MS, easing: Easing.linear });
    const timer = setTimeout(() => router.dismissTo("/home"), NEXT_CUSTOMER_MS);
    return () => clearTimeout(timer);
  }, [progress]);
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  if (!tx) return null;

  return (
    <View className="flex-1 bg-sun" style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 12 }}>
      <View className="flex-1 px-4 gap-4">
        <View className="items-center gap-3">
          <Animated.View className="w-24 h-24 rounded-full bg-ink items-center justify-center">
            <Icon name="check" size={52} className="text-sun" />
          </Animated.View>
          <Animated.View>
            <T weight="heavy" className="text-[32px] tracking-tight">
              Saved
            </T>
          </Animated.View>
        </View>

        <Animated.View className="bg-white rounded-3xl p-3.5 gap-3">
          <View className="flex-row items-center gap-3">
            <TypeTile type={tx.type} size={44} />
            <View className="flex-1 gap-1">
              <T weight="semibold" className="text-[12px] text-subtle">
                {tx.type === "CASH_OUT" ? "Cash-out" : "Cash-in"} · {tx.customerName}
              </T>
              <View className="flex-row items-center gap-1.5">
                <CurrencyBadge currency={tx.currency} size="md" />
                <T weight="heavy" className="text-[24px]">
                  {amount(tx.amount)}
                </T>
              </View>
            </View>
            <StatusChip status={statusOf(tx)} />
          </View>
          <View className="flex-row gap-2">
            <Stat label="Time" value={clock(tx.occurredAt)} />
            <Stat label="Served by" value={session?.user.name ?? ""} />
            <Stat label="Phone" value={`•••${maskPhone(tx.customerPhone).slice(-3)}`} />
          </View>
        </Animated.View>

        <Animated.View className="bg-white/70 rounded-3xl p-3.5 gap-2">
          <T weight="heavy">My shift today</T>
          <View className="flex-row gap-2">
            <Stat label="Cash out">
              <View className="flex-row items-center gap-1">
                <CurrencyBadge currency={tx.currency} />
                <T weight="heavy" className="text-[13px]">
                  {amount(summary[tx.currency].cashOutValue)}
                </T>
              </View>
            </Stat>
            <Stat label="Cash in">
              <View className="flex-row items-center gap-1">
                <CurrencyBadge currency={tx.currency} />
                <T weight="heavy" className="text-[13px]">
                  {amount(summary[tx.currency].cashInValue)}
                </T>
              </View>
            </Stat>
            <Stat label="Done" value={String(summary.transactionCount)} />
          </View>
        </Animated.View>
      </View>

      <View className="px-4 flex-row gap-2">
        <Button
          label="See details"
          variant="light"
          className="flex-1"
          onPress={() => router.replace({ pathname: "/transaction/[id]", params: { id: tx.id } })}
        />
        <Tap
          onPress={() => router.dismissTo("/home")}
          className="flex-[1.5] h-14 rounded-full bg-ink overflow-hidden items-center justify-center"
          accessibilityLabel="Next customer"
        >
          <Animated.View style={barStyle} className="absolute left-0 top-0 bottom-0 bg-white/15" />
          <View className="flex-row items-center gap-2">
            <Icon name="person-add" size={20} className="text-white" />
            <T weight="bold" className="text-white">
              Next customer
            </T>
          </View>
        </Tap>
      </View>
    </View>
  );
}
