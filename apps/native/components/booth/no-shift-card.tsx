import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { T } from "@/components/ui/text";
import { enterUp } from "@/lib/motion";

/** A gently bobbing cash drawer, standing in for the design's illustration. */
function DrawerIllustration() {
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(withSequence(withTiming(-6, { duration: 1400 }), withTiming(0, { duration: 1400 })), -1);
  }, [bob]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));
  return (
    <View className="flex-1 min-h-[150px] rounded-[22px] bg-white/30 items-center justify-center">
      <Animated.View style={style} className="w-24 h-24 rounded-[28px] bg-white/70 items-center justify-center">
        <Icon name="point-of-sale" size={52} className="text-navy" />
      </Animated.View>
    </View>
  );
}

/** B2 Home · no shift open: only Coline can start one, because she counts the money. */
export function NoShiftCard({ isOwner, onStart }: { isOwner: boolean; onStart: () => void }) {
  return (
    <Animated.View entering={enterUp(1)} className="rounded-[28px] bg-lilac-strong p-5 gap-3 min-h-[420px]">
      <T weight="heavy" className="text-[32px] leading-[36px] tracking-tight">
        No shift{"\n"}open yet
      </T>
      <T weight="semibold" className="text-navy">
        {isOwner ? "Count the money to start." : "Coline counts the money to start."}
      </T>
      <DrawerIllustration />
      <Button
        label={isOwner ? "Count the money" : "Call Coline to start"}
        icon="play-arrow"
        variant="light"
        onPress={onStart}
      />
    </Animated.View>
  );
}
