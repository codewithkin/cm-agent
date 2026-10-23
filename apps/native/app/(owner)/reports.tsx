import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { BarChart } from "@/components/owner/bar-chart";
import { LiveState } from "@/components/owner/live-state";
import { CurrencyBadge } from "@/components/ui/badges";
import { Button, IconButton } from "@/components/ui/button";
import { Avatar, Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { Segmented } from "@/components/ui/segmented";
import { T } from "@/components/ui/text";
import { amount, initials, localDateKey, monthLabel, wholeAmount } from "@/lib/format";
import { reportHtml, sharePdf } from "@/lib/export";
import { haptic } from "@/lib/motion";
import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";
import { trpc } from "@/utils/trpc";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(key: string, by: number) {
  const [year, month] = key.split("-").map(Number);
  return monthKey(new Date(year!, month! - 1 + by, 1));
}

/** C6 Monthly report · month in progress. "Day" opens the day report. */
export default function Reports() {
  const session = useObservable(sessionStore);
  const [month, setMonth] = useState(monthKey(new Date()));
  const [tab, setTab] = useState<"PEOPLE" | "CUSTOMERS">("PEOPLE");
  const report = useQuery({ ...trpc.reports.month.queryOptions({ month }), enabled: Boolean(session?.sessionToken) });
  const data = report.data;
  const thisMonth = month === monthKey(new Date());

  const handledUsd = data ? data.totals.USD.cashInValue + data.totals.USD.cashOutValue : 0;
  const todayIndex = data ? data.daily.findIndex((day) => day.date === localDateKey()) : -1;
  const lastDay = thisMonth && todayIndex >= 0 ? todayIndex + 1 : data?.daily.length ?? 0;
  const values = (data?.daily ?? [])
    .slice(0, lastDay)
    .map((day) => day.summary.USD.cashInValue + day.summary.USD.cashOutValue);

  const pdf = useMutation({
    mutationFn: async () => {
      if (!data) return;
      const html = reportHtml(`Monthly report · ${monthLabel(month)}`, `${data.totals.transactionCount} transactions · ${data.customerCount} customers`, [
        {
          heading: "Totals",
          rows: [
            ["", "Cash-in", "Cash-out", "Earned"],
            ...(["USD", "ZIG"] as const).map((currency) => [
              currency === "USD" ? "USD" : "ZiG",
              amount(data.totals[currency].cashInValue),
              amount(data.totals[currency].cashOutValue),
              amount(data.totals[currency].commission),
            ]),
          ],
        },
        {
          heading: "By person",
          rows: [["Person", "Done", "USD handled"], ...data.perHelper.map((row) => [row.name, String(row.summary.transactionCount), amount(row.summary.USD.cashInValue + row.summary.USD.cashOutValue)])],
        },
        {
          heading: "Shifts that didn't balance",
          rows: [["Shift", "Note"], ...data.varianceLog.map((row) => [`${row.openedBy.name} · ${row.deviceLabel}`, row.note ?? ""])],
        },
      ]);
      await sharePdf(html, `Monthly report ${month}`);
    },
    onSuccess: () => haptic.success(),
  });

  return (
    <Screen
      withTabBar
      header={{
        title: "Reports",
        subtitle: thisMonth ? `1–${new Date().getDate()} ${monthLabel(month).split(" ")[0]?.slice(0, 3)} so far` : monthLabel(month),
        leading: null,
        large: true,
        right: (
          <View className="flex-row gap-1.5">
            <IconButton icon="chevron-left" label="Previous month" onPress={() => setMonth(shiftMonth(month, -1))} />
            <IconButton icon="chevron-right" label="Next month" onPress={() => !thisMonth && setMonth(shiftMonth(month, 1))} />
          </View>
        ),
      }}
      footer={data ? <Button label="Save PDF" icon="picture-as-pdf" loading={pdf.isPending} onPress={() => pdf.mutate()} /> : undefined}
    >
      <Segmented
        value="MONTH"
        onChange={(value) => value === "DAY" && router.push("/report/day")}
        options={[
          { value: "DAY", label: "Day" },
          { value: "MONTH", label: "Month" },
        ]}
      />

      <LiveState query={report}>
        {data ? (
          <View key={month} className="gap-3">
            <Card index={1}>
              <T weight="bold" className="text-[12px] text-subtle">
                Money handled · USD
              </T>
              <T weight="heavy" className="text-[34px] tracking-tight">
                {amount(handledUsd)}
              </T>
              <BarChart
                values={values}
                highlightIndex={thisMonth ? values.length - 1 : undefined}
                startLabel={`1 ${monthLabel(month).slice(0, 3)}`}
                endLabel={thisMonth ? "Today" : `${values.length} ${monthLabel(month).slice(0, 3)}`}
              />
            </Card>

            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: "PEOPLE", label: "People" },
                { value: "CUSTOMERS", label: `Customers ${data.customerCount}` },
              ]}
            />

            {tab === "PEOPLE" ? (
              <Card index={2} className="gap-2">
                <View className="flex-row border-b border-line pb-2">
                  <T weight="heavy" className="flex-1 text-[11px] text-subtle">
                    PERSON
                  </T>
                  <T weight="heavy" className="w-14 text-right text-[11px] text-subtle">
                    DONE
                  </T>
                  <T weight="heavy" className="w-28 text-right text-[11px] text-subtle">
                    VALUE
                  </T>
                </View>
                {data.perHelper.map((row, index) => (
                  <View key={row.userId} className="flex-row items-center">
                    <View className="flex-1 flex-row items-center gap-2">
                      <Avatar label={initials(row.name)} size={28} />
                      <T weight="bold" className="text-[13px]">
                        {row.name}
                      </T>
                    </View>
                    <T weight="heavy" className="w-14 text-right">
                      {row.summary.transactionCount}
                    </T>
                    <T weight="heavy" className="w-28 text-right">
                      USD {wholeAmount(row.summary.USD.cashInValue + row.summary.USD.cashOutValue)}
                    </T>
                  </View>
                ))}
                <View className="flex-row items-center border-t border-line pt-2">
                  <T weight="heavy" className="flex-1">
                    Total
                  </T>
                  <T weight="heavy" className="w-14 text-right">
                    {data.totals.transactionCount}
                  </T>
                  <T weight="heavy" className="w-28 text-right">
                    USD {wholeAmount(handledUsd)}
                  </T>
                </View>
              </Card>
            ) : (
              <Card index={2} title="Top customers">
                {data.topCustomers.map((customer, index) => (
                  <View key={customer.phone} className="flex-row items-center gap-2">
                    <Avatar label={initials(customer.name)} size={28} />
                    <T weight="bold" className="flex-1 text-[13px]">
                      {customer.name}
                    </T>
                    <T weight="heavy">{customer.count} visits</T>
                  </View>
                ))}
              </Card>
            )}

            <Card index={3} title="Earned this month">
              <View className="flex-row gap-2">
                {(["USD", "ZIG"] as const).map((currency) => (
                  <View key={currency} className="flex-1 flex-row items-center gap-1.5 p-3 rounded-2xl bg-leaf-soft">
                    <CurrencyBadge currency={currency} />
                    <T weight="heavy" className="text-leaf">
                      {amount(data.totals[currency].commission)}
                    </T>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        ) : null}
      </LiveState>
    </Screen>
  );
}
