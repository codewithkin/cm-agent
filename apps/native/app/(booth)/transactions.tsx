import { router } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { AddMenu } from "@/components/add-menu";
import { rowOf } from "@/components/booth/recent-card";
import { CurrencyBadge } from "@/components/ui/badges";
import { Card } from "@/components/ui/card";
import { ChipFilter } from "@/components/ui/chip-filter";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { Segmented } from "@/components/ui/segmented";
import { SyncChip } from "@/components/ui/sync-chip";
import { T } from "@/components/ui/text";
import { TransactionRow } from "@/components/ui/transaction-row";
import { useOpenShift, useShiftTransactions, useSummary } from "@/lib/booth";
import { amount, toDate } from "@/lib/format";
import type { LocalTransaction } from "@/lib/local-db";
import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";

type Filter = "ALL" | "CASH_IN" | "CASH_OUT" | "USD" | "ZIG";

const isProblem = (tx: LocalTransaction) =>
  !tx.voidedAt && (tx.matchState === "NO_SMS" || tx.matchState === "MISMATCH" || tx.flaggedAt !== null);

function hourLabel(date: Date) {
  const hour = date.getHours();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hour)}:00 – ${pad(hour + 1)}:00`;
}

/** B7 Transactions · this shift. Helpers see only their own entries. */
export default function Transactions() {
  const session = useObservable(sessionStore);
  const shift = useOpenShift();
  const isOwner = session?.user.role === "OWNER";
  const all = useShiftTransactions(shift?.id, isOwner ? undefined : session?.user.id);
  const summary = useSummary(all);
  const [tab, setTab] = useState<"SHIFT" | "PROBLEMS">("SHIFT");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");

  const problems = all.filter(isProblem);
  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    return (tab === "PROBLEMS" ? problems : all).filter((tx) => {
      if (filter === "CASH_IN" || filter === "CASH_OUT") {
        if (tx.type !== filter) return false;
      } else if (filter !== "ALL" && tx.currency !== filter) return false;
      if (!term) return true;
      return (
        tx.customerName.toLowerCase().includes(term) ||
        (tx.reference ?? "").toLowerCase().includes(term) ||
        (digits.length >= 3 && tx.customerPhone.includes(digits.replace(/^0/, "")))
      );
    });
  }, [all, problems, tab, filter, search]);

  const groups = useMemo(() => {
    const map = new Map<string, LocalTransaction[]>();
    for (const tx of shown) {
      const label = hourLabel(toDate(tx.occurredAt));
      map.set(label, [...(map.get(label) ?? []), tx]);
    }
    return [...map];
  }, [shown]);

  return (
    <Screen
      withTabBar
      fab={<AddMenu />}
      header={{
        title: "Transactions",
        subtitle: isOwner ? "Everyone on this phone" : "Only yours",
        leading: null,
        large: true,
        right: <SyncChip />,
      }}
    >
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "SHIFT", label: "My shift" },
          { value: "PROBLEMS", label: `Problems${problems.length ? ` ${problems.length}` : ""}`, activeClass: "bg-alarm" },
        ]}
      />

      <Card>
        <T weight="heavy">{summary.transactionCount} transactions</T>
        {(["USD", "ZIG"] as const).map((currency) => {
          const totals = summary[currency];
          return (
            <View key={currency} className="flex-row items-center gap-2">
              <CurrencyBadge currency={currency} />
              <T weight="bold" className="text-[12px] text-subtle w-14">
                {totals.cashInCount + totals.cashOutCount} done
              </T>
              <Icon name="south-west" size={14} className="text-sun-ink" />
              <T weight="heavy" className="flex-1 text-[14px]">
                {amount(totals.cashInValue)}
              </T>
              <Icon name="north-east" size={14} className="text-ink-soft" />
              <T weight="heavy" className="flex-1 text-[14px]">
                {amount(totals.cashOutValue)}
              </T>
            </View>
          );
        })}
      </Card>

      <ChipFilter
        value={filter}
        onChange={setFilter}
        options={[
          { value: "ALL", label: "All" },
          { value: "CASH_IN", label: "Cash-in" },
          { value: "CASH_OUT", label: "Cash-out" },
          { value: "USD", label: "USD" },
          { value: "ZIG", label: "ZiG" },
        ]}
      />
      <Field icon="search" placeholder="Search name, phone or reference" value={search} onChangeText={setSearch} />

      {groups.length === 0 ? (
        <View className="items-center py-10 gap-2">
          <Icon name={tab === "PROBLEMS" ? "task-alt" : "receipt-long"} size={36} className="text-line-strong" />
          <T weight="semibold" className="text-subtle">
            {tab === "PROBLEMS" ? "No problems. Everything matches." : search || filter !== "ALL" ? "Nothing matches" : "No transactions yet this shift"}
          </T>
        </View>
      ) : (
        groups.map(([label, rows], groupIndex) => (
          <View key={label} className="gap-1">
            <T weight="heavy" className="text-[12px] text-subtle px-1">
              {label}
            </T>
            <View className="bg-white rounded-3xl border border-line px-3.5">
              {rows.map((tx, index) => (
                <TransactionRow
                  key={tx.id}
                  row={rowOf(tx, true)}
                  first={index === 0}
                  onPress={() => router.push({ pathname: "/transaction/[id]", params: { id: tx.id } })}
                />
              ))}
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}
