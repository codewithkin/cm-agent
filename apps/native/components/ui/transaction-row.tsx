import { cn } from "heroui-native";
import { View } from "react-native";

import { amount } from "@/lib/format";

import { CurrencyBadge, StatusChip, type Currency, type MatchStatus } from "./badges";
import { Icon } from "./icon";
import { Tap } from "./tap";
import { T } from "./text";

export type TransactionRowData = {
  id: string;
  type: "CASH_IN" | "CASH_OUT";
  currency: Currency;
  amount: number;
  title: string;
  subtitle: string;
  status: MatchStatus;
};

/** Cash-out = black tile with ↗, cash-in = yellow tile with ↙ (design B2, B7). */
export function TypeTile({ type, size = 38 }: { type: "CASH_IN" | "CASH_OUT"; size?: number }) {
  const out = type === "CASH_OUT";
  return (
    <View
      className={cn("items-center justify-center rounded-[13px]", out ? "bg-ink" : "bg-sun-soft")}
      style={{ width: size, height: size }}
    >
      <Icon name={out ? "north-east" : "south-west"} size={size * 0.48} className={out ? "text-white" : "text-sun-ink"} />
    </View>
  );
}

export function TransactionRow({
  row,
  first,
  onPress,
}: {
  row: TransactionRowData;
  first?: boolean;
  onPress?: () => void;
}) {
  const cancelled = row.status === "CANCELLED";
  return (
    <View>
      <Tap
        onPress={onPress}
        scaleTo={0.98}
        className={cn("flex-row items-center gap-3 py-2.5", !first && "border-t border-line")}
      >
        <TypeTile type={row.type} />
        <View className="flex-1 min-w-0">
          <T weight="heavy" numberOfLines={1} className={cn("text-[14px]", cancelled && "text-subtle")}>
            {row.title}
          </T>
          <T weight="semibold" numberOfLines={1} className="text-[12px] text-subtle mt-0.5">
            {row.subtitle}
          </T>
        </View>
        <View className="items-end gap-1.5">
          <View className="flex-row items-center gap-1.5">
            <CurrencyBadge currency={row.currency} />
            <T
              weight="heavy"
              className={cn("text-[14px]", cancelled && "text-subtle line-through")}
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {amount(row.amount)}
            </T>
          </View>
          <StatusChip status={row.status} />
        </View>
      </Tap>
    </View>
  );
}
