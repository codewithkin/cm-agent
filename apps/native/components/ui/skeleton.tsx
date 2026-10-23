import { cn } from "heroui-native";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

/** A grey block that pulses while data loads (no full-screen spinners). */
export function Skeleton({ className }: { className?: string }) {
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={style} className={cn("bg-line rounded-xl", className)} />;
}

/** Skeleton rows standing in for a list ("Loading…" in the design's history). */
export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <View className="bg-white rounded-3xl border border-line p-3.5 gap-4">
      {Array.from({ length: count }, (_, index) => (
        <View key={index} className="flex-row items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-[13px]" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2.5 w-1/3" />
          </View>
          <Skeleton className="h-4 w-16" />
        </View>
      ))}
    </View>
  );
}
