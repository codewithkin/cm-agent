import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { cn } from "heroui-native";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { BarChart } from "@/components/owner/bar-chart";
import { LiveState } from "@/components/owner/live-state";
import { CurrencyBadge } from "@/components/ui/badges";
import { Button, IconButton } from "@/components/ui/button";
import { Avatar, Banner, Card } from "@/components/ui/card";
import { ChipFilter } from "@/components/ui/chip-filter";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { amount, clock, dayLabel, initials, wholeAmount } from "@/lib/format";
import { sharePdf } from "@/lib/export";
import {
  answers,
  changeLabel,
  hourLabel,
  keyDate,
  moneyPair,
  PERIODS,
  periodDates,
  rangeLabel,
  WEEKDAYS,
  type Insights,
  type PeriodKey,
} from "@/lib/insights";
import { useLocalSettings } from "@/lib/local-db";
import { haptic } from "@/lib/motion";
import { useObservable } from "@/lib/observable";
import { insightsPdfHtml } from "@/lib/report-pdf";
import { sessionStore } from "@/lib/session";
import { trpc } from "@/utils/trpc";

/** "+12% vs Mon 12 Oct – Sun 18 Oct", green when up, red when down. */
function Change({ value, versus }: { value: number | null; versus: string }) {
  const label = changeLabel(value);
  if (!label) return null;
  return (
    <T weight="bold" className={cn("text-[12px]", value! > 0 ? "text-leaf" : value! < 0 ? "text-alarm-ink" : "text-subtle")}>
      {label} vs {versus}
    </T>
  );
}

function Earned({ data }: { data: Insights }) {
  const versus = rangeLabel(data.previous.from, data.previous.to);
  const handledUsd = data.totals.USD.cashInValue + data.totals.USD.cashOutValue;
  const handledZig = data.totals.ZIG.cashInValue + data.totals.ZIG.cashOutValue;
  return (
    <Card title="How much did I make?">
      <View className="flex-row gap-2">
        {(["USD", "ZIG"] as const).map((currency) => (
          <View key={currency} className="flex-1 p-3 rounded-2xl bg-leaf-soft gap-1">
            <CurrencyBadge currency={currency} />
            <T weight="heavy" className="text-[22px] text-leaf">
              {amount(data.totals[currency].commission)}
            </T>
            <Change value={currency === "USD" ? data.change.commissionUsd : data.change.commissionZig} versus={versus} />
          </View>
        ))}
      </View>
      <T weight="semibold" className="text-ink-soft">
        {data.totals.transactionCount} transactions · handled USD {wholeAmount(handledUsd)} and ZiG {wholeAmount(handledZig)}
      </T>
      {data.days > 1 ? (
        <BarChart
          height={90}
          values={data.daily.map((day) => day.count)}
          startLabel={dayLabel(keyDate(data.from))}
          endLabel={dayLabel(keyDate(data.to))}
        />
      ) : null}
      {data.bestDay && data.days > 1 ? (
        <View className="flex-row items-center gap-2 p-3 rounded-2xl bg-sun-soft">
          <Icon name="emoji-events" size={20} className="text-sun-ink" />
          <T weight="bold" className="flex-1 text-[13px] text-sun-ink">
            Best day: {dayLabel(keyDate(data.bestDay.date))} · {data.bestDay.count} transactions · earned{" "}
            {moneyPair(data.bestDay.commissionUsd, data.bestDay.commissionZig)}
          </T>
        </View>
      ) : null}
    </Card>
  );
}

function Missing({ data, text }: { data: Insights; text: string }) {
  const { missing } = data;
  const short = missing.shortShifts > 0;
  return (
    <Card title="Is any money missing?">
      <Banner tone={short ? "danger" : missing.closedShifts ? "leaf" : "lilac"} icon={short ? "warning" : "check-circle"} text={text} />
      {missing.worst.map((row) => (
        <View key={row.shiftId} className="flex-row items-start gap-2">
          <Avatar label={initials(row.name)} size={28} />
          <View className="flex-1">
            <T weight="bold" className="text-[13px]">
              {row.name} · {row.deviceLabel}
            </T>
            <T weight="semibold" className="text-[12px] text-subtle">
              {row.closedAt ? `${dayLabel(row.closedAt)} ${clock(row.closedAt)}` : ""}
              {row.note ? ` · ${row.note}` : ""}
            </T>
          </View>
          <T weight="heavy" className="text-alarm-ink text-[13px]">
            −{moneyPair(row.shortUsd, row.shortZig)}
          </T>
        </View>
      ))}
    </Card>
  );
}

