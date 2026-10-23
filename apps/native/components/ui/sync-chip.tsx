import { useEffect } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { clock } from "@/lib/format";
import { onlineStore } from "@/lib/network";
import { useObservable } from "@/lib/observable";
import { outboxStore } from "@/lib/outbox";
import { syncNow, syncStore } from "@/lib/sync";

import { Icon } from "./icon";
import { Tap } from "./tap";
import { T } from "./text";

/** "Updated 14:32" / "No internet · 12 waiting". Tap to sync now. */
export function SyncChip() {
  const online = useObservable(onlineStore);
  const { syncing, lastSyncedAt } = useObservable(syncStore);
  const waiting = useObservable(outboxStore).length;

  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = syncing ? withRepeat(withTiming(360, { duration: 900 }), -1) : withTiming(0);
  }, [syncing, spin]);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));

  const label = !online
    ? `No internet${waiting ? ` · ${waiting} waiting` : ""}`
    : syncing
      ? "Updating…"
      : lastSyncedAt
        ? `Updated ${clock(lastSyncedAt)}`
        : "Not updated yet";

  return (
    <Tap
      onPress={() => void syncNow()}
      className="flex-row items-center gap-1 h-[30px] pl-2 pr-2.5 rounded-full bg-white border border-line"
      accessibilityLabel={label}
    >
      <Animated.View style={syncing ? spinStyle : undefined}>
        <Icon
          name={!online ? "cloud-off" : syncing ? "sync" : "cloud-done"}
          size={16}
          className={!online ? "text-subtle" : "text-leaf-bright"}
        />
      </Animated.View>
      <T weight="bold" className="text-[11px]">
        {label}
      </T>
    </Tap>
  );
}
