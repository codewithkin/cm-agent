import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { Button } from "@/components/ui/button";
import { Banner, Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { T } from "@/components/ui/text";
import { enterUp, exitFade, haptic } from "@/lib/motion";
import { syncNow } from "@/lib/sync";
import { trpc, trpcClient } from "@/utils/trpc";

/**
 * Settings → Demo data: a sample week to show or try the app, and a way to
 * remove it before real use. Only demo records are removed.
 */
export function DemoDataCard({ index = 4 }: { index?: number }) {
  const queryClient = useQueryClient();
  const status = useQuery(trpc.demo.status.queryOptions());
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const active = status.data?.active ?? false;

  const refresh = async () => {
    await queryClient.invalidateQueries();
    await syncNow();
  };

  const apply = useMutation({
    mutationFn: () => trpcClient.demo.add.mutate(),
    onSuccess: async (result) => {
      haptic.success();
      setMessage(
        `Added ${result.transactions} demo transactions over ${result.days} days. Demo helpers: ${result.helpers
          .map((helper) => `${helper.name} PIN ${helper.pin}`)
          .join(", ")}.`,
      );
      await refresh();
    },
    onError: (error) => {
      haptic.error();
      setMessage(error.message);
    },
  });

  const clear = useMutation({
    mutationFn: () => trpcClient.demo.clear.mutate(),
    onSuccess: async (result) => {
      haptic.warning();
      setConfirming(false);
      setMessage(`Removed ${result.transactions} demo transactions. Real records were not touched.`);
      await refresh();
    },
    onError: (error) => {
      haptic.error();
      setMessage(error.message);
    },
  });

  return (
    <Card index={index}>
      <View className="flex-row items-center gap-2">
        <Icon name="science" size={20} className="text-subtle" />
        <View className="flex-1">
          <T weight="bold" className="text-[14px]">
            Demo data
          </T>
          <T weight="semibold" className="text-[12px] text-subtle">
            {status.isPending ? "Checking…" : active ? `On · ${status.data?.transactions ?? 0} demo transactions` : "Off"}
          </T>
        </View>
        <View className={active ? "px-2 h-6 rounded-full bg-sun-soft justify-center" : "px-2 h-6 rounded-full bg-page justify-center"}>
          <T weight="heavy" className={active ? "text-[10px] text-sun-ink" : "text-[10px] text-subtle"}>
            {active ? "DEMO" : "REAL ONLY"}
          </T>
        </View>
      </View>

      <T weight="semibold" className="text-[12px] text-subtle">
        A sample week on a "Demo booth" phone, with two demo helpers, for showing or trying the app. Clearing removes only demo records.
      </T>

      {message ? <Banner tone={active ? "lilac" : "leaf"} icon="info" text={message} /> : null}

      {confirming ? (
        <Animated.View entering={enterUp(0)} exiting={exitFade} className="gap-2 p-3 rounded-2xl bg-alarm-soft">
          <T weight="heavy" className="text-alarm-ink">
            Clear all demo data?
          </T>
          <T weight="semibold" className="text-[12px] text-alarm-ink">
            Demo shifts, transactions, SMS, customers, helpers and the Demo booth are removed from every phone.
          </T>
          <View className="flex-row gap-2">
            <Button label="Keep it" size="md" variant="light" className="flex-1" onPress={() => setConfirming(false)} />
            <Button label="Clear" icon="delete-sweep" size="md" className="flex-1 bg-alarm" loading={clear.isPending} onPress={() => clear.mutate()} />
          </View>
        </Animated.View>
      ) : active ? (
        <Button label="Clear demo data" icon="delete-sweep" variant="danger" size="md" onPress={() => setConfirming(true)} />
      ) : (
        <Button label="Add demo data" icon="science" variant="sun" size="md" loading={apply.isPending} disabled={status.isPending} onPress={() => apply.mutate()} />
      )}
    </Card>
  );
}
