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
  className?: string;
}>;

/** Page frame: safe areas, the page colour, optional header and pinned footer. */
export function Screen({ header, footer, scroll = true, withTabBar, className, children }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomRoom = withTabBar ? 110 : 16;
  const body = (
    <View className={cn("gap-3", !scroll && "flex-1", className)}>
      {children}
    </View>
  );
  return (
    <View className="flex-1 bg-page" style={{ paddingTop: insets.top + 8 }}>
      <View className="px-4">{header ? <ScreenHeader {...header} /> : null}</View>
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
      {footer ? (
        <View className="px-4 pt-2 gap-2" style={{ paddingBottom: insets.bottom + 12 }}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}
