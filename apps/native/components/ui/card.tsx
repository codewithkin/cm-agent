import { cn } from "heroui-native";
import type { PropsWithChildren, ReactNode } from "react";
import { View } from "react-native";


import { Icon, type IconName } from "./icon";
import { Tap } from "./tap";
import { T } from "./text";

/** White rounded card, with an optional title and action. */
export function Card({
  children,
  className,
  title,
  action,
}: PropsWithChildren<{ className?: string; title?: string; action?: ReactNode }>) {
  return (
    <View
      className={cn("bg-card rounded-3xl border border-line p-3.5 gap-3", className)}
    >
      {title ? (
        <View className="flex-row items-center justify-between gap-2">
          <T weight="heavy">{title}</T>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

type Tone = "alarm" | "danger" | "amber" | "lilac" | "leaf" | "peach";

const TONES: Record<Tone, { box: string; ink: string }> = {
  alarm: { box: "bg-alarm", ink: "text-white" },
  danger: { box: "bg-alarm-soft", ink: "text-alarm-ink" },
  amber: { box: "bg-amber-soft", ink: "text-amber-ink" },
  lilac: { box: "bg-lilac", ink: "text-lilac-ink" },
  leaf: { box: "bg-leaf-soft", ink: "text-leaf" },
  peach: { box: "bg-peach", ink: "text-peach-ink" },
};

/** Coloured message strip: warnings, info, "2 EcoCash SMS not saved". Full width. */
export function Banner({
  tone,
  icon,
  text,
  actionLabel,
  onAction,
  className,
}: {
  tone: Tone;
  icon: IconName;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  const style = TONES[tone];
  const content = (
    <>
      <Icon name={icon} size={20} className={style.ink} />
      <T weight="bold" className={cn("flex-1 text-[13px] leading-[18px]", style.ink)}>
        {text}
      </T>
      {actionLabel ? (
        <View className="h-9 px-3 rounded-full bg-white flex-row items-center">
          <T weight="heavy" className="text-[12px] text-alarm-ink">
            {actionLabel}
          </T>
          <Icon name="chevron-right" size={16} className="text-alarm-ink" />
        </View>
      ) : null}
    </>
  );
  return (
    <View className="self-stretch">
      {onAction ? (
        <Tap
          onPress={onAction}
          className={cn("flex-row items-center gap-2.5 rounded-[18px] min-h-[52px] pl-3.5 pr-2 py-2", style.box, className)}
        >
          {content}
        </Tap>
      ) : (
        <View className={cn("flex-row items-center gap-2.5 rounded-2xl px-3.5 py-3", style.box, className)}>
          {content}
        </View>
      )}
    </View>
  );
}

/** Round initials avatar: lilac for helpers, yellow for Coline. */
export function Avatar({
  label,
  owner,
  size = 44,
  className,
}: {
  label: string;
  owner?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <View
      className={cn("rounded-full items-center justify-center", owner ? "bg-sun" : "bg-lilac", className)}
      style={{ width: size, height: size }}
    >
      <T weight="heavy" style={{ fontSize: size * 0.34 }}>
        {label}
      </T>
    </View>
  );
}

/** Label / value row used in detail cards and tables. */
export function InfoRow({
  icon,
  label,
  value,
  last,
  right,
}: {
  icon?: IconName;
  label: string;
  value?: string;
  last?: boolean;
  right?: ReactNode;
}) {
  return (
    <View className={cn("flex-row items-center gap-3 py-3", !last && "border-b border-line")}>
      {icon ? <Icon name={icon} size={20} className="text-subtle" /> : null}
      <T weight="semibold" className="text-[14px] text-subtle flex-1">
        {label}
      </T>
      {right ?? (
        <T weight="heavy" className="text-[14px]">
          {value}
        </T>
      )}
    </View>
  );
}
