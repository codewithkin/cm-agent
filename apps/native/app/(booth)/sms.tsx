import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { CurrencyBadge, StatusChip } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/card";
import { ChipFilter } from "@/components/ui/chip-filter";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { SyncChip } from "@/components/ui/sync-chip";
import { T } from "@/components/ui/text";
import { TypeTile } from "@/components/ui/transaction-row";
import { isUnrecordedSms } from "@/lib/booth";
import { deviceStore } from "@/lib/device";
import { amount, clock, localDateKey, maskPhone, toDate } from "@/lib/format";
import { useRows, type LocalSms } from "@/lib/local-db";
import { enterUp, exitFade, layout } from "@/lib/motion";
import { useObservable } from "@/lib/observable";
import { smsReaderStore } from "@/lib/sms";

type Tab = "NOT_SAVED" | "ALL" | "NO_MATCH";

function ago(date: Date) {
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} h ago`;
}

function SmsCard({ sms, index, unrecorded }: { sms: LocalSms; index: number; unrecorded: boolean }) {
  const [open, setOpen] = useState(false);
  const customer = useRows("customers", (row) => row.phone === sms.counterpartyPhone, undefined, [sms.counterpartyPhone])[0];
  const received = toDate(sms.receivedAt);
  return (
    <Animated.View entering={enterUp(index)} exiting={exitFade} layout={layout} className="bg-white rounded-3xl border border-line p-3.5 gap-3">
      <View className="flex-row items-center gap-3">
        <TypeTile type={sms.type ?? "CASH_OUT"} />
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            {sms.currency ? <CurrencyBadge currency={sms.currency} /> : null}
            <T weight="heavy" className="text-[18px]">
              {sms.amount !== null ? amount(sms.amount) : "—"}
            </T>
          </View>
          <T weight="semibold" className="text-[12px] text-subtle">
            {sms.type === "CASH_IN" ? "Cash-in" : "Cash-out"} · {clock(received)} · {ago(received)}
          </T>
        </View>
        <StatusChip status={unrecorded ? "NOT_SAVED" : "MATCHED"} />
      </View>
      <View className="flex-row items-center gap-2 px-3 py-2 rounded-2xl bg-page">
        <Icon name="person" size={16} className="text-subtle" />
        <T weight="bold" className="flex-1 text-[13px]">
          {customer?.name ?? sms.counterpartyName ?? "New customer"}
        </T>
        <T weight="bold" className="text-[13px] text-subtle">
          {sms.counterpartyPhone ? maskPhone(sms.counterpartyPhone) : ""}
        </T>
      </View>
      {sms.reference ? (
        <View className="flex-row items-center gap-2 px-1">
          <Icon name="tag" size={16} className="text-subtle" />
          <T weight="mono" className="text-[12px] text-ink-soft">
            {sms.reference}
          </T>
        </View>
      ) : null}
      {open ? (
        <Animated.View entering={enterUp(0)} exiting={exitFade} className="rounded-2xl bg-page p-3">
          <T weight="mono" className="text-[12px] text-ink-soft">
            {sms.body}
          </T>
        </Animated.View>
      ) : null}
      <View className="flex-row gap-2">
        <Button label={open ? "Hide SMS" : "View SMS"} variant="outline" size="md" className="flex-1" onPress={() => setOpen((value) => !value)} />
        {unrecorded ? (
          <Button
            variant="success"
            label="Save"
            icon="add"
            size="md"
            className="flex-1"
            onPress={() => router.push({ pathname: "/transaction/new", params: { smsId: sms.id } })}
          />
        ) : null}
      </View>
    </Animated.View>
  );
}

/** B9 SMS inbox: EcoCash SMS from today, the unsaved ones first. */
export default function SmsInbox() {
  const device = useObservable(deviceStore);
  const reader = useObservable(smsReaderStore);
  const [tab, setTab] = useState<Tab>("NOT_SAVED");
  const today = localDateKey();
  const all = useRows(
    "smsMessages",
    (sms) => sms.deviceId === device?.id && localDateKey(sms.receivedAt) === today && sms.parseStatus !== "BALANCE_ONLY",
    (a, b) => toDate(b.receivedAt).getTime() - toDate(a.receivedAt).getTime(),
    [device?.id, today],
  );
  const transactions = useRows("transactions", (tx) => tx.deviceId === device?.id, undefined, [device?.id]);
  const mismatched = new Set(transactions.filter((tx) => tx.matchState === "MISMATCH").map((tx) => tx.id));

  const notSaved = all.filter((sms) => isUnrecordedSms(sms, device?.id));
  const noMatch = all.filter((sms) => sms.transactionId && mismatched.has(sms.transactionId));
  const shown = tab === "NOT_SAVED" ? notSaved : tab === "NO_MATCH" ? noMatch : all;

  return (
    <Screen
      withTabBar
      header={{ title: "SMS inbox", subtitle: "EcoCash · today", leading: null, large: true, right: <SyncChip /> }}
    >
      {reader === "unavailable" ? (
        <Banner tone="amber" icon="sms-failed" text="This phone can't read SMS (Google Play services missing). Entries are typed in by hand." />
      ) : (
        <Banner tone="lilac" icon="touch-app" text="When an EcoCash SMS arrives, Android asks to share it. Tap Allow and it appears here." />
      )}
      <ChipFilter
        value={tab}
        onChange={setTab}
        options={[
          { value: "NOT_SAVED", label: "Not saved", count: notSaved.length },
          { value: "ALL", label: "All today", count: all.length },
          { value: "NO_MATCH", label: "No match", count: noMatch.length },
        ]}
      />
      {shown.length === 0 ? (
        <Animated.View entering={enterUp(1)} className="items-center py-12 gap-2">
          <Icon name="mark-chat-read" size={40} className="text-leaf-bright" />
          <T weight="heavy">{tab === "NOT_SAVED" ? "Every SMS today is saved" : "Nothing here"}</T>
        </Animated.View>
      ) : (
        shown.map((sms, index) => (
          <SmsCard key={sms.id} sms={sms} index={index} unrecorded={isUnrecordedSms(sms, device?.id)} />
        ))
      )}
    </Screen>
  );
}
