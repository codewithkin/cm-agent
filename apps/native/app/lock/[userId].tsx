import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { Avatar } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { PinPad } from "@/components/ui/pin-pad";
import { Screen } from "@/components/ui/screen";
import { Tap } from "@/components/ui/tap";
import { T } from "@/components/ui/text";
import { useOpenShift } from "@/lib/booth";
import { clock, initials } from "@/lib/format";
import { localDb } from "@/lib/local-db";
import { haptic } from "@/lib/motion";
import { unlockWithPin } from "@/lib/pin";

/** A5 PIN entry. Online the server checks it; offline the phone does. */
export default function PinEntry() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const user = localDb.get().users[userId];
  const openShift = useOpenShift();
  const owner = user?.role === "OWNER";

  async function submit(pin: string) {
    const result = await unlockWithPin(userId, pin);
    if (!result.ok) return result.message;
    haptic.success();
    router.replace("/");
    return true;
  }

  return (
    <Screen
      scroll={false}
      header={{
        title: "",
        leading: "back",
        right: openShift ? (
          <View className="flex-row items-center gap-1 h-[30px] px-2.5 rounded-full bg-leaf-soft">
            <Icon name="radio-button-checked" size={14} className="text-leaf" />
            <T weight="heavy" className="text-[11px] text-leaf">
              Shift open · {clock(openShift.openedAt)}
            </T>
          </View>
        ) : undefined,
      }}
    >
      <View className="flex-1 justify-between pb-4">
        <View className="items-center gap-2 mt-2">
          <Avatar label={initials(user?.name ?? "?")} owner={owner} size={64} />
          <T weight="heavy" className="text-[20px]">
            {user?.name ?? "Unknown person"}
          </T>
          <T weight="semibold" className="text-subtle">
            Enter your PIN
          </T>
        </View>

        <View>
          <PinPad onComplete={submit} />
        </View>

        <Tap
          onPress={() => router.push({ pathname: "/lock/forgot-pin", params: { userId } })}
          className="self-center flex-row items-center gap-1 h-10 px-3"
        >
          <Icon name="help" size={18} className="text-subtle" />
          <T weight="bold" className="text-[13px] text-subtle">
            Forgot PIN?
          </T>
        </Tap>
      </View>
    </Screen>
  );
}
