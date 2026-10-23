import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { CurrencyBadge, type Currency } from "@/components/ui/badges";
import { Icon } from "@/components/ui/icon";
import { T } from "@/components/ui/text";
import { amount, clock, type DateLike } from "@/lib/format";

function PulsingDot() {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(1.6, { duration: 600 }), withTiming(1, { duration: 600 })), -1);
  }, [scale]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: 2 - scale.value }));
  return (
    <View className="w-4 h-4 items-center justify-center">
      <Animated.View style={ring} className="absolute w-4 h-4 rounded-full bg-sun" />
      <View className="w-2.5 h-2.5 rounded-full bg-sun-ink" />
    </View>
  );
}

function Timer({ since }: { since: Date }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.floor((now - since.getTime()) / 1000));
  return (
    <T weight="mono" className="text-[13px] text-sun-ink">
      {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
    </T>
  );
}

/**
 * The cash-out gate: "Waiting for EcoCash SMS… 00:24" until the SMS arrives, then
 * a green "Give customer USD 50.00". No cash leaves the drawer before that.
 */
export function SmsWait({
  received,
  waitingSince,
  currency,
  cents,
}: {
  received: { receivedAt: DateLike } | null;
  waitingSince: Date;
  currency: Currency;
  cents: number;
}) {
  if (received) {
    return (
      <Animated.View className="rounded-3xl bg-leaf-bright p-3.5 gap-1">
        <View className="flex-row items-center gap-1.5">
          <Icon name="check-circle" size={18} className="text-white" />
          <T weight="bold" className="text-[12px] text-white">
            SMS received · {clock(received.receivedAt)}
          </T>
        </View>
        <View className="flex-row items-center gap-2">
          <T weight="heavy" className="text-[20px] text-white">
            Give customer
          </T>
          <CurrencyBadge currency={currency} size="md" />
          <T weight="heavy" className="text-[20px] text-white">
            {amount(cents)}
          </T>
        </View>
      </Animated.View>
    );
  }
  return (
    <Animated.View className="flex-row items-center gap-2.5 h-12 px-4 rounded-full bg-sun-soft border border-sun">
      <PulsingDot />
      <T weight="heavy" className="flex-1 text-[14px] text-sun-ink">
        Waiting for EcoCash SMS…
      </T>
      <Timer since={waitingSince} />
    </Animated.View>
  );
}
