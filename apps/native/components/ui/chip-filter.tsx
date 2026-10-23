import { cn } from "heroui-native";
import { ScrollView } from "react-native";

import { haptic } from "@/lib/motion";

import { Tap } from "./tap";
import { T } from "./text";

export type FilterOption<V extends string> = { value: V; label: string; count?: number };

/** A row of filter chips ("All 3 · No SMS 1 · Reported 1"); the chosen one turns black. */
export function ChipFilter<V extends string>({
  options,
  value,
  onChange,
}: {
  options: FilterOption<V>[];
  value: V;
  onChange: (value: V) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Tap
            key={option.value}
            feedback={false}
            scaleTo={0.92}
            onPress={() => {
              haptic.select();
              onChange(option.value);
            }}
            className={cn(
              "h-9 px-3.5 rounded-full flex-row items-center gap-1.5 border",
              active ? "bg-ink border-ink" : "bg-white border-line",
            )}
          >
            <T weight="heavy" className={cn("text-[13px]", active ? "text-white" : "text-ink")}>
              {option.label}
            </T>
            {option.count !== undefined ? (
              <T weight="heavy" className={cn("text-[12px]", active ? "text-sun" : "text-subtle")}>
                {option.count}
              </T>
            ) : null}
          </Tap>
        );
      })}
    </ScrollView>
  );
}
