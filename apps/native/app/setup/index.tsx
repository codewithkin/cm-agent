import Constants from "expo-constants";
import { router } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import { T } from "@/components/ui/text";
import { useLocalSettings } from "@/lib/local-db";

/** A soft shape drifting behind the logo. */
function Blob({ className, delay, style }: { className: string; delay: number; style: object }) {
  const drift = useSharedValue(0);
  useEffect(() => {
    drift.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: 2400 }), withTiming(0, { duration: 2400 })), -1),
    );
  }, [delay, drift]);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: drift.value * -10 }, { rotate: `${drift.value * 6}deg` }] }));
  return <Animated.View className={className} style={[style, animated]} />;
}

/** A1 Splash: logo lockup placeholder, then on to owner sign-in. */
export default function Splash() {
  const insets = useSafeAreaInsets();
  const settings = useLocalSettings();
  const businessName = settings?.businessName && settings.businessName !== "[Business name]" ? settings.businessName : "Coline Murahwa";

  useEffect(() => {
    const timer = setTimeout(() => router.replace("/setup/sign-in"), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="flex-1 bg-sun items-center justify-center" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <Blob className="absolute w-40 h-56 rounded-[80px] bg-[#F6A98C]" style={{ left: -50, top: "38%" }} delay={100} />
      <Blob className="absolute w-36 h-52 rounded-[80px] bg-lilac-strong" style={{ right: -50, top: "44%" }} delay={300} />

      <Animated.View
        className="w-28 h-28 rounded-[32px] bg-ink items-center justify-center"
      >
        <T weight="heavy" className="text-[40px] text-sun">
          CM
        </T>
      </Animated.View>
      <Animated.View className="items-center mt-5">
        <T weight="heavy" className="text-[26px] tracking-tight">
          {businessName}
        </T>
        <T weight="semibold" className="text-ink-soft mt-1">
          EcoCash agent
        </T>
      </Animated.View>

      <Animated.View
        className="absolute flex-row items-center gap-1"
        style={{ bottom: insets.bottom + 24 }}
      >
        <Icon name="smartphone" size={16} className="text-ink-soft" />
        <T weight="bold" className="text-[12px] text-ink-soft">
          v{Constants.expoConfig?.version ?? "1.0.0"}
        </T>
      </Animated.View>
    </View>
  );
}
