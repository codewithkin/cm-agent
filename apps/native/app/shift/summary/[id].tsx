import { router, useLocalSearchParams } from "expo-router";
import { Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CurrencyBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { T } from "@/components/ui/text";
import { useShiftTransactions, useSummary } from "@/lib/booth";
import { deviceStore } from "@/lib/device";
import { amount, clock, dayLabel, duration, initials } from "@/lib/format";
import { localDb, useLocalSettings } from "@/lib/local-db";
import { useObservable } from "@/lib/observable";

/** B13 Shift summary: a card Coline can share on WhatsApp. */
export default function ShiftSummary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const tables = useObservable(localDb);
  const settings = useLocalSettings();
  const device = useObservable(deviceStore);
  const shift = tables.shifts[id];
  const transactions = useShiftTransactions(id);
  const summary = useSummary(transactions);

  if (!shift) return null;
  const helper = tables.users[shift.openedById];
  const live = transactions.filter((tx) => !tx.voidedAt);
  const customers = new Set(live.map((tx) => tx.customerPhone)).size;
  const problems = live.filter((tx) => tx.matchState === "NO_SMS" || tx.matchState === "MISMATCH" || tx.flaggedAt).length;
  const end = shift.closedAt ?? new Date();
  const businessName = settings?.businessName && settings.businessName !== "[Business name]" ? settings.businessName : "Coline Murahwa";

  async function share() {
    const lines = [
      `${businessName} · Shift summary ${dayLabel(shift!.openedAt)}`,
      `${helper?.name ?? ""} · ${clock(shift!.openedAt)}–${clock(end)} (${duration(shift!.openedAt, end)})`,
      `Transactions ${live.length} · Customers ${customers} · Problems ${problems}`,
      `USD: in ${amount(summary.USD.cashInValue)} · out ${amount(summary.USD.cashOutValue)}`,
      `ZiG: in ${amount(summary.ZIG.cashInValue)} · out ${amount(summary.ZIG.cashOutValue)}`,
      `Earned: USD ${amount(summary.USD.commission)} · ZiG ${amount(summary.ZIG.commission)}`,
    ];
    await Share.share({ message: lines.join("\n") });
  }

  return (
    <View className="flex-1 bg-sun px-4 gap-4" style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 12 }}>
      <View className="self-center flex-row items-center gap-1.5 h-9 px-3.5 rounded-full bg-ink">
        <Icon name="task-alt" size={18} className="text-sun" />
        <T weight="heavy" className="text-white">
          Shift ended
        </T>
      </View>

      <View className="flex-1 bg-white rounded-[28px] p-4 gap-4">
        <View className="flex-row items-center gap-3">
          <Avatar label="CM" owner />
          <View className="flex-1">
            <T weight="heavy">{businessName}</T>
            <T weight="semibold" className="text-[12px] text-subtle">
              Shift summary
            </T>
          </View>
          <T weight="heavy" className="text-[13px]">
            {dayLabel(shift.openedAt)}
          </T>
        </View>

        <View className="flex-row items-center gap-3 p-3 rounded-2xl bg-page">
          <Avatar label={initials(helper?.name ?? "?")} size={36} />
          <View className="flex-1">
            <T weight="heavy" className="text-[14px]">
              {helper?.name ?? "—"}{device?.id === shift.deviceId ? ` · ${device.label}` : ""}
            </T>
            <T weight="semibold" className="text-[12px] text-subtle">
              {clock(shift.openedAt)} – {clock(end)} · {duration(shift.openedAt, end)}
            </T>
          </View>
        </View>

        <View className="flex-row gap-2">
          {[
            ["Transactions", live.length],
            ["Customers", customers],
            ["Problems", problems],
          ].map(([label, value]) => (
            <View key={String(label)} className="flex-1 rounded-2xl bg-page p-2.5">
              <T weight="bold" className="text-[11px] text-subtle">
                {label}
              </T>
              <T weight="heavy" className="text-[20px]">
                {value}
              </T>
            </View>
          ))}
        </View>

        <View className="gap-2">
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
            <View key={currency} className="flex-row items-center py-1 border-t border-line">
              <View className="w-14">
                <CurrencyBadge currency={currency} />
              </View>
              <T weight="heavy" className="flex-1 text-right">
                {amount(summary[currency].cashInValue)}
              </T>
              <T weight="heavy" className="flex-1 text-right">
                {amount(summary[currency].cashOutValue)}
              </T>
            </View>
          ))}
          <View className="flex-row items-center justify-between p-3 rounded-2xl bg-leaf-soft">
            <T weight="heavy" className="text-leaf">
              Earned
            </T>
            <T weight="heavy" className="text-leaf">
              USD {amount(summary.USD.commission)} · ZiG {amount(summary.ZIG.commission)}
            </T>
          </View>
        </View>
      </View>

      <View className="flex-row gap-2">
        <Button label="Share" icon="share" variant="light" className="flex-1" onPress={share} />
        <Button variant="success" label="Done" icon="check" className="flex-1" onPress={() => router.dismissTo("/home")} />
      </View>
    </View>
  );
}
