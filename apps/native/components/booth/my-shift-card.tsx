import type { TransactionSummary } from "@cm-agent/api/lib/summary";
import { View } from "react-native";

import { CurrencyBadge, Pill } from "@/components/ui/badges";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { T } from "@/components/ui/text";
import { amount } from "@/lib/format";

function Tile({ title, inward, summary }: { title: string; inward: boolean; summary: TransactionSummary }) {
  const value = (currency: "USD" | "ZIG") =>
    inward ? summary[currency].cashInValue : summary[currency].cashOutValue;
  return (
    <View className={inward ? "flex-1 rounded-[18px] p-3 gap-2 bg-sun-soft" : "flex-1 rounded-[18px] p-3 gap-2 bg-page"}>
      <View className="flex-row items-center gap-1.5">
        <Icon name={inward ? "south-west" : "north-east"} size={18} className={inward ? "text-sun-ink" : "text-ink-soft"} />
        <T weight="heavy" className={inward ? "text-[13px] text-sun-ink" : "text-[13px] text-ink-soft"}>
          {title}
        </T>
      </View>
      {(["USD", "ZIG"] as const).map((currency) => (
        <View key={currency} className="flex-row items-center gap-1.5">
          <CurrencyBadge currency={currency} />
          <T weight="heavy" className="text-[18px]" style={{ fontVariant: ["tabular-nums"] }}>
            {amount(value(currency))}
          </T>
        </View>
      ))}
    </View>
  );
}

/** "My shift today": counts and values only (helpers never see balances). */
export function MyShiftCard({ summary, index = 1 }: { summary: TransactionSummary; index?: number }) {
  return (
    <Card index={index} title="My shift today" action={<Pill icon="receipt-long" label={`${summary.transactionCount} done`} />}>
      <View className="flex-row gap-2">
        <Tile title="Cash in" inward summary={summary} />
        <Tile title="Cash out" inward={false} summary={summary} />
      </View>
    </Card>
  );
}
