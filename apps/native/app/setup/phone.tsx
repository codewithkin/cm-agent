import { TRPCClientError } from "@trpc/client";
import { router } from "expo-router";
import { cn } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";

import { SetupSteps } from "@/components/setup-steps";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { Tap } from "@/components/ui/tap";
import { T } from "@/components/ui/text";
import { saveDevice, type DeviceKind } from "@/lib/device";
import { haptic } from "@/lib/motion";
import { clearSetupDraft, setupDraft } from "@/lib/setup-draft";
import { syncNow } from "@/lib/sync";
import { trpcClient } from "@/utils/trpc";

type Choice = { label: string; hint: string; kind: DeviceKind; icon: IconName; number?: string };

const CHOICES: Choice[] = [
  { label: "Booth phone 1", hint: "At the counter", kind: "BOOTH", icon: "storefront", number: "1" },
  { label: "Booth phone 2", hint: "At the counter", kind: "BOOTH", icon: "storefront", number: "2" },
  { label: "Owner phone", hint: "Coline only", kind: "OWNER", icon: "person" },
];

/** A2 Device setup · choose phone. Registers this phone with the owner's sign-in. */
export default function ChoosePhone() {
  const [selected, setSelected] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function register() {
    const choice = CHOICES[selected];
    if (!choice) return;
    setSaving(true);
    setError(null);
    try {
      const { deviceToken, device } = await trpcClient.auth.registerDevice.mutate({
        phone: setupDraft.phone,
        password: setupDraft.password,
        label: choice.label,
        kind: choice.kind,
      });
      clearSetupDraft();
      await saveDevice({ token: deviceToken, id: device.id, label: device.label, kind: device.kind });
      haptic.success();
      void syncNow();
      router.replace(choice.kind === "BOOTH" ? "/setup/sms" : "/lock");
    } catch (caught) {
      haptic.error();
      const message =
        caught instanceof TRPCClientError && caught.data?.code === "UNAUTHORIZED"
          ? "Wrong phone number or password. Go back and try again."
          : "Couldn't reach the server. Check the internet and try again.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      header={{ title: "", leading: "back" }}
      footer={<Button label="Continue" icon="arrow-forward" loading={saving} onPress={register} />}
    >
      <SetupSteps current={1} />
      <View>
        <T weight="heavy" className="text-[26px] tracking-tight mt-4">
          What is this phone?
        </T>
      </View>

      {CHOICES.map((choice, index) => {
        const active = index === selected;
        return (
          <View key={choice.label}>
            <Tap
              onPress={() => {
                haptic.select();
                setSelected(index);
              }}
              scaleTo={0.98}
              accessibilityState={{ selected: active }}
              className={cn(
                "flex-row items-center gap-3 p-3.5 rounded-3xl bg-white border-2",
                active ? "border-ink" : "border-line",
              )}
            >
              <View className={cn("w-12 h-12 rounded-2xl items-center justify-center", choice.kind === "OWNER" ? "bg-leaf-soft" : "bg-sun-soft")}>
                <Icon name={choice.icon} size={24} className={choice.kind === "OWNER" ? "text-leaf" : "text-sun-ink"} />
                {choice.number ? (
                  <View className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-ink items-center justify-center">
                    <T weight="heavy" className="text-[10px] text-white">
                      {choice.number}
                    </T>
                  </View>
                ) : null}
              </View>
              <View className="flex-1">
                <T weight="heavy">{choice.label}</T>
                <T weight="semibold" className="text-[12px] text-subtle">
                  {choice.hint}
                </T>
              </View>
              <Icon
                name={active ? "check-circle" : "radio-button-unchecked"}
                size={24}
                className={active ? "text-ink" : "text-line-strong"}
              />
            </Tap>
          </View>
        );
      })}

      {error ? <Banner tone="danger" icon="error" text={error} /> : null}
    </Screen>
  );
}
