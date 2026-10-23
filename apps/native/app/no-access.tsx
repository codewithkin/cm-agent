import { router } from "expo-router";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { enterUp, popIn } from "@/lib/motion";

/** X1 No access: a helper reached a Coline-only page. */
export default function NoAccess() {
  return (
    <Screen
      scroll={false}
      header={{ title: "Coline only", onLeading: () => router.replace("/home") }}
      footer={
        <>
          <Button label="See my transactions" icon="receipt-long" onPress={() => router.replace("/transactions")} />
          <Button label="Go back" variant="ghost" size="md" onPress={() => router.replace("/home")} />
        </>
      }
    >
      <Animated.View entering={enterUp(0)} className="flex-1 rounded-[28px] bg-lilac-strong p-6 gap-4 justify-end">
        <Animated.View entering={popIn} className="w-16 h-16 rounded-2xl bg-ink items-center justify-center">
          <Icon name="lock" size={30} className="text-sun" />
        </Animated.View>
        <T weight="heavy" className="text-[32px] leading-[36px] tracking-tight">
          Only Coline can{"\n"}open this
        </T>
        <View>
          <T weight="semibold" className="text-navy">
            Reports and money totals are for Coline. You can see your own transactions.
          </T>
        </View>
      </Animated.View>
    </Screen>
  );
}
