import { cn } from "heroui-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { haptic, SPRING } from "@/lib/motion";

import { Icon, type IconName } from "./icon";
import { Tap } from "./tap";
import { T } from "./text";

export type SegmentOption<V extends string> = {
  value: V;
  label: string;
  icon?: IconName;
  /** Colour of the sliding pill when this option is chosen. */
  activeClass?: string;
  activeText?: string;
};

/** Two or more choices with a pill that slides to the chosen one. */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentOption<V>[];
  value: V;
  onChange: (value: V) => void;
  className?: string;
}) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const segment = width / options.length;
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withSpring(index * segment, SPRING);
  }, [index, segment, x]);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: segment }));
  const active = options[index];

  return (
    <View
      className={cn("flex-row h-12 rounded-full bg-white border border-line p-1", className)}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width - 10)}
    >
      {width > 0 ? (
        <Animated.View
          style={pillStyle}
          className={cn("absolute top-1 bottom-1 left-1 rounded-full", active?.activeClass ?? "bg-ink")}
        />
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;
        const ink = selected ? (option.activeText ?? "text-white") : "text-ink-soft";
        return (
          <Tap
            key={option.value}
            feedback={false}
            scaleTo={0.95}
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              haptic.select();
              onChange(option.value);
            }}
            className="flex-1 flex-row items-center justify-center gap-1.5"
          >
            {option.icon ? <Icon name={option.icon} size={18} className={ink} /> : null}
            <T weight="heavy" className={cn("text-[14px]", ink)}>
              {option.label}
            </T>
          </Tap>
        );
      })}
    </View>
  );
}