function People({ data }: { data: Insights }) {
  return (
    <Card title="Who did what?">
      {data.people.length === 0 ? (
        <T weight="semibold" className="text-subtle">
          No transactions in this period.
        </T>
      ) : null}
      {data.people.map((row, index) => (
        <View key={row.userId} className={cn("gap-1.5", index > 0 && "pt-3 border-t border-line")}>
          <View className="flex-row items-center gap-2">
            <Avatar label={initials(row.name)} size={28} />
            <T weight="heavy" className="flex-1">
              {row.name}
            </T>
            <T weight="heavy">{row.count} done</T>
          </View>
          <T weight="semibold" className="text-[12px] text-ink-soft">
            Handled USD {wholeAmount(row.valueUsd)} · ZiG {wholeAmount(row.valueZig)} · earned{" "}
            {moneyPair(row.commissionUsd, row.commissionZig)}
          </T>
          <View className="flex-row flex-wrap gap-1.5">
            <View className={cn("px-2 h-6 rounded-full justify-center", row.problems ? "bg-amber-soft" : "bg-leaf-soft")}>
              <T weight="heavy" className={cn("text-[11px]", row.problems ? "text-amber-ink" : "text-leaf")}>
                {row.problems ? `${row.problems} to check` : "No problems"}
              </T>
            </View>
            <View className={cn("px-2 h-6 rounded-full justify-center", row.shortShifts ? "bg-alarm-soft" : "bg-leaf-soft")}>
              <T weight="heavy" className={cn("text-[11px]", row.shortShifts ? "text-alarm-ink" : "text-leaf")}>
                {row.shortShifts
                  ? `${row.shortShifts} short shift${row.shortShifts === 1 ? "" : "s"} · ${moneyPair(row.shortUsd, row.shortZig)}`
                  : row.shifts
                    ? `${row.shifts} shift${row.shifts === 1 ? "" : "s"} balanced`
                    : "No closed shifts"}
              </T>
            </View>
          </View>
        </View>
      ))}
    </Card>
  );
}

