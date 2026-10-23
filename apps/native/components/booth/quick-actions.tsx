import { router } from "expo-router";
import { View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Tap } from "@/components/ui/tap";
import { T } from "@/components/ui/text";

/** The two big buttons: yellow Cash-in, black Cash-out. Open New transaction with the type chosen. */
export function QuickActions({ index = 2 }: { index?: number }) {
  return (
    <View className="flex-row gap-2">
      <Tap
        accessibilityLabel="New cash-in"
        onPress={() => router.push({ pathname: "/transaction/new", params: { type: "CASH_IN" } })}
        className="flex-1 h-[92px] rounded-3xl bg-sun px-3.5 py-3 justify-between"
      >
        <View className="flex-row items-center justify-between">
          <View className="w-9 h-9 rounded-full bg-ink items-center justify-center">
            <Icon name="south-west" size={20} className="text-sun" />
          </View>
          <Icon name="add" size={22} />
        </View>
        <T weight="heavy" className="text-[18px]">
          Cash-in
        </T>
      </Tap>
      <Tap
        accessibilityLabel="New cash-out"
        onPress={() => router.push({ pathname: "/transaction/new", params: { type: "CASH_OUT" } })}
        className="flex-1 h-[92px] rounded-3xl bg-ink px-3.5 py-3 justify-between"
      >
        <View className="flex-row items-center justify-between">
          <View className="w-9 h-9 rounded-full bg-sun items-center justify-center">
            <Icon name="north-east" size={20} />
          </View>
          <Icon name="remove" size={22} className="text-white" />
        </View>
        <T weight="heavy" className="text-[18px] text-white">
          Cash-out
        </T>
      </Tap>
    </View>
  );
}
