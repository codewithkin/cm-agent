import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Avatar } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { PinPad } from "@/components/ui/pin-pad";
import { Screen } from "@/components/ui/screen";
import { Stepper } from "@/components/ui/stepper";
import { T } from "@/components/ui/text";
import { initials } from "@/lib/format";
import { lockNow } from "@/lib/idle-lock";
import { haptic } from "@/lib/motion";
import { onlineStore } from "@/lib/network";
import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";
import { trpcClient } from "@/utils/trpc";

/** A6 Set PIN: a new PIN twice. Shown on first sign-in after Coline set a temporary PIN. */
export default function SetPin() {
  const session = useObservable(sessionStore);
  const online = useObservable(onlineStore);
  const [first, setFirst] = useState<string | null>(null);

  if (!session) return null;
  const step = first ? 1 : 0;

  async function confirm(pin: string) {
    if (!session || !first) return false;
    if (pin !== first) {
      setFirst(null);
      return "The PINs didn't match. Start again.";
    }
    if (!online) return "Connect to the internet to change your PIN.";
    try {
      await trpcClient.auth.changePin.mutate({ currentPin: session.pin, newPin: pin });
      sessionStore.set({ ...session, pin, user: { ...session.user, mustChangePin: false } });
      haptic.success();
      router.replace("/");
      return true;
    } catch (error) {
      return error instanceof Error ? error.message : "Couldn't change the PIN";
    }
  }

  return (
    <Screen scroll={false} header={{ title: "", leading: "close", onLeading: lockNow }}>
      <View className="flex-1 justify-between pb-4">
        <View className="gap-6">
          <Stepper steps={["New PIN", "Confirm"]} current={step} />
          <View className="items-center gap-2">
            <View className="w-12 h-12 rounded-full bg-leaf-soft items-center justify-center">
              <Icon name="key" size={24} className="text-leaf" />
            </View>
            <View key={step}>
              <T weight="heavy" className="text-[22px] text-center">
                {step === 0 ? "Choose your own PIN" : "Enter your new PIN again"}
              </T>
            </View>
            <View className="flex-row items-center gap-2">
              <Avatar label={initials(session.user.name)} size={24} />
              <T weight="semibold" className="text-subtle">
                {session.user.name}
              </T>
            </View>
          </View>
        </View>
        <PinPad
          key={step}
          onComplete={(pin) => {
            if (step === 0) {
              if (pin === session.pin) return "Choose a PIN different from the one Coline gave you.";
              setFirst(pin);
              return true;
            }
            return confirm(pin);
          }}
        />
      </View>
    </Screen>
  );
}
