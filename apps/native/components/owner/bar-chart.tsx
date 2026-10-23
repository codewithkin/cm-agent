import { cn } from "heroui-native";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from "react-native-reanimated";

import { T } from "@/components/ui/text";
import { SPRING } from "@/lib/motion";

function Bar({ ratio, index, highlight }: { ratio: number; index: number; highlight: boolean }) {
  const height = useSharedValue(0);
  useEffect(() => {
    height.value = withDelay(index * 18, withSpring(ratio, SPRING));
  }, [ratio, index, height]);
  const style = useAnimatedStyle(() => ({ height: `${Math.max(height.value * 100, 2)}%` }));
  return (
    <View className="flex-1 h-full justify-end">
      <Animated.View style={style} className={cn("rounded-t-[3px]", highlight ? "bg-ink" : "bg-line-strong")} />
    </View>
  );
}

/** Daily totals as bars that grow in from the bottom; today is black. */
export function BarChart({
  values,
  highlightIndex,
  startLabel,
  endLabel,
  height = 140,
}: {
  values: number[];
  highlightIndex?: number;
  startLabel: string;
  endLabel: string;
  height?: number;
}) {
  const max = Math.max(1, ...values);
  return (
    <View className="gap-2">
      <View className="flex-row items-end gap-[3px]" style={{ height }} accessibilityLabel={`Daily totals from ${startLabel} to ${endLabel}`}>
        {values.map((value, index) => (
          <Bar key={index} ratio={value / max} index={index} highlight={index === highlightIndex} />
        ))}
      </View>
      <View className="flex-row justify-between">
        <T weight="bold" className="text-[11px] text-subtle">
          {startLabel}
        </T>
        <T weight="bold" className="text-[11px] text-subtle">
          {endLabel}
        </T>
      </View>
    </View>
  );
}
