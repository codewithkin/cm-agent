import { BALANCE_KEYS } from "@cm-agent/api/lib/balances";
import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { cn } from "heroui-native";
import { useMemo } from "react";
import { ActivityIndicator, View } from "react-native";
import Animated from "react-native-reanimated";

import { LiveState } from "@/components/owner/live-state";
import { Avatar } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { Tap } from "@/components/ui/tap";
import { T } from "@/components/ui/text";
import { clock, dayLabel, initials, localDateKey } from "@/lib/format";
import { enterUp } from "@/lib/motion";
import { trpc, type RouterOutputs } from "@/utils/trpc";

type Shift = RouterOutputs["shifts"]["list"]["items"][number];

/** C7 Shift history, newest first, grouped by day. */
export default function Shifts() {
  const list = useInfiniteQuery(
    trpc.shifts.list.infiniteQueryOptions({ limit: 30 }, { getNextPageParam: (page) => page.nextCursor }),
  );
  const days = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const shift of list.data?.pages.flatMap((page) => page.items) ?? []) {
      const key = localDateKey(shift.openedAt);
      map.set(key, [...(map.get(key) ?? []), shift]);
    }
    return [...map];
  }, [list.data]);

  return (
    <Screen header={{ title: "Shift history", subtitle: "Newest first" }}>
      <LiveState query={list}>
        {days.map(([day, shifts], dayIndex) => (
          <Animated.View key={day} entering={enterUp(dayIndex)} className="gap-1">
            <T weight="heavy" className="text-[12px] text-subtle px-1">
              {dayLabel(shifts[0]!.openedAt)}
            </T>
            <View className="bg-white rounded-3xl border border-line px-3.5">
              <View className="flex-row py-2 border-b border-line">
                <T weight="heavy" className="flex-1 text-[11px] text-subtle">
                  WHO
                </T>
                <T weight="heavy" className="w-28 text-[11px] text-subtle">
                  TIME
                </T>
                <T weight="heavy" className="w-12 text-right text-[11px] text-subtle">
                  OK
                </T>
              </View>
              {shifts.map((shift, index) => {
                const balanced = shift.variance ? BALANCE_KEYS.every((key) => shift.variance?.[key] === 0) : null;
                return (
                  <Tap
                    key={shift.id}
                    scaleTo={0.98}
                    onPress={() => router.push({ pathname: "/shift/summary/[id]", params: { id: shift.id } })}
                    className={cn("flex-row items-center py-2.5", index > 0 && "border-t border-line")}
                  >
                    <View className="flex-1 flex-row items-center gap-2">
                      <Avatar label={initials(shift.openedBy.name)} size={30} />
                      <View>
                        <T weight="heavy" className="text-[13px]">
                          {shift.openedBy.name}
                        </T>
                        <T weight="semibold" className="text-[11px] text-subtle">
                          {shift.device.label}
                        </T>
                      </View>
                    </View>
                    <T weight="bold" className="w-28 text-[13px]">
                      {clock(shift.openedAt)}–{shift.closedAt ? clock(shift.closedAt) : "now"}
                    </T>
                    <View className="w-12 items-end">
                      {balanced === null ? (
                        <View className="w-2.5 h-2.5 rounded-full bg-leaf-bright" />
                      ) : (
                        <Icon name={balanced ? "check-circle" : "error"} size={20} className={balanced ? "text-leaf" : "text-alarm"} />
                      )}
                    </View>
                  </Tap>
                );
              })}
            </View>
          </Animated.View>
        ))}
        {list.hasNextPage ? (
          <Tap onPress={() => void list.fetchNextPage()} className="h-12 rounded-full bg-white border border-line items-center justify-center">
            {list.isFetchingNextPage ? <ActivityIndicator color="#141416" /> : <T weight="heavy">Load more</T>}
          </Tap>
        ) : null}
      </LiveState>
    </Screen>
  );
}
