import { View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";

import { amount, centsFromInput } from "@/lib/format";
import { DURATION, haptic } from "@/lib/motion";

import { CurrencyBadge, type Currency } from "./badges";
import { Keypad, type KeypadKey } from "./keypad";
import { Tap } from "./tap";
import { T } from "./text";

const QUICK_AMOUNTS = [10, 20, 50, 100];
const MAX_WHOLE_DIGITS = 7;

/** Applies one key to the typed text: at most 2 decimals, no leading zeros. */
export function applyAmountKey(text: string, key: KeypadKey): string {
  if (key === "back") return text.slice(0, -1);
  if (key === ".") return text.includes(".") ? text : `${text || "0"}.`;
  const [whole = "", fraction] = text.split(".");
  if (fraction !== undefined && fraction.length >= 2) return text;
  if (fraction === undefined && whole.length >= MAX_WHOLE_DIGITS) return text;
  if (text === "0") return key;
  return text + key;
}

/** The big amount: each new digit slides in. */
export function AmountDisplay({ text, currency }: { text: string; currency: Currency }) {
  const shown = text ? amount(centsFromInput(text)) : "0.00";
  return (
    <View className="flex-row items-center justify-center gap-2 h-16">
      <CurrencyBadge currency={currency} size="md" />
      <View className="flex-row overflow-hidden">
        {shown.split("").map((char, index) => (
          <Animated.View
            // Keyed by position + char so a changed digit animates in.
            key={`${index}-${char}`}
            entering={FadeInDown.duration(DURATION.fast)}
            exiting={FadeOutUp.duration(DURATION.fast)}
          >
            <T weight="heavy" className="text-[44px] leading-[52px]" style={{ fontVariant: ["tabular-nums"] }}>
              {char}
            </T>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

/** Quick-amount chips (10 20 50 100) plus the keypad. */
export function AmountKeys({
  text,
  onChange,
  disabled,
}: {
  text: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  return (
    <View className="gap-3">
      <View className="flex-row gap-2">
        {QUICK_AMOUNTS.map((value) => (
          <Tap
            key={value}
            disabled={disabled}
            scaleTo={0.9}
            onPress={() => {
              haptic.select();
              onChange(String(value));
            }}
            className="flex-1 h-10 rounded-full bg-white border border-line items-center justify-center"
          >
            <T weight="heavy" className="text-[14px]">
              {value}
            </T>
          </Tap>
        ))}
      </View>
      <Keypad decimal variant="flat" disabled={disabled} onKey={(key) => onChange(applyAmountKey(text, key))} />
    </View>
  );
}
