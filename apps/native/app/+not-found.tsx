import { router } from "expo-router";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";

export default function NotFoundScreen() {
  return (
    <Screen scroll={false} footer={<Button label="Go home" icon="home" onPress={() => router.replace("/")} />}>
      <View className="flex-1 items-center justify-center gap-3">
        <View className="w-20 h-20 rounded-full bg-lilac items-center justify-center">
          <Icon name="explore-off" size={36} className="text-lilac-ink" />
        </View>
        <T weight="heavy" className="text-[22px]">
          Page not found
        </T>
        <T weight="semibold" className="text-subtle text-center">
          This page doesn't exist. Let's go back home.
        </T>
      </View>
    </Screen>
  );
}
