import { cn } from "heroui-native";
import type { PropsWithChildren } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { haptic, PRESS_SPRING } from "@/lib/motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PropsWithChildren<
  Omit<PressableProps, "style"> & {
    className?: string;
    style?: StyleProp<ViewStyle>;
    /** How far it shrinks while pressed. */
    scaleTo?: number;
    /** Light haptic on press. On by default. */
    feedback?: boolean;
  }
>;

/** Every tappable thing: springs down while pressed and gives a light haptic. */
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
  ...props
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      className={cn(disabled && "opacity-40", className)}
      style={[animatedStyle, style]}
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
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