function Busy({ data, text }: { data: Insights; text: string }) {
  const first = data.hours.findIndex((count) => count > 0);
  const last = 23 - [...data.hours].reverse().findIndex((count) => count > 0);
  return (
    <Card title="When is it busy?">
      <T weight="semibold" className="text-ink-soft">
        {text}
      </T>
      {first >= 0 && last > first ? (
        <BarChart
          height={80}
          values={data.hours.slice(first, last + 1)}
          highlightIndex={data.busiestHour === null ? undefined : data.busiestHour - first}
          startLabel={hourLabel(first).slice(0, 5)}
          endLabel={hourLabel(last).slice(6)}
        />
      ) : null}
      {data.days >= 7 ? (
        <View className="flex-row gap-1">
          {WEEKDAYS.map((day, index) => (
            <View
              key={day}
              className={cn("flex-1 items-center py-2 rounded-xl", index === data.busiestWeekday ? "bg-ink" : "bg-page")}
            >
              <T weight="heavy" className={cn("text-[11px]", index === data.busiestWeekday ? "text-sun" : "text-subtle")}>
                {day.slice(0, 3)}
              </T>
              <T weight="heavy" className={cn("text-[13px]", index === data.busiestWeekday && "text-white")}>
                {data.weekdays[index]}
              </T>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function Needs({ lines }: { lines: string[] }) {
  return (
    <Card title="How much cash and EcoCash do I need?">
      {lines.length === 0 ? (
        <T weight="semibold" className="text-subtle">
          Not enough transactions to tell yet.
        </T>
      ) : (
        lines.map((line) => (
          <View key={line} className="flex-row items-start gap-2">
            <Icon name={line.includes("EcoCash") ? "phone-android" : "payments"} size={18} className="text-ink-soft mt-0.5" />
            <T weight="bold" className="flex-1 text-[13px]">
              {line}
            </T>
          </View>
        ))
      )}
      <T weight="semibold" className="text-[11px] text-subtle">
        From the busiest stretch of each day: how far cash or EcoCash went down before money came back in.
      </T>
    </Card>
  );
}

function Customers({ data, text }: { data: Insights; text: string }) {
  return (
    <Card title="Who are my customers?">
      <T weight="semibold" className="text-ink-soft">
        {text}
      </T>
      {data.customers.top.map((customer) => (
        <View key={customer.phone} className="flex-row items-center gap-2">
          <Avatar label={initials(customer.name)} size={28} />
          <T weight="bold" numberOfLines={1} className="flex-1 text-[13px]">
            {customer.name}
          </T>
          <T weight="heavy" className="text-[13px]">
            {customer.count} visit{customer.count === 1 ? "" : "s"}
          </T>
        </View>
      ))}
    </Card>
  );
}

function Largest({ data }: { data: Insights }) {
  if (data.largest.length === 0) return null;
  return (
    <Card title="Biggest transactions" action={<T weight="semibold" className="text-[11px] text-subtle">Top 3 per currency</T>}>
      {data.largest.map((tx) => (
        <View key={tx.id} className="flex-row items-center gap-2">
          <View className="flex-1">
            <T weight="bold" numberOfLines={1} className="text-[13px]">
              {tx.customerName}
            </T>
            <T weight="semibold" className="text-[12px] text-subtle">
              {tx.type === "CASH_IN" ? "Cash-in" : "Cash-out"} · {dayLabel(tx.occurredAt)} {clock(tx.occurredAt)} · {tx.servedBy}
            </T>
          </View>
          <CurrencyBadge currency={tx.currency} />
          <T weight="heavy" className="text-[13px]">
            {amount(tx.amount)}
          </T>
        </View>
      ))}
    </Card>
  );
}

function ToCheck({ data }: { data: Insights }) {
  const { problems } = data;
  const rows = [
    { label: "No SMS", count: problems.noSms },
    { label: "SMS didn't match", count: problems.mismatch },
    { label: "Typed in by hand", count: problems.manual },
    { label: "Reported", count: problems.flagged },
    { label: "Cancelled", count: problems.voided },
    { label: "Edited", count: problems.edited },
  ].filter((row) => row.count > 0);
  return (
    <Card
      title="Anything to check?"
      action={rows.length ? <Button size="sm" variant="caution" label="Review" onPress={() => router.push("/review")} /> : undefined}
    >
      {rows.length === 0 ? (
        <Banner tone="leaf" icon="check-circle" text="Nothing to check in this period." />
      ) : (
        <View className="flex-row flex-wrap gap-1.5">
          {rows.map((row) => (
            <View key={row.label} className="flex-row items-center gap-1 px-2.5 h-7 rounded-full bg-amber-soft">
              <T weight="heavy" className="text-[12px] text-amber-ink">
                {row.label} · {row.count}
              </T>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

/** C6 Reports: pick a period; each card answers one question Coline asks. Save it all as a PDF. */
export default function Reports() {
  const session = useObservable(sessionStore);
  const settings = useLocalSettings();
  const [period, setPeriod] = useState<PeriodKey>("TODAY");
  const { from, to } = useMemo(() => periodDates(period), [period]);
  const report = useQuery({
    ...trpc.reports.insights.queryOptions({ from, to }),
    enabled: Boolean(session?.sessionToken),
  });
  const data = report.data;
  const text = data ? answers(data) : null;
  const businessName =
    settings?.businessName && settings.businessName !== "[Business name]" ? settings.businessName : "Coline Murahwa";

  const pdf = useMutation({
    mutationFn: async () => {
      if (!data) return;
      await sharePdf(insightsPdfHtml(data, businessName), `Report ${from} to ${to}`);
    },
    onSuccess: () => haptic.success(),
    onError: () => haptic.error(),
  });

  return (
    <Screen
      withTabBar
      header={{
        title: "Reports",
        subtitle: rangeLabel(from, to),
        leading: null,
        large: true,
        right: <IconButton icon="event-note" label="Day report" onPress={() => router.push("/report/day")} />,
      }}
      footer={
        data ? (
          <Button label="Save or share PDF" icon="picture-as-pdf" loading={pdf.isPending} onPress={() => pdf.mutate()} />
        ) : undefined
      }
    >
      <ChipFilter options={PERIODS} value={period} onChange={setPeriod} />
      {pdf.isError ? <Banner tone="danger" icon="error" text="Couldn't make the PDF. Try again." /> : null}

      <LiveState query={report}>
        {data && text ? (
          <View className="gap-3">
            <Earned data={data} />
            <Missing data={data} text={text.missingText} />
            <People data={data} />
            <Busy data={data} text={text.busyText} />
            <Needs lines={text.needLines} />
            <Customers data={data} text={text.customerText} />
            <Largest data={data} />
            <ToCheck data={data} />
          </View>
        ) : null}
      </LiveState>
    </Screen>
  );
}
