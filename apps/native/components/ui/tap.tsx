import { cn } from "heroui-native";
import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { haptic, PRESS_SPRING } from "@/lib/motion";

type Props = PropsWithChildren<
  Omit<PressableProps, "style" | "children"> & {
    className?: string;
    style?: StyleProp<ViewStyle>;
    /** How far it shrinks while pressed. */
    scaleTo?: number;
    /** Light haptic on press. On by default. */
    feedback?: boolean;
  }
>;

/**
 * Every tappable thing: springs down while pressed and gives a light haptic.
 *
 * The classes and the animation live on an Animated.View, with a transparent
 * Pressable laid over it. (An animated Pressable loses Uniwind's classes,
 * because Uniwind turns Pressable's style into a function.)
 */
export function Tap({
  children,
  className,
  style,
  scaleTo = 0.96,
  feedback = true,
  disabled,
  onPressIn,
  onPressOut,
  onPress,
  ...pressableProps
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View className={cn(disabled && "opacity-40", className)} style={[style, animatedStyle]}>
      {children}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: Boolean(disabled) }}
        {...pressableProps}
        disabled={disabled}
        style={StyleSheet.absoluteFill}
        onPressIn={(event) => {
          scale.value = withSpring(scaleTo, PRESS_SPRING);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          scale.value = withSpring(1, PRESS_SPRING);
          onPressOut?.(event);
        }}
        onPress={(event) => {
          if (feedback) haptic.tap();
          onPress?.(event);
        }}
      />
    </Animated.View>
  );
}
