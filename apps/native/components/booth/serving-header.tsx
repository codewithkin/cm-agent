import { View } from "react-native";

import { Avatar } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { SyncChip } from "@/components/ui/sync-chip";
import { Tap } from "@/components/ui/tap";
import { T } from "@/components/ui/text";
import { clock, dayLabel, greeting, initials, type DateLike } from "@/lib/format";
import { lockNow } from "@/lib/idle-lock";
import type { Session } from "@/lib/session";

/**
 * Top of the booth home: who is serving and since when. Tapping it hands the
 * phone over (back to "Who is serving?").
 */
export function ServingHeader({
  session,
  since,
  deviceLabel,
}: {
  session: Session;
  since: DateLike | null;
  deviceLabel: string;
}) {
  const owner = session.user.role === "OWNER";
  const firstName = session.user.name.split(" ")[0];
  // "Morning, Helper 1" when no shift is open (design B2).
  const hello = greeting().split(" ")[1] ?? "";
  const title = since
    ? `${owner ? firstName : session.user.name} is serving`
    : `${hello.charAt(0).toUpperCase()}${hello.slice(1)}, ${session.user.name}`;
  const subtitle = since
    ? owner
      ? "Owner · sees everything"
      : `since ${clock(since)}`
    : `${dayLabel(new Date())} · ${deviceLabel}`;

  return (
    <View className="flex-row items-center gap-2.5">
      <Tap onPress={lockNow} scaleTo={0.97} className="flex-1 flex-row items-center gap-2.5" accessibilityLabel="Change person">
        <Avatar label={initials(session.user.name)} owner={owner} />
        <View className="flex-1 min-w-0">
          <T weight="heavy" numberOfLines={1}>
            {title}
          </T>
          <View className="flex-row items-center gap-1">
            <T weight="semibold" className="text-[12px] text-subtle" numberOfLines={1}>
              {subtitle}
            </T>
            {since && !owner ? (
              <>
                <T className="text-[12px] text-subtle">·</T>
                <Icon name="swap-horiz" size={14} className="text-subtle" />
                <T weight="semibold" className="text-[12px] text-subtle">
                  tap to change person
                </T>
              </>
            ) : null}
          </View>
        </View>
      </Tap>
      <SyncChip />
    </View>
  );
}
