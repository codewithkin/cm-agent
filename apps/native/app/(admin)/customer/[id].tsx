import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Linking, View } from "react-native";

import { LiveState } from "@/components/owner/live-state";
import { CurrencyBadge } from "@/components/ui/badges";
import { Avatar, Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { Tap } from "@/components/ui/tap";
import { T } from "@/components/ui/text";
import { TransactionRow } from "@/components/ui/transaction-row";
import { clock, dayLabel, initials, prettyPhone, shortDate, wholeAmount } from "@/lib/format";
import { trpc } from "@/utils/trpc";

function RoundAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Tap onPress={onPress} accessibilityLabel={label} scaleTo={0.9} className="w-12 h-12 rounded-full bg-ink items-center justify-center">
      <Icon name={icon} size={22} className="text-white" />
    </Tap>
  );
}

/** C5 Customer detail: who they are, how often they come, and their entries. */
export default function CustomerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customer = useQuery(trpc.customers.get.queryOptions({ customerId: id }));
  const data = customer.data;

  return (
    <Screen header={{ title: "Customer" }}>
      <LiveState query={customer}>
        {data ? (
          <>
            <View className="items-center gap-2 py-2">
              <Avatar label={initials(data.customer.name ?? "?")} size={72} />
              <T weight="heavy" className="text-[22px]">
                {data.customer.name ?? "Unknown"}
              </T>
              <T weight="semibold" className="text-subtle">
                {prettyPhone(data.customer.phone)}
              </T>
              <View className="flex-row gap-3 mt-1">
                <RoundAction icon="call" label="Call" onPress={() => void Linking.openURL(`tel:${data.customer.phone}`)} />
                <RoundAction icon="sms" label="Send SMS" onPress={() => void Linking.openURL(`sms:${data.customer.phone}`)} />
              </View>
            </View>

            <Card index={1} className="flex-row gap-2 p-2.5">
              {[
                ["ID", data.customer.idNumber ?? "—"],
                ["First visit", shortDate(data.customer.firstSeenAt)],
                ["Visits", String(data.totals.transactionCount)],
              ].map(([label, value]) => (
                <View key={label} className="flex-1 rounded-2xl bg-page p-2.5">
                  <T weight="bold" className="text-[11px] text-subtle">
                    {label}
                  </T>
                  <T weight="heavy" className="text-[13px]" numberOfLines={1}>
                    {value}
                  </T>
                </View>
              ))}
            </Card>

            <View className="flex-row gap-2">
              <View className="flex-1 flex-row items-center gap-1.5 p-3 rounded-2xl bg-white border border-line">
                <Icon name="north-east" size={16} className="text-ink-soft" />
                <CurrencyBadge currency="USD" />
                <T weight="heavy">{wholeAmount(data.totals.USD.cashOutValue)} out</T>
              </View>
              <View className="flex-1 flex-row items-center gap-1.5 p-3 rounded-2xl bg-sun-soft">
                <Icon name="south-west" size={16} className="text-sun-ink" />
                <CurrencyBadge currency="ZIG" />
                <T weight="heavy">{wholeAmount(data.totals.ZIG.cashInValue)} in</T>
              </View>
            </View>

            <T weight="heavy" className="px-1 mt-1">
              Transactions
            </T>

            <View className="bg-white rounded-3xl border border-line px-3.5">
              {data.transactions.map((tx, index) => (
                <TransactionRow
                  key={tx.id}
                  index={index}
                  first={index === 0}
                  onPress={() => router.push({ pathname: "/transaction/[id]", params: { id: tx.id } })}
                  row={{
                    id: tx.id,
                    type: tx.type,
                    currency: tx.currency,
                    amount: tx.amount,
                    title: tx.type === "CASH_OUT" ? "Cash-out" : "Cash-in",
                    subtitle: `${dayLabel(tx.occurredAt)} · ${clock(tx.occurredAt)} · ${tx.servedBy.name}`,
                    status: tx.voidedAt ? "CANCELLED" : tx.matchState,
                  }}
                />
              ))}
            </View>
          </>
        ) : null}
      </LiveState>
    </Screen>
  );
}
