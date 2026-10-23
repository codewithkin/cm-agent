import { useEffect } from "react";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { haptic, SPRING } from "@/lib/motion";

import { Tap } from "./tap";

/** On/off switch: the knob springs across and the track turns yellow. */
export function Switch({ value, onChange, label }: { value: boolean; onChange: (value: boolean) => void; label: string }) {
  const progress = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, SPRING);
  }, [value, progress]);

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ["#DCD9D1", "#F5CF5E"]),
  }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: progress.value * 22 }] }));

  return (
    <Tap
      feedback={false}
      scaleTo={0.92}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => {
        haptic.select();
        onChange(!value);
      }}
    >
      <Animated.View style={track} className="w-[52px] h-[30px] rounded-full p-[3px]">
        <Animated.View style={knob} className="w-6 h-6 rounded-full bg-ink" />
      </Animated.View>
    </Tap>
  );
}
