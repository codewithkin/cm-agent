import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { cn } from "heroui-native";
import { View } from "react-native";

import { MoneyNowCard } from "@/components/booth/money-now-card";
import { LiveState } from "@/components/owner/live-state";
import { CurrencyBadge } from "@/components/ui/badges";
import { Avatar, Banner, Card } from "@/components/ui/card";
import { FabMenu, type FabAction } from "@/components/ui/fab";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { SyncChip } from "@/components/ui/sync-chip";
import { T } from "@/components/ui/text";
import { useOpenShift } from "@/lib/booth";
import { deviceStore } from "@/lib/device";
import { amount, clock, greeting, initials } from "@/lib/format";
import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";
import { trpc } from "@/utils/trpc";

/** C1 Today · both phones combined. */
export default function Today() {
  const session = useObservable(sessionStore);
  const today = useQuery({ ...trpc.reports.today.queryOptions(), enabled: Boolean(session?.sessionToken), refetchInterval: 30_000 });
  const data = today.data;
  const device = useObservable(deviceStore);
  const shift = useOpenShift();
  const booth = device?.kind === "BOOTH";

  const actions: FabAction[] = [
    ...(booth
      ? [{ icon: "receipt-long" as const, label: "New transaction", hint: "Cash-in or cash-out at this booth", onPress: () => router.push("/transaction/new") }]
      : []),
    ...(booth && shift
      ? [{ icon: "swap-horiz" as const, label: "Move money", hint: "Float bought, cash taken or added", onPress: () => router.push("/move-money") }]
      : []),
    { icon: "person-add", label: "Add a person", hint: "A helper with their own PIN", onPress: () => router.push({ pathname: "/people", params: { add: "1" } }) },
    { icon: "add-to-home-screen", label: "Add a phone", hint: "Set up another booth or owner phone", onPress: () => router.push({ pathname: "/phones", params: { add: "1" } }) },
  ];

  return (
    <Screen withTabBar fab={<FabMenu actions={actions} />}>
      <View className="flex-row items-center gap-2.5">
        <Avatar label={initials(session?.user.name ?? "CM")} owner />
        <View className="flex-1">
          <T weight="semibold" className="text-[12px] text-subtle">
            {greeting()}
          </T>
          <T weight="heavy" className="text-[17px]">
            {session?.user.name}
          </T>
        </View>
        <SyncChip />
      </View>

      <LiveState query={today}>
        {data ? (
          <>
            <View className="bg-ink rounded-[28px] p-4 gap-3">
              <T weight="bold" className="text-[12px] text-white/60">
                Today · both phones
              </T>
              <View className="flex-row items-end gap-2">
                <T weight="heavy" className="text-[48px] leading-[52px] text-white">
                  {data.totals.transactionCount}
                </T>
                <T weight="bold" className="text-white/70 mb-2">
                  transactions
                </T>
              </View>
              <View className="flex-row gap-2">
                {(["USD", "ZIG"] as const).map((currency) => (
                  <View key={currency} className="flex-1 rounded-2xl bg-white/10 p-3 gap-1">
                    <T weight="bold" className="text-[11px] text-white/60">
                      You earned
                    </T>
                    <View className="flex-row items-center gap-1.5">
                      <CurrencyBadge currency={currency} />
                      <T weight="heavy" className="text-[17px] text-white">
                        {amount(data.totals[currency].commission)}
                      </T>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {data.reviewCount > 0 ? (
              <Banner
                tone="alarm"
                icon="mark-chat-unread"
                text={`${data.reviewCount} ${data.reviewCount === 1 ? "thing" : "things"} to check`}
                actionLabel="Check"
                onAction={() => router.push("/review")}
              />
            ) : (
              <Banner tone="leaf" icon="task-alt" text="Nothing to check. All entries match." />
            )}

            <Card title="Working now">
              {data.booths.map((booth, index) => {
                const synced = booth.lastSyncedAt ? new Date(booth.lastSyncedAt) : null;
                const stale = !synced || Date.now() - synced.getTime() > 10 * 60_000;
                return (
                  <View key={booth.id} className={cn("flex-row items-center gap-3 py-2", index > 0 && "border-t border-line")}>
                    <View className="w-10 h-10 rounded-xl bg-sun-soft items-center justify-center">
                      <Icon name="storefront" size={20} className="text-sun-ink" />
                    </View>
                    <View className="flex-1">
                      <T weight="heavy" className="text-[14px]">
                        {booth.label}
                        {booth.serving ? ` · ${booth.serving.name}` : ""}
                      </T>
                      <T weight="semibold" className={cn("text-[12px]", stale ? "text-alarm-ink" : "text-subtle")}>
                        {stale
                          ? `No internet since ${synced ? clock(synced) : "setup"}`
                          : booth.serving
                            ? `since ${clock(booth.serving.since)}`
                            : "No shift open"}
                      </T>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Icon name={stale ? "cloud-off" : "cloud-done"} size={18} className={stale ? "text-subtle" : "text-leaf-bright"} />
                      <T weight="bold" className="text-[11px] text-subtle">
                        {stale ? booth.pendingSyncCount || "" : synced ? clock(synced) : ""}
                      </T>
                    </View>
                  </View>
                );
              })}
            </Card>

            <MoneyNowCard balances={data.balances} low={data.low} caption={() => "Both phones"} />
          </>
        ) : null}
      </LiveState>
    </Screen>
  );
}
