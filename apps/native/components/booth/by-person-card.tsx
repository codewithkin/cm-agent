import { summarizeBy } from "@cm-agent/api/lib/summary";
import { View } from "react-native";

import { Avatar, Card } from "@/components/ui/card";
import { T } from "@/components/ui/text";
import { amount, initials } from "@/lib/format";
import { localDb, type LocalTransaction } from "@/lib/local-db";

/** "Today by person": who did how many, and how much cash went out (USD). */
export function ByPersonCard({ transactions }: { transactions: LocalTransaction[] }) {
  const users = localDb.get().users;
  const rows = [...summarizeBy(transactions.filter((tx) => !tx.voidedAt), (tx) => tx.servedById)];
  if (rows.length === 0) return null;
  return (
    <Card title="Today by person">
      <View className="flex-row border-b border-line pb-2">
        <T weight="heavy" className="flex-1 text-[11px] text-subtle">
          PERSON
        </T>
        <T weight="heavy" className="w-14 text-right text-[11px] text-subtle">
          DONE
        </T>
        <T weight="heavy" className="w-28 text-right text-[11px] text-subtle">
          CASH OUT
        </T>
      </View>
      {rows.map(([userId, summary]) => {
        const name = users[userId]?.name ?? "Unknown";
        return (
          <View key={userId} className="flex-row items-center">
            <View className="flex-1 flex-row items-center gap-2">
              <Avatar label={initials(name)} size={28} owner={users[userId]?.role === "OWNER"} />
              <T weight="bold" className="text-[13px]">
                {name}
              </T>
            </View>
            <T weight="heavy" className="w-14 text-right">
              {summary.transactionCount}
            </T>
            <T weight="heavy" className="w-28 text-right">
              USD {amount(summary.USD.cashOutValue)}
            </T>
          </View>
        );
      })}
    </Card>
  );
}
