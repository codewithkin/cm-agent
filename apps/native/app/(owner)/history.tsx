import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { LiveState } from "@/components/owner/live-state";
import { IconButton } from "@/components/ui/button";
import { ChipFilter } from "@/components/ui/chip-filter";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { Tap } from "@/components/ui/tap";
import { T } from "@/components/ui/text";
import { TransactionRow } from "@/components/ui/transaction-row";
import { amount, clock, dayLabel, localDateKey, maskPhone } from "@/lib/format";
import { shareCsv } from "@/lib/export";
import { haptic } from "@/lib/motion";
import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";
import { trpc, trpcClient, type RouterOutputs } from "@/utils/trpc";

type Row = RouterOutputs["transactions"]["list"]["items"][number];
type TypeFilter = "ALL" | "CASH_IN" | "CASH_OUT";

const statusOf = (tx: Row) => (tx.voidedAt ? ("CANCELLED" as const) : tx.matchState);

/** C4 History · the logbook for every phone, newest first, loaded page by page. */
export default function History() {
  const session = useObservable(sessionStore);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TypeFilter>("ALL");
  const [helper, setHelper] = useState<string>("ALL");
  const team = useQuery({ ...trpc.team.list.queryOptions(), enabled: Boolean(session?.sessionToken) });

  const input = {
    search: search.trim() || undefined,
    type: type === "ALL" ? undefined : type,
    servedById: helper === "ALL" ? undefined : helper,
    limit: 30,
  };
  const list = useInfiniteQuery({
    ...trpc.transactions.list.infiniteQueryOptions(input, { getNextPageParam: (page) => page.nextCursor }),
    enabled: Boolean(session?.sessionToken),
  });

  const exportMonth = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const from = localDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
      const result = await trpcClient.reports.exportCsv.mutate({ from, to: localDateKey(now) });
      await shareCsv(result.filename, result.csv);
    },
    onSuccess: () => haptic.success(),
    onError: () => haptic.error(),
  });

  const days = useMemo(() => {
    const rows = list.data?.pages.flatMap((page) => page.items) ?? [];
    const map = new Map<string, Row[]>();
    for (const tx of rows) {
      const key = localDateKey(tx.occurredAt);
      map.set(key, [...(map.get(key) ?? []), tx]);
    }
    return [...map];
  }, [list.data]);

  return (
    <Screen
      withTabBar
      header={{
        title: "History",
        subtitle: "All transactions",
        leading: null,
        large: true,
        right: exportMonth.isPending ? (
          <ActivityIndicator color="#141416" />
        ) : (
          <IconButton icon="download" label="Export this month as CSV" onPress={() => exportMonth.mutate()} />
        ),
      }}
    >
      <Field icon="search" placeholder="Search phone, name or ID" value={search} onChangeText={setSearch} />
      <ChipFilter
        value={type}
        onChange={setType}
        options={[
          { value: "ALL", label: "All" },
          { value: "CASH_OUT", label: "Cash-out" },
          { value: "CASH_IN", label: "Cash-in" },
        ]}
      />
      {team.data ? (
        <ChipFilter
          value={helper}
          onChange={setHelper}
          options={[{ value: "ALL", label: "Everyone" }, ...team.data.map((person) => ({ value: person.id, label: person.name }))]}
        />
      ) : null}

      <LiveState query={list}>
        {days.length === 0 ? (
          <View className="items-center py-12 gap-2">
            <Icon name="manage-search" size={40} className="text-line-strong" />
            <T weight="semibold" className="text-subtle">
              Nothing matches
            </T>
          </View>
        ) : (
          days.map(([day, rows], dayIndex) => {
            const usdOut = rows.filter((tx) => !tx.voidedAt && tx.currency === "USD" && tx.type === "CASH_OUT").reduce((sum, tx) => sum + tx.amount, 0);
            return (
              <View key={day} className="gap-1">
                <View className="flex-row justify-between px-1">
                  <T weight="heavy" className="text-[12px] text-subtle">
                    {day === localDateKey() ? `Today · ${dayLabel(rows[0]!.occurredAt)}` : dayLabel(rows[0]!.occurredAt)}
                  </T>
                  <T weight="bold" className="text-[12px] text-subtle">
                    {rows.length} · USD {amount(usdOut)} out
                  </T>
                </View>
                <View className="bg-white rounded-3xl border border-line px-3.5">
                  {rows.map((tx, index) => (
                    <TransactionRow
                      key={tx.id}
                      first={index === 0}
                      onPress={() => router.push({ pathname: "/transaction/[id]", params: { id: tx.id } })}
                      row={{
                        id: tx.id,
                        type: tx.type,
                        currency: tx.currency,
                        amount: tx.amount,
                        title: tx.customerName || maskPhone(tx.customerPhone),
                        subtitle: tx.voidedAt
                          ? `Cancelled by Coline · ${tx.voidReason ?? ""}`
                          : `${clock(tx.occurredAt)} · ${tx.servedBy.name}`,
                        status: statusOf(tx),
                      }}
                    />
                  ))}
                </View>
              </View>
            );
          })
        )}
        {list.hasNextPage ? (
          <Tap onPress={() => void list.fetchNextPage()} className="h-12 rounded-full bg-white border border-line items-center justify-center">
            {list.isFetchingNextPage ? (
              <ActivityIndicator color="#141416" />
            ) : (
              <T weight="heavy" className="text-[13px]">
                Load more
              </T>
            )}
          </Tap>
        ) : null}
      </LiveState>
    </Screen>
  );
}
