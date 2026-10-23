import { router } from "expo-router";
import { cn } from "heroui-native";
import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";


import { IconButton } from "./button";
import { T } from "./text";

type HeaderProps = {
  title: string;
  subtitle?: string;
  /** "back" shows ←, "close" shows ×, null shows nothing. */
  leading?: "back" | "close" | null;
  onLeading?: () => void;
  right?: ReactNode;
  /** Big page title (tabs) instead of a compact one (pushed screens). */
  large?: boolean;
};

export function ScreenHeader({ title, subtitle, leading = "back", onLeading, right, large }: HeaderProps) {
  return (
    <View className="flex-row items-center gap-3 pb-2">
      {leading ? (
        <IconButton
          icon={leading === "back" ? "arrow-back" : "close"}
          label={leading === "back" ? "Back" : "Close"}
          onPress={onLeading ?? (() => (router.canGoBack() ? router.back() : router.replace("/")))}
        />
      ) : null}
      <View className="flex-1 min-w-0">
        {large && subtitle ? (
          <T weight="bold" className="text-[12px] text-subtle">
            {subtitle}
          </T>
        ) : null}
        <T weight="heavy" numberOfLines={1} className={large ? "text-[28px] tracking-tight" : "text-[18px]"}>
          {title}
        </T>
        {!large && subtitle ? (
          <T weight="semibold" numberOfLines={1} className="text-[12px] text-subtle">
            {subtitle}
          </T>
        ) : null}
      </View>
      {right}
    </View>
  );
}

type ScreenProps = PropsWithChildren<{
  header?: HeaderProps;
  /** Pinned at the bottom, above the safe area (main action buttons). */
  footer?: ReactNode;
  scroll?: boolean;
  /** Extra room at the bottom for the floating tab bar. */
  withTabBar?: boolean;
  /** A floating action button, bottom right, above the footer and tab bar. */
  fab?: ReactNode;
  className?: string;
}>;

/** Page frame: safe areas, the page colour, optional header, floating button and pinned footer. */
export function Screen({ header, footer, scroll = true, withTabBar, fab, className, children }: ScreenProps) {
  const insets = useSafeAreaInsets();
  // The tab bar floats over the bottom of the page: keep the footer and FAB above it.
  const tabBarRoom = withTabBar ? insets.bottom + 86 : 0;
  const bottomRoom = (withTabBar && !footer ? 110 : 16) + (fab ? 76 : 0);
  const body = (
    <View className={cn("gap-3", !scroll && "flex-1", className)}>
      {children}
    </View>
  );
  return (
    <View className="flex-1 bg-page" style={{ paddingTop: insets.top + 8 }}>
      <View className="px-4">{header ? <ScreenHeader {...header} /> : null}</View>
      <View className="flex-1">
        {scroll ? (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: bottomRoom }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {body}
          </ScrollView>
        ) : (
          <View className="flex-1 px-4 pt-1">{body}</View>
        )}
        {fab ? (
          <View className="absolute right-4" style={{ bottom: withTabBar && !footer ? tabBarRoom : 12 }}>
            {fab}
          </View>
        ) : null}
      </View>
      {footer ? (
        <View className="px-4 pt-2 gap-2" style={{ paddingBottom: withTabBar ? tabBarRoom : insets.bottom + 12 }}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}
