import { View } from "react-native";

import { Avatar } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { T } from "@/components/ui/text";

/** "CM Coline is counting ✓" at the top of start and end shift. */
export function CountingChip() {
  return (
    <View className="flex-row items-center gap-2 h-11 pl-1.5 pr-3 rounded-full bg-sun-soft self-stretch">
      <Avatar label="CM" owner size={32} />
      <T weight="heavy" className="flex-1 text-[13px] text-sun-ink">
        Coline is counting
      </T>
      <Icon name="verified-user" size={18} className="text-sun-ink" />
    </View>
  );
}
