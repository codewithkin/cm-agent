import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { SetupSteps } from "@/components/setup-steps";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { enterUp } from "@/lib/motion";
import { onlineStore } from "@/lib/network";
import { useObservable } from "@/lib/observable";
import { setupDraft } from "@/lib/setup-draft";

/** A2 Device setup · owner sign-in. Checked by the server on the next step. */
export default function OwnerSignIn() {
  const online = useObservable(onlineStore);
  const [phone, setPhone] = useState(setupDraft.phone);
  const [password, setPassword] = useState("");

  const digits = phone.replace(/\D/g, "");
  const canContinue = digits.length >= 9 && password.length >= 1 && online;

  return (
    <Screen
      footer={
        <Button
          label="Continue"
          icon="arrow-forward"
          disabled={!canContinue}
          onPress={() => {
            setupDraft.phone = phone;
            setupDraft.password = password;
            router.push("/setup/phone");
          }}
        />
      }
    >
      <SetupSteps current={0} />

      <Animated.View entering={enterUp(1)} className="gap-2 mt-4">
        <View className="w-12 h-12 rounded-2xl bg-sun-soft items-center justify-center">
          <Icon name="admin-panel-settings" size={26} className="text-sun-ink" />
        </View>
        <T weight="heavy" className="text-[26px] tracking-tight">
          Owner sign in
        </T>
        <T weight="semibold" className="text-subtle">
          Done once per phone.
        </T>
      </Animated.View>

      <Animated.View entering={enterUp(2)} className="gap-4 mt-2">
        <Field
          label="Phone number"
          icon="call"
          prefix="+263"
          placeholder="77 123 4567"
          keyboardType="phone-pad"
          autoComplete="tel"
          value={phone}
          onChangeText={setPhone}
        />
        <Field
          label="Password"
          icon="lock"
          placeholder="••••••••"
          secret
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          returnKeyType="go"
        />
      </Animated.View>

      <Animated.View entering={enterUp(3)}>
        <Banner
          tone={online ? "lilac" : "danger"}
          icon={online ? "wifi" : "wifi-off"}
          text={online ? "You need internet for this step only." : "No internet. Connect to finish setting up this phone."}
        />
      </Animated.View>
    </Screen>
  );
}
