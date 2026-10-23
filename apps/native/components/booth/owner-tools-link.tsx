import { router } from "expo-router";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { Icon } from "@/components/ui/icon";
import { Tap } from "@/components/ui/tap";
import { T } from "@/components/ui/text";
import { enterUp } from "@/lib/motion";

/** "Owner tools · Reports, people, phones, settings" on a booth phone, for Coline. */
export function OwnerToolsLink({ index = 2 }: { index?: number }) {
  return (
    <Animated.View entering={enterUp(index)}>
      <Tap onPress={() => router.push("/today")} className="flex-row items-center gap-3 p-3.5 rounded-3xl bg-ink">
        <View className="w-10 h-10 rounded-full bg-sun items-center justify-center">
          <Icon name="admin-panel-settings" size={22} />
        </View>
        <View className="flex-1">
          <T weight="heavy" className="text-white">
            Owner tools
          </T>
          <T weight="semibold" className="text-[12px] text-white/60">
            Reports, people, phones, settings
          </T>
        </View>
        <Icon name="chevron-right" size={22} className="text-white" />
      </Tap>
    </Animated.View>
  );
}
