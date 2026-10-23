import { cn } from "heroui-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { haptic } from "@/lib/motion";

import { CountBubble } from "./badges";
import { Icon, type IconName } from "./icon";
import { Tap } from "./tap";
import { T } from "./text";

export type TabItem = {
  /** Route name inside the Tabs layout. */
  name: string;
  label: string;
  icon: IconName;
  badge?: number;
};

/** The parts of Expo Router's tab bar props (BottomTabBarProps) this bar uses. */
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigateToTab: (routeKey: string) => void;
};

type Props = TabBarProps & {
  items: TabItem[];
  /** The round yellow "+" in the middle (new transaction). */
  centerAction?: { label: string; onPress: () => void };
};

/**
 * The floating white bar from the design: the active tab is a black pill with
 * its label, the others are icons; the pill slides between tabs.
 */
export function FloatingTabBar({ state, navigateToTab, items, centerAction }: Props) {
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;
  const half = Math.ceil(items.length / 2);

  const renderItem = (item: TabItem) => {
    const route = state.routes.find((candidate) => candidate.name === item.name);
    if (!route) return null;
    const active = item.name === activeName;
    return (
      <View key={item.name}>
        <Tap
          accessibilityLabel={item.label}
          accessibilityState={{ selected: active }}
          scaleTo={0.9}
          onPress={() => {
            if (!active) navigateToTab(route.key);
          }}
          className={cn("h-12 flex-row items-center gap-1.5 rounded-full", active ? "bg-ink pl-3 pr-4" : "w-11 justify-center")}
        >
          <View>
            <Icon name={item.icon} size={22} className={active ? "text-white" : "text-subtle"} />
            {item.badge ? <CountBubble count={item.badge} /> : null}
          </View>
          {active ? (
            <View>
              <T weight="heavy" className="text-[13px] text-white">
                {item.label}
              </T>
            </View>
          ) : null}
        </Tap>
      </View>
    );
  };

  return (
    <View
      className="absolute left-3.5 right-3.5 h-16 rounded-full bg-white border border-line flex-row items-center justify-between px-2"
      style={{
        bottom: insets.bottom + 10,
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 10,
      }}
    >
      {items.slice(0, half).map(renderItem)}
      {centerAction ? (
        <Tap
          accessibilityLabel={centerAction.label}
          scaleTo={0.86}
          feedback={false}
          onPress={() => {
            haptic.tap();
            centerAction.onPress();
          }}
          className="w-[54px] h-[54px] rounded-full bg-sun items-center justify-center"
          style={{
            shadowColor: "#C89614",
            shadowOpacity: 0.6,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          }}
        >
          <Icon name="add" size={28} />
        </Tap>
      ) : null}
      {items.slice(half).map(renderItem)}
    </View>
  );
}
