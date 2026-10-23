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
  const key = (value: KeypadKey | null) => {
    if (value === null) return <View key="empty" className="flex-1 h-16" />;
    return (
      <Tap
        key={value}
        disabled={disabled}
        feedback={false}
        scaleTo={0.88}
        accessibilityLabel={value === "back" ? "Delete" : value}
        onPress={() => {
          haptic.select();
          onKey(value);
        }}
        className={cn(
          "flex-1 items-center justify-center",
          variant === "round" ? "h-16 mx-3 rounded-full bg-white" : "h-14 rounded-2xl",
        )}
      >
        {value === "back" ? (
          <Icon name="backspace" size={24} className="text-ink-soft" />
        ) : (
          <T weight="bold" className="text-[24px]">
            {value}
          </T>
        )}
      </Tap>
    );
  };

  return (
    <View className="gap-2.5">
      {ROWS.map((row) => (
        <View key={row.join("")} className="flex-row">
          {row.map(key)}
        </View>
      ))}
      <View className="flex-row">
        {key(decimal ? "." : null)}
        {key("0")}
        {key("back")}
      </View>
    </View>
  );
}
