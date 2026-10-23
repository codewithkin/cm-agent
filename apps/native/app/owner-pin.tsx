import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { Avatar } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { PinPad } from "@/components/ui/pin-pad";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { useOpenShift } from "@/lib/booth";
import { clock } from "@/lib/format";
import { haptic } from "@/lib/motion";
import { verifyOwnerPin } from "@/lib/pin";
import { sessionStore } from "@/lib/session";

/**
 * B12 "Coline counts the money": her PIN on a helper's phone, before she starts
 * or ends a shift. The helper stays signed in; only the count is hers.
 */
export default function OwnerPin() {
  const { next } = useLocalSearchParams<{ next: "start" | "end" }>();
  const shift = useOpenShift();
  const serving = sessionStore.get()?.user.name;

  async function submit(pin: string) {
    const approval = await verifyOwnerPin(pin);
    if (!approval) return "Wrong PIN";
    haptic.success();
    router.replace({
      pathname: next === "end" ? "/shift/end" : "/shift/start",
      params: { countedById: approval.ownerId },
    });
    return true;
  }

  return (
    <Screen
      scroll={false}
      header={{
        title: "",
        leading: "close",
        right:
          shift && serving ? (
            <View className="flex-row items-center gap-1 h-[30px] px-2.5 rounded-full bg-white border border-line">
              <Icon name="timer" size={14} className="text-ink-soft" />
              <T weight="bold" className="text-[11px]">
                {serving} · since {clock(shift.openedAt)}
              </T>
            </View>
          ) : undefined,
      }}
    >
      <View className="flex-1 justify-between pb-6">
        <View className="items-center gap-2 mt-4">
          <Avatar label="CM" owner size={72} />
          <T weight="heavy" className="text-[22px]">
            Coline counts the money
          </T>
          <View className="items-center">
            <T weight="semibold" className="text-subtle text-center">
              Only Coline can {next === "end" ? "end" : "start"} a shift.
            </T>
            <T weight="semibold" className="text-subtle text-center">
              Coline, enter your PIN.
            </T>
          </View>
        </View>
        <PinPad onComplete={submit} />
      </View>
    </Screen>
  );
}
