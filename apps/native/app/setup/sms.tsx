import { router } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { SetupSteps } from "@/components/setup-steps";
import { CurrencyBadge, StatusChip } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Banner, Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { TypeTile } from "@/components/ui/transaction-row";
import { deviceStore } from "@/lib/device";
import { haptic } from "@/lib/motion";
import { useObservable } from "@/lib/observable";
import { ensureNotificationPermission } from "@/lib/notifications";

const POINTS: { icon: IconName; text: string }[] = [
  { icon: "bolt", text: "Fills in the details for you" },
  { icon: "verified", text: "Checks each entry with the SMS" },
  { icon: "shield", text: "Android asks you before each SMS is read" },
];

/** The arrow between the SMS and the entry bobs to show one becomes the other. */
function FlowArrow() {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(500, withRepeat(withSequence(withTiming(4, { duration: 500 }), withTiming(0, { duration: 500 })), -1));
  }, [y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={style} className="self-center w-8 h-8 rounded-full bg-sun items-center justify-center">
      <Icon name="arrow-downward" size={18} />
    </Animated.View>
  );
}

/**
 * A3 Confirmation + how SMS reading works (booth phones only). There's no SMS
 * permission to grant: Android asks "Allow?" for each EcoCash SMS. This step
 * asks for notifications, used when an SMS arrives while the app is closed.
 */
export default function SmsPermission() {
  const device = useObservable(deviceStore);

  async function allow() {
    await ensureNotificationPermission();
    haptic.success();
    router.replace("/lock");
  }

  return (
    <Screen
      footer={
        <>
          <Button variant="success" label="Got it" icon="check" onPress={allow} />
          <Button label="Skip" variant="ghost" size="md" onPress={() => router.replace("/lock")} />
        </>
      }
    >
      <SetupSteps current={2} />
      <Banner tone="leaf" icon="check-circle" text={`This phone is ${device?.label ?? "registered"}`} />

      <Card index={1} className="bg-page border-0 p-3 gap-2">
        <View className="bg-white rounded-2xl p-3 flex-row gap-3">
          <View className="w-9 h-9 rounded-xl bg-lilac items-center justify-center">
            <Icon name="sms" size={18} className="text-lilac-ink" />
          </View>
          <View className="flex-1">
            <T weight="heavy" className="text-[13px]">
              EcoCash · 10:42
            </T>
            <T weight="mono" className="text-[11px] text-ink-soft">
              Cash-out USD 50.00 from 0772••• 123. Ref [reference]
            </T>
          </View>
        </View>
        <FlowArrow />
        <View className="bg-white rounded-2xl p-3 flex-row items-center gap-3">
          <TypeTile type="CASH_OUT" size={36} />
          <View className="flex-1 gap-0.5">
            <View className="flex-row items-center gap-1.5">
              <T weight="heavy" className="text-[13px]">
                Cash-out ·
              </T>
              <CurrencyBadge currency="USD" />
              <T weight="heavy" className="text-[13px]">
                50.00
              </T>
            </View>
            <T weight="semibold" className="text-[11px] text-subtle">
              Filled in for you
            </T>
          </View>
          <StatusChip status="MATCHED" />
        </View>
      </Card>

      <Animated.View>
        <T weight="heavy" className="text-[24px] tracking-tight">
          Let the app read EcoCash SMS
        </T>
      </Animated.View>
      {POINTS.map((point, index) => (
        <Animated.View key={point.text} className="flex-row items-center gap-3">
          <View className="w-9 h-9 rounded-full bg-leaf-soft items-center justify-center">
            <Icon name={point.icon} size={18} className="text-leaf" />
          </View>
          <T weight="bold" className="text-[14px]">
            {point.text}
          </T>
        </Animated.View>
      ))}
    </Screen>
  );
}
