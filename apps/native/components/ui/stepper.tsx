import { cn } from "heroui-native";
import { Fragment, useEffect } from "react";
import { View } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

import { DURATION, SPRING } from "@/lib/motion";

import { Icon } from "./icon";
import { T } from "./text";

function Step({ index, label, state }: { index: number; label: string; state: "done" | "active" | "todo" }) {
  const progress = useSharedValue(state === "todo" ? 0 : 1);
  const scale = useSharedValue(state === "active" ? 1.12 : 1);

  useEffect(() => {
    progress.value = withTiming(state === "todo" ? 0 : 1, { duration: DURATION.base });
    scale.value = withSpring(state === "active" ? 1.12 : 1, SPRING);
  }, [state, progress, scale]);

  const dotStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ["#ECEAE4", state === "done" ? "#141416" : "#F5CF5E"]),
    transform: [{ scale: scale.value }],
  }));

  return (
    <View className="items-center gap-1 w-14">
      <Animated.View style={dotStyle} className="w-7 h-7 rounded-full items-center justify-center">
        {state === "done" ? (
          <Icon name="check" size={16} className="text-white" />
        ) : (
          <T weight="heavy" className="text-[12px]">
            {index + 1}
          </T>
        )}
      </Animated.View>
      <T weight="bold" className={cn("text-[11px]", state === "todo" ? "text-subtle" : "text-ink")}>
        {label}
      </T>
    </View>
  );
}

function Connector({ filled }: { filled: boolean }) {
  const fill = useSharedValue(filled ? 1 : 0);
  useEffect(() => {
    fill.value = withTiming(filled ? 1 : 0, { duration: DURATION.slow });
  }, [filled, fill]);
  const style = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <View className="flex-1 h-[3px] rounded-full bg-line mt-3.5 overflow-hidden">
      <Animated.View style={style} className="h-full bg-ink" />
    </View>
  );
}

/** "1 Amount · 2 Customer · 3 Sign": finished steps turn into ticks, the line fills as you go. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <View className="flex-row items-start">
      {steps.map((label, index) => (
        <Fragment key={label}>
          {index > 0 ? <Connector filled={index <= current} /> : null}
          <Step index={index} label={label} state={index < current ? "done" : index === current ? "active" : "todo"} />
        </Fragment>
      ))}
    </View>
  );
}
