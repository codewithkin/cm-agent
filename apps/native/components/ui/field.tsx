import { cn } from "heroui-native";
import { useState } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { FONT_FAMILY } from "@/lib/fonts";
import { DURATION } from "@/lib/motion";

import { Icon, type IconName } from "./icon";
import { Tap } from "./tap";
import { T } from "./text";

type Props = TextInputProps & {
  label?: string;
  icon?: IconName;
  /** Fixed text before the input, e.g. "+263". */
  prefix?: string;
  error?: string | null;
  /** Adds a Show/Hide toggle for passwords. */
  secret?: boolean;
};

/** Text field: the border darkens when focused; errors show underneath. */
export function Field({ label, icon, prefix, error, secret, className, onFocus, onBlur, ...props }: Props) {
  const focus = useSharedValue(0);
  const [hidden, setHidden] = useState(Boolean(secret));
  const borderStyle = useAnimatedStyle(() => ({
    borderColor: error ? "#C62828" : interpolateColor(focus.value, [0, 1], ["#ECEAE4", "#141416"]),
  }));

  return (
    <View className={cn("gap-1.5", className)}>
      {label ? (
        <T weight="bold" className="text-[13px] text-ink-soft">
          {label}
        </T>
      ) : null}
      <Animated.View style={borderStyle} className="flex-row items-center gap-2 h-14 px-4 rounded-2xl bg-white border-2">
        {icon ? <Icon name={icon} size={20} className="text-subtle" /> : null}
        {prefix ? (
          <T weight="bold" className="text-[16px] text-ink-soft">
            {prefix}
          </T>
        ) : null}
        <TextInput
          className="flex-1 text-[16px] text-ink"
          style={{ fontFamily: FONT_FAMILY.bold }}
          placeholderTextColor="#8A8780"
          secureTextEntry={hidden}
          onFocus={(event) => {
            focus.value = withTiming(1, { duration: DURATION.fast });
            onFocus?.(event);
          }}
          onBlur={(event) => {
            focus.value = withTiming(0, { duration: DURATION.fast });
            onBlur?.(event);
          }}
          {...props}
        />
        {secret ? (
          <Tap onPress={() => setHidden((value) => !value)} className="flex-row items-center gap-1 h-9 px-2.5 rounded-full bg-page">
            <Icon name={hidden ? "visibility" : "visibility-off"} size={16} className="text-ink-soft" />
            <T weight="bold" className="text-[12px] text-ink-soft">
              {hidden ? "Show" : "Hide"}
            </T>
          </Tap>
        ) : null}
      </Animated.View>
      {error ? (
        <Animated.View>
          <T weight="bold" className="text-[12px] text-alarm-ink">
            {error}
          </T>
        </Animated.View>
      ) : null}
    </View>
  );
}
