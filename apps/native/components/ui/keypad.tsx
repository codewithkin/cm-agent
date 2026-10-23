import { cn } from "heroui-native";
import { View } from "react-native";

import { haptic } from "@/lib/motion";

import { Icon } from "./icon";
import { Tap } from "./tap";
import { T } from "./text";

export type KeypadKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "back";

const ROWS: KeypadKey[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];

type Props = {
  onKey: (key: KeypadKey) => void;
  /** Show "." in the bottom-left (amount entry); otherwise it's empty (PIN entry). */
  decimal?: boolean;
  disabled?: boolean;
  /** Round white keys (PIN) or flat wide keys (amount). */
  variant?: "round" | "flat";
};

/** The on-screen number pad. No system keyboard, so it's fast and predictable at the counter. */
export function Keypad({ onKey, decimal, disabled, variant = "round" }: Props) {
  const key = (value: KeypadKey | null, index: number) => {
    // Every key sits in an equal column; round keys are fixed circles centred in it.
    if (value === null) return <View key={`empty-${index}`} className="flex-1" />;
    const content =
      value === "back" ? (
        <Icon name="backspace" size={24} className="text-ink-soft" />
      ) : (
        <T weight="bold" className="text-[26px]">
          {value}
        </T>
      );
    return (
      <View key={value} className="flex-1 items-center">
        <Tap
          disabled={disabled}
          feedback={false}
          scaleTo={0.88}
          accessibilityLabel={value === "back" ? "Delete" : value}
          onPress={() => {
            haptic.select();
            onKey(value);
          }}
          className={cn(
            "items-center justify-center",
            variant === "round"
              ? value === "back"
                ? "w-[72px] h-[72px] rounded-full"
                : "w-[72px] h-[72px] rounded-full bg-white border border-line"
              : "self-stretch h-14 rounded-2xl",
          )}
        >
          {content}
        </Tap>
      </View>
    );
  };

  return (
    <View className={variant === "round" ? "gap-3" : "gap-2.5"}>
      {ROWS.map((row) => (
        <View key={row.join("")} className="flex-row">
          {row.map((value, index) => key(value, index))}
        </View>
      ))}
      <View className="flex-row">
        {key(decimal ? "." : null, 0)}
        {key("0", 1)}
        {key("back", 2)}
      </View>
    </View>
  );
}
