import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { localDb } from "@/lib/local-db";
import { haptic } from "@/lib/motion";
import { onlineStore } from "@/lib/network";
import { useObservable } from "@/lib/observable";
import { syncNow } from "@/lib/sync";
import { trpcClient } from "@/utils/trpc";

/** Helpers ask Coline for a new PIN; Coline resets hers with her phone number and password. */
export default function ForgotPin() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const user = localDb.get().users[userId];
  const online = useObservable(onlineStore);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user?.role !== "OWNER") {
    return (
      <Screen scroll={false} header={{ title: "Forgot PIN", leading: "back" }}>
        <View className="flex-1 items-center justify-center gap-4 px-4">
          <View className="w-20 h-20 rounded-full bg-lilac items-center justify-center">
            <Icon name="support-agent" size={36} className="text-lilac-ink" />
          </View>
          <T weight="heavy" className="text-[22px] text-center">
            Ask Coline for a new PIN
          </T>
          <T weight="semibold" className="text-subtle text-center">
            She can give you a new one from People on her phone. You'll choose your own PIN when you next sign in.
          </T>
          <Button label="Go back" variant="outline" className="self-stretch mt-4" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  async function reset() {
    setSaving(true);
    setError(null);
    try {
      await trpcClient.auth.resetOwnerPin.mutate({ phone, password, newPin: pin });
      haptic.success();
      await syncNow();
      router.back();
    } catch (caught) {
      haptic.error();
      setError(caught instanceof Error ? caught.message : "Couldn't reset the PIN");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      header={{ title: "Reset your PIN", subtitle: "Coline only", leading: "back" }}
      footer={
        <Button
          variant="success"
          label="Save new PIN"
          icon="check"
          loading={saving}
          disabled={!online || phone.length < 9 || !password || !/^\d{4}$/.test(pin)}
          onPress={reset}
        />
      }
    >
      <View className="gap-4">
        <Field label="Phone number" icon="call" prefix="+263" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        <Field label="Password" icon="lock" secret value={password} onChangeText={setPassword} />
        <Field
          label="New PIN"
          icon="key"
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          value={pin}
          onChangeText={(text) => setPin(text.replace(/\D/g, ""))}
        />
      </View>
      {!online ? <Banner tone="danger" icon="wifi-off" text="You need internet to reset your PIN." /> : null}
      {error ? <Banner tone="danger" icon="error" text={error} /> : null}
    </Screen>
  );
}
