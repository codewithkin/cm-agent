import { router, type Href } from "expo-router";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { Avatar } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { Tap } from "@/components/ui/tap";
import { T } from "@/components/ui/text";
import { deviceStore } from "@/lib/device";
import { initials } from "@/lib/format";
import { lockNow } from "@/lib/idle-lock";
import { enterUp } from "@/lib/motion";
import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";

type Item = { icon: IconName; label: string; hint: string; href: Href };

const ITEMS: Item[] = [
  { icon: "event-note", label: "Day report", hint: "Totals, money and people for one day", href: "/report/day" },
  { icon: "history-toggle-off", label: "Shift history", hint: "Every shift, newest first", href: "/shifts" },
  { icon: "group", label: "People", hint: "Add helpers, new PINs, remove", href: "/people" },
  { icon: "smartphone", label: "Phones", hint: "Updates and lost phones", href: "/phones" },
  { icon: "settings", label: "Settings", hint: "Business, money rules, SMS", href: "/settings" },
  { icon: "lock-person", label: "Who can see what", hint: "What helpers can and can't do", href: "/access" },
];

/** More: the owner's admin pages. */
export default function More() {
  const session = useObservable(sessionStore);
  const device = useObservable(deviceStore);

  return (
    <Screen withTabBar header={{ title: "More", leading: null, large: true }}>
      <Animated.View entering={enterUp(0)} className="flex-row items-center gap-3 p-3.5 rounded-3xl bg-ink">
        <Avatar label={initials(session?.user.name ?? "CM")} owner />
        <View className="flex-1">
          <T weight="heavy" className="text-white">
            {session?.user.name}
          </T>
          <T weight="semibold" className="text-[12px] text-white/60">
            Owner · {device?.label}
          </T>
        </View>
      </Animated.View>

      {device?.kind === "BOOTH" ? (
        <Animated.View entering={enterUp(1)}>
          <Tap onPress={() => router.replace("/home")} className="flex-row items-center gap-3 p-3.5 rounded-3xl bg-sun">
            <Icon name="storefront" size={22} />
            <T weight="heavy" className="flex-1">
              Back to the booth
            </T>
            <Icon name="chevron-right" size={22} />
          </Tap>
        </Animated.View>
      ) : null}

      <View className="bg-white rounded-3xl border border-line px-3.5">
        {ITEMS.map((item, index) => (
          <Animated.View key={item.label} entering={enterUp(index + 2)}>
            <Tap
              onPress={() => router.push(item.href)}
              scaleTo={0.98}
              className={index > 0 ? "flex-row items-center gap-3 py-3.5 border-t border-line" : "flex-row items-center gap-3 py-3.5"}
            >
              <View className="w-10 h-10 rounded-xl bg-page items-center justify-center">
                <Icon name={item.icon} size={20} />
              </View>
              <View className="flex-1">
                <T weight="heavy" className="text-[14px]">
                  {item.label}
                </T>
                <T weight="semibold" className="text-[12px] text-subtle">
                  {item.hint}
                </T>
              </View>
              <Icon name="chevron-right" size={22} className="text-subtle" />
            </Tap>
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={enterUp(ITEMS.length + 2)}>
        <Tap onPress={lockNow} className="flex-row items-center justify-center gap-2 h-12 rounded-full bg-white border border-line">
          <Icon name="lock" size={18} />
          <T weight="heavy" className="text-[14px]">
            Lock the app
          </T>
        </Tap>
      </Animated.View>
    </Screen>
  );
}
