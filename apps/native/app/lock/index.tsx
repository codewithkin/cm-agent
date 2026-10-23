import { router } from "expo-router";
import { cn } from "heroui-native";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { Avatar, Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { SyncChip } from "@/components/ui/sync-chip";
import { Tap } from "@/components/ui/tap";
import { T } from "@/components/ui/text";
import { deviceStore } from "@/lib/device";
import { clock, dayLabel, initials, toDate } from "@/lib/format";
import { useBusinessName, useRows, type LocalUser } from "@/lib/local-db";
import { useObservable } from "@/lib/observable";
import { syncNow } from "@/lib/sync";

function HelperCard({ user, servingSince, lastShift, index }: {
  user: LocalUser;
  servingSince: Date | null;
  lastShift: Date | null;
  index: number;
}) {
  return (
    <View className="flex-1">
      <Tap
        onPress={() => router.push({ pathname: "/lock/[userId]", params: { userId: user.id } })}
        accessibilityLabel={`${user.name}, enter PIN`}
        className={cn("bg-white rounded-3xl border-2 p-4 items-center gap-2", servingSince ? "border-ink" : "border-line")}
      >
        <Avatar label={initials(user.name)} size={52} />
        <T weight="heavy" numberOfLines={1}>
          {user.name}
        </T>
        {servingSince ? (
          <View className="flex-row items-center gap-1 h-6 px-2 rounded-full bg-leaf-soft">
            <Icon name="radio-button-checked" size={12} className="text-leaf" />
            <T weight="heavy" className="text-[10px] text-leaf">
              Working since {clock(servingSince)}
            </T>
          </View>
        ) : (
          <View className="flex-row items-center gap-1 h-6 px-2 rounded-full bg-page">
            <Icon name="history" size={12} className="text-subtle" />
            <T weight="bold" className="text-[10px] text-subtle">
              {lastShift ? `Last shift ${dayLabel(lastShift).split(" ")[0]}` : "No shifts yet"}
            </T>
          </View>
        )}
      </Tap>
    </View>
  );
}

/** A4 Lock · who is serving? Shown on launch, after 2 minutes idle and on "Change person". */
export default function WhoIsServing() {
  const device = useObservable(deviceStore);
  const users = useRows("users", (user) => user.active, (a, b) => a.name.localeCompare(b.name));
  const shifts = useRows("shifts", (shift) => shift.deviceId === device?.id, undefined, [device?.id]);

  useEffect(() => {
    if (users.length === 0) void syncNow();
  }, [users.length]);

  const owner = users.find((user) => user.role === "OWNER");
  const helpers = device?.kind === "OWNER" ? [] : users.filter((user) => user.role === "HELPER");
  const openShift = shifts.find((shift) => shift.status === "OPEN");
  const lastShiftOf = (userId: string) =>
    shifts
      .filter((shift) => shift.openedById === userId)
      .map((shift) => toDate(shift.closedAt ?? shift.openedAt))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  const name = useBusinessName();

  return (
    <Screen>
      <View className="flex-row items-center gap-2">
        <View className="w-8 h-8 rounded-lg bg-ink items-center justify-center">
          <T weight="heavy" className="text-[11px] text-sun">
            CM
          </T>
        </View>
        <T weight="heavy" className="flex-1 text-[14px]" numberOfLines={1}>
          {name}
        </T>
        <SyncChip />
      </View>

      <View>
        <T weight="heavy" className="text-[30px] tracking-tight mt-6 mb-2">
          Who is serving?
        </T>
      </View>

      {users.length === 0 ? (
        <Card className="items-center py-8">
          <ActivityIndicator color="#141416" />
          <T weight="semibold" className="text-subtle">
            Getting the people for this phone…
          </T>
        </Card>
      ) : null}

      {helpers.length > 0 ? (
        <View className="flex-row flex-wrap gap-3">
          {helpers.map((user, index) => (
            <View key={user.id} style={{ width: "47.5%" }}>
              <HelperCard
                user={user}
                index={index + 2}
                servingSince={openShift?.openedById === user.id ? toDate(openShift.openedAt) : null}
                lastShift={lastShiftOf(user.id)}
              />
            </View>
          ))}
        </View>
      ) : null}

      {owner ? (
        <View>
          <Tap
            onPress={() => router.push({ pathname: "/lock/[userId]", params: { userId: owner.id } })}
            scaleTo={0.98}
            className="flex-row items-center gap-3 bg-white rounded-3xl border border-line p-3.5"
          >
            <Avatar label={initials(owner.name)} owner />
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <T weight="heavy">{owner.name.split(" ")[0]}</T>
                <View className="px-2 py-0.5 rounded-md bg-ink">
                  <T weight="heavy" className="text-[10px] text-white">
                    Owner
                  </T>
                </View>
              </View>
              <T weight="semibold" className="text-[12px] text-subtle">
                Sees everything
              </T>
            </View>
            <Icon name="chevron-right" size={22} className="text-subtle" />
          </Tap>
        </View>
      ) : null}
    </Screen>
  );
}
