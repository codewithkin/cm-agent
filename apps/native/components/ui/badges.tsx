import { cn } from "heroui-native";
import { View } from "react-native";


import { Icon, type IconName } from "./icon";
import { T } from "./text";

export type Currency = "USD" | "ZIG";

/** USD = black badge, ZiG = yellow badge (design legend). */
export function CurrencyBadge({ currency, size = "sm" }: { currency: Currency; size?: "sm" | "md" }) {
  const usd = currency === "USD";
  return (
    <View
      className={cn(
        "rounded-md self-start",
        usd ? "bg-ink" : "bg-sun",
        size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1",
      )}
    >
      <T
        weight="heavy"
        className={cn(usd ? "text-white" : "text-ink", size === "sm" ? "text-[10px]" : "text-[12px]")}
        style={{ letterSpacing: 0.4 }}
      >
        {usd ? "USD" : "ZiG"}
      </T>
    </View>
  );
}

export type MatchStatus = "MATCHED" | "NO_SMS" | "MISMATCH" | "MANUAL" | "NOT_SAVED" | "CANCELLED";

const STATUS: Record<MatchStatus, { label: string; icon: IconName; box: string; ink: string }> = {
  MATCHED: { label: "Matched", icon: "check-circle", box: "bg-leaf-soft", ink: "text-leaf" },
  NO_SMS: { label: "No SMS", icon: "sms-failed", box: "bg-amber-soft", ink: "text-amber-ink" },
  NOT_SAVED: { label: "SMS not saved", icon: "mark-chat-unread", box: "bg-alarm-soft", ink: "text-alarm-ink" },
  MISMATCH: { label: "No match", icon: "error", box: "bg-alarm-soft", ink: "text-alarm-ink" },
  MANUAL: { label: "Typed in", icon: "edit", box: "bg-line", ink: "text-ink-soft" },
  CANCELLED: { label: "Cancelled", icon: "block", box: "bg-line", ink: "text-ink-soft" },
};

/** How an entry lines up with its EcoCash SMS. */
export function StatusChip({ status }: { status: MatchStatus }) {
  const style = STATUS[status];
  return (
    <View className={cn("flex-row items-center gap-1 h-6 pl-1.5 pr-2.5 rounded-full self-start", style.box)}>
      <Icon name={style.icon} size={14} className={style.ink} />
      <T weight="heavy" className={cn("text-[11px]", style.ink)}>
        {style.label}
      </T>
    </View>
  );
}

/** Small grey pill, e.g. "14 done". */
export function Pill({ icon, label, className }: { icon?: IconName; label: string; className?: string }) {
  return (
    <View className={cn("flex-row items-center gap-1 h-[26px] pl-2 pr-2.5 rounded-full bg-page self-start", className)}>
      {icon ? <Icon name={icon} size={15} className="text-ink-soft" /> : null}
      <T weight="bold" className="text-[11px] text-ink-soft">
        {label}
      </T>
    </View>
  );
}

/** Red count bubble on tab icons. */
export function CountBubble({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View
      className="absolute -top-1 -right-2 min-w-[17px] h-[17px] px-1 rounded-full bg-alarm items-center justify-center border-2 border-white"
    >
      <T weight="heavy" className="text-[10px] text-white">
        {count > 99 ? "99+" : count}
      </T>
    </View>
  );
}
