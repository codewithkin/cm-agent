import { useState } from "react";
import { View } from "react-native";

import { Icon, type IconName } from "./icon";
import { Sheet } from "./sheet";
import { Tap } from "./tap";
import { T } from "./text";

const SHADOW = {
  shadowColor: "#C89614",
  shadowOpacity: 0.55,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
} as const;

/** The yellow floating button for adding something: "+ Add person". Goes in `Screen`'s `fab` slot. */
export function Fab({ label, icon = "add", onPress }: { label: string; icon?: IconName; onPress: () => void }) {
  return (
    <Tap
      accessibilityLabel={label}
      scaleTo={0.92}
      onPress={onPress}
      className="h-14 pl-4 pr-5 rounded-full bg-sun flex-row items-center gap-2"
      style={SHADOW}
    >
      <Icon name={icon} size={24} />
      <T weight="heavy" className="text-[15px]">
        {label}
      </T>
    </Tap>
  );
}

export type FabAction = { icon: IconName; label: string; hint: string; onPress: () => void };

/** One "+ Add" button that opens a short list of things to add. */
export function FabMenu({ label = "Add", title = "What do you want to add?", actions }: { label?: string; title?: string; actions: FabAction[] }) {
  const [open, setOpen] = useState(false);
  if (actions.length === 0) return null;
  return (
    <>
      <Fab label={label} onPress={() => setOpen(true)} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={title}>
        <View className="bg-white rounded-3xl border border-line px-3.5">
          {actions.map((action, index) => (
            <Tap
              key={action.label}
              scaleTo={0.98}
              onPress={() => {
                setOpen(false);
                action.onPress();
              }}
              className={index > 0 ? "flex-row items-center gap-3 py-3.5 border-t border-line" : "flex-row items-center gap-3 py-3.5"}
            >
              <View className="w-11 h-11 rounded-2xl bg-sun-soft items-center justify-center">
                <Icon name={action.icon} size={22} className="text-sun-ink" />
              </View>
              <View className="flex-1">
                <T weight="heavy">{action.label}</T>
                <T weight="semibold" className="text-[12px] text-subtle">
                  {action.hint}
                </T>
              </View>
              <Icon name="chevron-right" size={22} className="text-subtle" />
            </Tap>
          ))}
        </View>
      </Sheet>
    </>
  );
}
