import { router } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CurrencyBadge } from "@/components/ui/badges";
import { Button, IconButton } from "@/components/ui/button";
import { Avatar, InfoRow } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Tap } from "@/components/ui/tap";
import { T } from "@/components/ui/text";
import { TypeTile } from "@/components/ui/transaction-row";
import { deviceStore } from "@/lib/device";
import { amount, initials, maskPhone } from "@/lib/format";
import { useRows } from "@/lib/local-db";
import { useObservable } from "@/lib/observable";
import { incomingSmsStore } from "@/lib/sms";

/** B3 Incoming SMS sheet: slides up over any booth screen when an EcoCash SMS arrives. */
export default function IncomingSms() {
  const insets = useSafeAreaInsets();
  const sms = useObservable(incomingSmsStore);
  const device = useObservable(deviceStore);
  const phone = sms?.counterpartyPhone;
  const customer = useRows("customers", (row) => row.phone === phone, undefined, [phone])[0];
  const visits = useRows("transactions", (tx) => tx.customerPhone === phone && !tx.voidedAt, undefined, [phone]).length;

  function close() {
    incomingSmsStore.set(null);
    router.back();
  }

  function save() {
    if (!sms) return;
    incomingSmsStore.set(null);
    router.replace({ pathname: "/transaction/new", params: { smsId: sms.id } });
  }

  if (!sms) return null;
  const name = customer?.name ?? sms.counterpartyName;

  return (
    <View className="flex-1 justify-end">
      <View
        className="absolute inset-0 bg-black/40"
      >
        <Tap feedback={false} scaleTo={1} className="flex-1" onPress={close} accessibilityLabel="Close" />
      </View>

      <View
        className="bg-page rounded-t-[32px] px-4 pt-3 gap-3"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <View className="self-center w-10 h-1 rounded-full bg-line-strong" />
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-lilac items-center justify-center">
            <Icon name="sms" size={20} className="text-lilac-ink" />
          </View>
          <View className="flex-1">
            <T weight="heavy">New EcoCash SMS</T>
            <T weight="semibold" className="text-[12px] text-subtle">
              Just now · {device?.label}
            </T>
          </View>
          <IconButton icon="close" label="Close" onPress={close} />
        </View>

        <View className="bg-ink rounded-3xl p-4 gap-3">
          <View className="flex-row items-center gap-2">
            <TypeTile type={sms.type ?? "CASH_OUT"} size={36} />
            <T weight="heavy" className="text-white">
              {sms.type === "CASH_IN" ? "Cash-in" : "Cash-out"}
            </T>
          </View>
          {sms.currency && sms.amount !== null ? (
            <View className="flex-row items-center gap-2">
              <CurrencyBadge currency={sms.currency} size="md" />
              <T weight="heavy" className="text-[34px] text-white">
                {amount(sms.amount)}
              </T>
            </View>
          ) : (
            <T weight="mono" className="text-[12px] text-white/80">
              {sms.body}
            </T>
          )}
        </View>

        {phone ? (
          <View className="flex-row items-center gap-3 bg-white rounded-3xl border border-line p-3">
            <Avatar label={initials(name ?? "New")} size={40} />
            <View className="flex-1">
              <T weight="heavy">{name ?? "New customer"}</T>
              <T weight="semibold" className="text-[12px] text-subtle">
                {visits > 0 ? `Came ${visits} times before` : "First time here"}
              </T>
            </View>
            {visits > 0 ? <Icon name="verified" size={20} className="text-leaf-bright" /> : null}
          </View>
        ) : null}

        <View className="bg-white rounded-3xl border border-line px-3.5">
          <View className="flex-row justify-between pt-3">
            <T weight="heavy" className="text-[11px] text-subtle">
              DETAIL
            </T>
            <T weight="heavy" className="text-[11px] text-subtle">
              FROM SMS
            </T>
          </View>
          <InfoRow label="Phone" value={phone ? maskPhone(phone) : "—"} />
          <InfoRow label="Reference" value={sms.reference ?? "—"} last />
        </View>

        <View className="flex-row gap-2">
          <Button label="Later" icon="schedule" variant="outline" className="flex-1" onPress={close} />
          <Button variant="success" label="Save it" icon="arrow-forward" className="flex-[1.4]" onPress={save} />
        </View>
      </View>
    </View>
  );
}
