import type { BalanceKey, Balances } from "@cm-agent/api/lib/balances";
import { cn } from "heroui-native";
import { View } from "react-native";

import { CurrencyBadge } from "@/components/ui/badges";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { T } from "@/components/ui/text";
import { amount } from "@/lib/format";

const TILES: { key: BalanceKey; label: string; currency: "USD" | "ZIG" }[] = [
  { key: "cashUsd", label: "Cash balance", currency: "USD" },
  { key: "floatUsd", label: "EcoCash balance", currency: "USD" },
  { key: "cashZig", label: "Cash balance", currency: "ZIG" },
  { key: "floatZig", label: "EcoCash balance", currency: "ZIG" },
];

/** "All money now · Coline only": the four live balances, low ones in peach. */
export function MoneyNowCard({ balances, low, index = 1, caption }: {
  balances: Balances;
  low: BalanceKey[];
  index?: number;
  caption?: (key: BalanceKey) => string | null;
}) {
  return (
    <Card
      index={index}
      title="All money now"
      action={
        <View className="flex-row items-center gap-1 h-6 px-2 rounded-full bg-sun-soft">
          <Icon name="visibility" size={13} className="text-sun-ink" />
          <T weight="heavy" className="text-[10px] text-sun-ink">
            Coline only
          </T>
        </View>
      }
    >
      <View className="flex-row flex-wrap gap-2">
        {TILES.map((tile, i) => {
          const isLow = low.includes(tile.key);
          return (
            <View
              key={tile.key}
              className={cn("rounded-2xl p-3 gap-1.5", isLow ? "bg-peach" : "bg-page")}
              style={{ width: "48.5%" }}
            >
              <View className="flex-row items-center gap-1">
                <T weight="bold" className="flex-1 text-[11px] text-ink-soft">
                  {tile.label}
                </T>
                {isLow ? <Icon name="warning" size={14} className="text-peach-ink" /> : null}
              </View>
              <View className="flex-row items-center gap-1.5">
                <CurrencyBadge currency={tile.currency} />
                <T weight="heavy" className="text-[19px]" style={{ fontVariant: ["tabular-nums"] }}>
                  {amount(balances[tile.key])}
                </T>
              </View>
              {isLow || caption ? (
                <T weight="bold" className={cn("text-[11px]", isLow ? "text-peach-ink" : "text-subtle")}>
                  {isLow ? "Low" : caption?.(tile.key)}
                </T>
              ) : null}
            </View>
          );
        })}
      </View>
    </Card>
  );
}
