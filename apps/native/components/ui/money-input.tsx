import { cn } from "heroui-native";
import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { amount, centsFromInput } from "@/lib/format";
import { FONT_FAMILY } from "@/lib/fonts";
import { DURATION } from "@/lib/motion";

import { CurrencyBadge, type Currency } from "./badges";
import { Icon, type IconName } from "./icon";
import { T } from "./text";

/** A money count row: badge, label and a number box that highlights while being edited. */
export function MoneyInput({
  currency,
  label,
  icon,
  cents,
  onChange,
  changed,
  autoFocus,
}: {
  currency: Currency;
  label: string;
  icon?: IconName;
  cents: number;
  onChange: (cents: number) => void;
  /** Highlights the row when it differs from what was expected. */
  changed?: boolean;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(amount(cents).replace(/,/g, ""));
  const focus = useSharedValue(0);

  useEffect(() => {
    if (centsFromInput(text) !== cents) setText(amount(cents).replace(/,/g, ""));
    // Only follow outside changes (e.g. filled from an SMS), not typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cents]);

  const boxStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], ["#ECEAE4", "#141416"]),
  }));

  return (
    <View className={cn("flex-row items-center gap-2.5 py-2.5", changed && "bg-sun-soft -mx-2 px-2 rounded-2xl")}>
      {icon ? <Icon name={icon} size={20} className="text-subtle" /> : null}
      <CurrencyBadge currency={currency} />
      <T weight="bold" className="flex-1 text-[14px]">
        {label}
      </T>
      <Animated.View style={boxStyle} className="w-[130px] h-12 rounded-xl bg-white border-2 px-3 justify-center">
        <TextInput
          value={text}
          autoFocus={autoFocus}
          keyboardType="decimal-pad"
          selectTextOnFocus
          className="text-[20px] text-ink text-right"
          style={{ fontFamily: FONT_FAMILY.heavy, fontVariant: ["tabular-nums"] }}
          onFocus={() => {
            focus.value = withTiming(1, { duration: DURATION.fast });
          }}
          onBlur={() => {
            focus.value = withTiming(0, { duration: DURATION.fast });
          }}
          onChangeText={(value) => {
            const cleaned = value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
            setText(cleaned);
            onChange(centsFromInput(cleaned));
          }}
        />
      </Animated.View>
    </View>
  );
}
