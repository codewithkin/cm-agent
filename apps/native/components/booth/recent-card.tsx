import { router } from "expo-router";
import { View } from "react-native";

import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Tap } from "@/components/ui/tap";
import { T } from "@/components/ui/text";
import { TransactionRow } from "@/components/ui/transaction-row";
import { statusOf } from "@/lib/booth";
import { clock, maskPhone } from "@/lib/format";
import type { LocalTransaction } from "@/lib/local-db";

/** Row details shared by the home card and the transactions list. */
export function rowOf(tx: LocalTransaction, withPhone = false) {
  const kind = tx.type === "CASH_OUT" ? "Cash-out" : "Cash-in";
  const hasName = tx.customerName && tx.customerName !== tx.customerPhone;
  return {
    id: tx.id,
    type: tx.type,
    currency: tx.currency,
    amount: tx.amount,
    title: hasName ? tx.customerName : maskPhone(tx.customerPhone),
    subtitle: [kind, clock(tx.occurredAt), withPhone && hasName ? maskPhone(tx.customerPhone) : null]
      .filter(Boolean)
      .join(" · "),
    status: statusOf(tx),
  };
}

/** "Today": the latest few entries, with "See all". */
export function RecentCard({ transactions, index = 5 }: { transactions: LocalTransaction[]; index?: number }) {
  return (
    <Card
      index={index}
      title="Today"
      className="pb-1"
      action={
        <Tap onPress={() => router.push("/transactions")} className="flex-row items-center">
          <T weight="bold" className="text-[13px] text-ink-soft">
            See all
          </T>
          <Icon name="chevron-right" size={18} className="text-ink-soft" />
        </Tap>
      }
    >
      {transactions.length === 0 ? (
        <View className="items-center py-6 gap-1">
          <Icon name="receipt-long" size={28} className="text-line-strong" />
          <T weight="semibold" className="text-subtle text-[13px]">
            No transactions yet this shift
          </T>
        </View>
      ) : (
        <View>
          {transactions.slice(0, 5).map((tx, i) => (
            <TransactionRow
              key={tx.id}
              row={rowOf(tx)}
              index={i}
              first={i === 0}
              onPress={() => router.push({ pathname: "/transaction/[id]", params: { id: tx.id } })}
            />
          ))}
        </View>
      )}
    </Card>
  );
}
