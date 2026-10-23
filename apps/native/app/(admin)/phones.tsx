import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";

import { LiveState } from "@/components/owner/live-state";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { deviceStore } from "@/lib/device";
import { clock } from "@/lib/format";
import { haptic } from "@/lib/motion";
import { useObservable } from "@/lib/observable";
import { outboxStore } from "@/lib/outbox";
import { syncNow, syncStore } from "@/lib/sync";
import { trpc, trpcClient, type RouterOutputs } from "@/utils/trpc";

type Phone = RouterOutputs["devices"]["list"][number];

const STALE_MS = 10 * 60_000;

function PhoneCard({ phone, index, isThis }: { phone: Phone; index: number; isThis: boolean }) {
  const queryClient = useQueryClient();
  const waiting = useObservable(outboxStore).length;
  const { syncing } = useObservable(syncStore);
  const [confirming, setConfirming] = useState(false);
  const synced = phone.lastSyncedAt ? new Date(phone.lastSyncedAt) : null;
  const upToDate = isThis ? waiting === 0 : Boolean(synced && Date.now() - synced.getTime() < STALE_MS && phone.pendingSyncCount === 0);
  const serving = phone.shifts[0]?.openedBy.name;
  const number = phone.label.match(/\d+$/)?.[0];

  const revoke = useMutation({
    mutationFn: () => trpcClient.devices.revoke.mutate({ deviceId: phone.id }),
    onSuccess: () => {
      haptic.warning();
      void queryClient.invalidateQueries();
    },
  });

  const status = isThis
    ? syncing
      ? { label: "Sending", icon: "cloud-sync" as const, box: "bg-lilac", ink: "text-lilac-ink" }
      : { label: "This phone", icon: "smartphone" as const, box: "bg-page", ink: "text-ink-soft" }
    : upToDate
      ? { label: "Up to date", icon: "check-circle" as const, box: "bg-leaf-soft", ink: "text-leaf" }
      : { label: "No internet", icon: "cloud-off" as const, box: "bg-amber-soft", ink: "text-amber-ink" };

  return (
    <View
      className={cn("bg-white rounded-3xl p-3.5 gap-3 border-2", !upToDate && !isThis ? "border-sun" : "border-line")}
    >
      <View className="flex-row items-center gap-3">
        <View className={cn("w-11 h-11 rounded-xl items-center justify-center", phone.kind === "OWNER" ? "bg-leaf-soft" : "bg-sun-soft")}>
          <Icon name="smartphone" size={22} className={phone.kind === "OWNER" ? "text-leaf" : "text-sun-ink"} />
          {number ? (
            <View className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-ink items-center justify-center">
              <T weight="heavy" className="text-[10px] text-white">
                {number}
              </T>
            </View>
          ) : null}
        </View>
        <View className="flex-1">
          <T weight="heavy">{phone.label}</T>
          <T weight="semibold" className="text-[12px] text-subtle">
            {serving ?? (phone.kind === "OWNER" ? "Coline" : "No shift open")}
          </T>
        </View>
        <View className={cn("flex-row items-center gap-1 h-7 px-2.5 rounded-full", status.box)}>
          <Icon name={status.icon} size={14} className={status.ink} />
          <T weight="heavy" className={cn("text-[11px]", status.ink)}>
            {status.label}
          </T>
        </View>
      </View>

      <View className="flex-row gap-2">
        {[
          ["Updated", isThis ? "Now" : synced ? clock(synced) : "Never"],
          ["Waiting", String(isThis ? waiting : phone.pendingSyncCount)],
          ["Version", phone.appVersion ?? "—"],
        ].map(([label, value]) => (
          <View key={label} className="flex-1 rounded-2xl bg-page p-2.5">
            <T weight="bold" className="text-[11px] text-subtle">
              {label}
            </T>
            <T weight="heavy" className="text-[14px]">
              {value}
            </T>
          </View>
        ))}
      </View>

      {!upToDate && !isThis && synced ? (
        <T weight="semibold" className="text-[12px] text-subtle">
          No internet since {clock(synced)}. Its entries are safe and will send later.
        </T>
      ) : null}

      {!isThis ? (
        confirming ? (
          <View className="gap-2 p-3 rounded-2xl bg-alarm-soft">
            <T weight="heavy" className="text-alarm-ink">
              Sign out {phone.label}? Only do this if it's lost or stolen.
            </T>
            <View className="flex-row gap-2">
              <Button label="Keep it" size="md" variant="light" className="flex-1" onPress={() => setConfirming(false)} />
              <Button variant="destructive" label="Sign out" size="md" className="flex-1" loading={revoke.isPending} onPress={() => revoke.mutate()} />
            </View>
          </View>
        ) : (
          <Button label="Lost this phone?" icon="phonelink-erase" size="sm" variant="ghost" onPress={() => setConfirming(true)} />
        )
      ) : null}
    </View>
  );
}

/** C9 Phones: which phones are up to date and what's waiting to send. */
export default function Phones() {
  const device = useObservable(deviceStore);
  const { syncing } = useObservable(syncStore);
  const list = useQuery(trpc.devices.list.queryOptions());
  const phones = (list.data ?? []).filter((phone) => !phone.revokedAt);
  const behind = phones.filter(
    (phone) => phone.id !== device?.id && (!phone.lastSyncedAt || Date.now() - new Date(phone.lastSyncedAt).getTime() > STALE_MS || phone.pendingSyncCount > 0),
  );

  return (
    <Screen
      header={{ title: "Phones", subtitle: "Each phone saves first, then sends" }}
      footer={
        <Button
          label="Update now"
          icon="sync"
          loading={syncing}
          onPress={async () => {
            await syncNow();
            void list.refetch();
          }}
        />
      }
    >
      <LiveState query={list}>
        <Banner
          tone={behind.length ? "amber" : "leaf"}
          icon="cloud-sync"
          text={
            behind.length
              ? `${phones.length - behind.length} of ${phones.length} phones up to date · ${behind[0]?.label} has ${behind[0]?.pendingSyncCount ?? 0} entries waiting`
              : `All ${phones.length} phones up to date`
          }
        />
        {phones.map((phone, index) => (
          <PhoneCard key={phone.id} phone={phone} index={index + 1} isThis={phone.id === device?.id} />
        ))}
      </LiveState>
    </Screen>
  );
}
