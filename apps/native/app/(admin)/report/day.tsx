import { useMutation, useQuery } from "@tanstack/react-query";
import { cn } from "heroui-native";
import { useMemo, useState } from "react";
import { ScrollView, Share, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { LiveState } from "@/components/owner/live-state";
import { CurrencyBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Avatar, Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { Tap } from "@/components/ui/tap";
import { T } from "@/components/ui/text";
import { amount, clock, initials, localDateKey, monthLabel, wholeAmount } from "@/lib/format";
import { reportHtml, sharePdf } from "@/lib/export";
import { DURATION, enterUp, haptic } from "@/lib/motion";
import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";
import { trpc } from "@/utils/trpc";

const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];

/** The last 14 days, today last, for the day strip. */
function recentDays() {
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - 13 + index);
    return date;
  });
}

/** C3 Day report: totals, money start → end, by person; save or share as PDF. */
export default function DayReport() {
  const session = useObservable(sessionStore);
  const days = useMemo(recentDays, []);
  const [date, setDate] = useState(localDateKey());
  const report = useQuery({ ...trpc.reports.day.queryOptions({ date }), enabled: Boolean(session?.sessionToken) });
  const data = report.data;

  const money = useMemo(() => {
    if (!data) return null;
    const { shifts } = data;
    const sum = (pick: (row: (typeof shifts)[number]) => number) => shifts.reduce((total, row) => total + pick(row), 0);
    return (
      [
        ["USD cash", "cashUsd"],
        ["USD EcoCash", "floatUsd"],
        ["ZiG cash", "cashZig"],
        ["ZiG EcoCash", "floatZig"],
      ] as const
    ).map(([label, key]) => ({
      label,
      start: sum((row) => row.opening[key]),
      end: sum((row) => (row.counted ?? row.expected)[key]),
    }));
  }, [data]);

  function html() {
    if (!data || !money) return "";
    return reportHtml(`Day report · ${date}`, `${data.shifts.length} shifts · ${data.totals.transactionCount} transactions`, [
      {
        heading: "Totals",
        rows: [
          ["", "Cash-in", "Cash-out", "Earned"],
          ...(["USD", "ZIG"] as const).map((currency) => [
            currency === "USD" ? "USD" : "ZiG",
            `${amount(data.totals[currency].cashInValue)} · ${data.totals[currency].cashInCount}`,
            `${amount(data.totals[currency].cashOutValue)} · ${data.totals[currency].cashOutCount}`,
            amount(data.totals[currency].commission),
          ]),
        ],
      },
      { heading: "Money", rows: [["", "Start", "End"], ...money.map((row) => [row.label, amount(row.start), amount(row.end)])] },
      {
        heading: "By person",
        rows: [["Person", "Done", "USD handled"], ...data.perHelper.map((row) => [row.name, String(row.summary.transactionCount), amount(row.summary.USD.cashInValue + row.summary.USD.cashOutValue)])],
      },
    ]);
  }

  const pdf = useMutation({ mutationFn: () => sharePdf(html(), `Day report ${date}`), onSuccess: () => haptic.success() });

  async function shareText() {
    if (!data) return;
    await Share.share({
      message: `Day report ${date}: ${data.totals.transactionCount} transactions. Earned USD ${amount(data.totals.USD.commission)} · ZiG ${amount(data.totals.ZIG.commission)}.`,
    });
  }

  return (
    <Screen
      header={{ title: "Day report", subtitle: monthLabel(date.slice(0, 7)) }}
      footer={
        data ? (
          <View className="flex-row gap-2">
            <Button label="Save PDF" icon="picture-as-pdf" variant="outline" className="flex-1" loading={pdf.isPending} onPress={() => pdf.mutate()} />
            <Button label="Share" icon="share" className="flex-1" onPress={shareText} />
          </View>
        ) : undefined
      }
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {days.map((day) => {
          const key = localDateKey(day);
          const active = key === date;
          return (
            <Tap
              key={key}
              scaleTo={0.9}
              onPress={() => setDate(key)}
              className={cn("w-11 h-16 rounded-2xl items-center justify-center gap-0.5", active ? "bg-ink" : "bg-white border border-line")}
            >
              <T weight="bold" className={cn("text-[11px]", active ? "text-white/70" : "text-subtle")}>
                {WEEKDAY[day.getDay()]}
              </T>
              <T weight="heavy" className={active ? "text-white" : "text-ink"}>
                {day.getDate()}
              </T>
            </Tap>
          );
        })}
      </ScrollView>

      <LiveState query={report}>
        {data && money ? (
          <Animated.View key={date} entering={FadeIn.duration(DURATION.base)} className="gap-3">
            <Card index={0} className="bg-ink border-0">
              <T weight="heavy" className="text-white text-[18px]">
                {data.shifts.length} shifts · {data.totals.transactionCount} transactions
              </T>
              <View className="flex-row flex-wrap gap-2">
                {data.shifts.map((row) => (
                  <View key={row.id} className="flex-row items-center gap-1.5 h-7 px-2 rounded-full bg-white/10">
                    <Avatar label={initials(row.openedBy.name)} size={20} />
                    <T weight="bold" className="text-[12px] text-white">
                      {clock(row.openedAt)}–{row.closedAt ? clock(row.closedAt) : "now"}
                    </T>
                  </View>
                ))}
              </View>
            </Card>

            <Card
              index={1}
              title="Totals"
              action={
                <View className="flex-row items-center gap-1 px-2 h-6 rounded-full bg-leaf-soft">
                  <Icon name="savings" size={13} className="text-leaf" />
                  <T weight="heavy" className="text-[10px] text-leaf">
                    Earned USD {amount(data.totals.USD.commission)} · ZiG {amount(data.totals.ZIG.commission)}
                  </T>
                </View>
              }
            >
              <View className="flex-row">
                <View className="w-14" />
                <T weight="heavy" className="flex-1 text-right text-[11px] text-subtle">
                  CASH-IN
                </T>
                <T weight="heavy" className="flex-1 text-right text-[11px] text-subtle">
                  CASH-OUT
                </T>
              </View>
              {(["USD", "ZIG"] as const).map((currency) => (
                <View key={currency} className="flex-row items-center border-t border-line pt-2">
                  <View className="w-14">
                    <CurrencyBadge currency={currency} />
                  </View>
                  <T weight="heavy" className="flex-1 text-right text-[13px]">
                    {amount(data.totals[currency].cashInValue)} · {data.totals[currency].cashInCount}
                  </T>
                  <T weight="heavy" className="flex-1 text-right text-[13px]">
                    {amount(data.totals[currency].cashOutValue)} · {data.totals[currency].cashOutCount}
                  </T>
                </View>
              ))}
            </Card>

            <Card index={2} title="Money">
              <View className="flex-row">
                <View className="flex-1" />
                <T weight="heavy" className="w-24 text-right text-[11px] text-subtle">
                  START
                </T>
                <T weight="heavy" className="w-24 text-right text-[11px] text-subtle">
                  END
                </T>
              </View>
              {money.map((row) => (
                <View key={row.label} className="flex-row items-center border-t border-line pt-2">
                  <T weight="bold" className="flex-1 text-[13px]">
                    {row.label}
                  </T>
                  <T weight="semibold" className="w-24 text-right text-[13px] text-subtle">
                    {amount(row.start)}
                  </T>
                  <T weight="heavy" className="w-24 text-right text-[13px]">
                    {amount(row.end)}
                  </T>
                </View>
              ))}
            </Card>

            <Card index={3} title="By person">
              {data.perHelper.map((row, index) => (
                <Animated.View key={row.userId} entering={enterUp(index)} className="flex-row items-center">
                  <View className="flex-1 flex-row items-center gap-2">
                    <Avatar label={initials(row.name)} size={28} />
                    <T weight="bold" className="text-[13px]">
                      {row.name}
                    </T>
                  </View>
                  <T weight="heavy" className="w-12 text-right">
                    {row.summary.transactionCount}
                  </T>
                  <T weight="heavy" className="w-28 text-right">
                    USD {wholeAmount(row.summary.USD.cashInValue + row.summary.USD.cashOutValue)}
                  </T>
                </Animated.View>
              ))}
              {data.perHelper.length === 0 ? (
                <T weight="semibold" className="text-subtle text-[13px]">
                  No transactions this day.
                </T>
              ) : null}
            </Card>
          </Animated.View>
        ) : null}
      </LiveState>
    </Screen>
  );
}
