import { useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { StatusChip } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Avatar, Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { T } from "@/components/ui/text";
import { initials, prettyPhone } from "@/lib/format";
import { useRows, type LocalSms } from "@/lib/local-db";
import { enterUp, exitFade, haptic, layout } from "@/lib/motion";

import { draftPhone, type Draft } from "./draft";

/**
 * B4 Customer: a saved customer is confirmed out loud ("Is your name Rudo Moyo?");
 * a new one is typed in. The EcoCash reference comes from the SMS when there is one.
 */
export function CustomerStep({
  draft,
  update,
  sms,
}: {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  sms: LocalSms | null;
}) {
  const phone = draftPhone(draft);
  const saved = useRows("customers", (customer) => customer.phone === phone, undefined, [phone])[0];
  const visits = useRows("transactions", (tx) => tx.customerPhone === phone && !tx.voidedAt, undefined, [phone]).length;
  const [confirmed, setConfirmed] = useState(false);
  const [editing, setEditing] = useState(!saved);

  function confirmSaved() {
    if (!saved) return;
    haptic.success();
    update({ name: saved.name ?? draft.name, idNumber: saved.idNumber ?? draft.idNumber });
    setConfirmed(true);
    setEditing(!saved.idNumber);
  }

  return (
    <View className="gap-3">
      {saved && !editing ? (
        <Card index={1} title="Customer" action={<T weight="bold" className="text-[12px] text-subtle">Saved · {visits} visits</T>}>
          <View className="flex-row items-center gap-3">
            <Avatar label={initials(saved.name ?? "?")} size={48} />
            <View className="flex-1">
              <T weight="heavy" className="text-[17px]">
                {saved.name}
              </T>
              <T weight="semibold" className="text-[13px] text-subtle">
                {prettyPhone(saved.phone)}
              </T>
            </View>
          </View>
          {confirmed ? (
            <Animated.View entering={enterUp(0)} className="flex-row items-center gap-2 p-3 rounded-2xl bg-leaf-soft">
              <Icon name="check-circle" size={20} className="text-leaf" />
              <T weight="heavy" className="text-leaf flex-1">
                Name confirmed
              </T>
              {saved.idNumber ? (
                <T weight="bold" className="text-[12px] text-leaf">
                  ID {saved.idNumber}
                </T>
              ) : null}
            </Animated.View>
          ) : (
            <Animated.View exiting={exitFade} layout={layout} className="p-3 rounded-2xl bg-sun-soft gap-3">
              <View className="flex-row items-center gap-2">
                <Icon name="record-voice-over" size={20} className="text-sun-ink" />
                <T weight="heavy" className="text-sun-ink flex-1">
                  Ask: "Is your name {saved.name}?"
                </T>
              </View>
              <View className="flex-row gap-2">
                <Button variant="success" label="Yes, correct" icon="check" size="md" className="flex-1" onPress={confirmSaved} />
                <Button variant="caution" label="Change" icon="edit" size="md" onPress={() => setEditing(true)} />
              </View>
            </Animated.View>
          )}
        </Card>
      ) : (
        <Card index={1} title="Customer">
          <Field
            label="Mobile number"
            icon="call"
            prefix="+263"
            keyboardType="phone-pad"
            placeholder="77 123 4567"
            value={draft.phone.replace(/^\+263/, "")}
            onChangeText={(text) => {
              update({ phone: text });
              setEditing(true);
            }}
          />
          <Field label="Name" icon="person" placeholder="As on their ID" value={draft.name} onChangeText={(name) => update({ name })} autoCapitalize="words" />
          <Field
            label="ID or passport number"
            icon="badge"
            placeholder="e.g. 63-123456 F 42"
            autoCapitalize="characters"
            value={draft.idNumber}
            onChangeText={(idNumber) => update({ idNumber })}
          />
        </Card>
      )}

      <Card index={2} className="flex-row items-center gap-2 py-3">
        <Icon name="tag" size={20} className="text-subtle" />
        {sms?.reference ? (
          <>
            <T weight="bold" className="text-[13px] text-subtle">
              EcoCash ref
            </T>
            <T weight="heavy" className="flex-1 text-[13px]" numberOfLines={1}>
              {sms.reference}
            </T>
            <StatusChip status="MATCHED" />
          </>
        ) : (
          <View className="flex-1">
            <Field
              placeholder="EcoCash reference (optional)"
              autoCapitalize="characters"
              value={draft.reference}
              onChangeText={(reference) => update({ reference })}
            />
          </View>
        )}
      </Card>
    </View>
  );
}
