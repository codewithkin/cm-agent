import { normalizePhone } from "@cm-agent/api/lib/phone";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { SlideInLeft, SlideInRight, SlideOutLeft, SlideOutRight } from "react-native-reanimated";

import { NoShiftCard } from "@/components/booth/no-shift-card";
import { CustomerStep } from "@/components/transaction/customer-step";
import { customerReady, draftCents, draftPhone, EMPTY_DRAFT, type Draft } from "@/components/transaction/draft";
import { SignStep } from "@/components/transaction/sign-step";
import { SmsWait } from "@/components/transaction/sms-wait";
import { AmountDisplay, AmountKeys } from "@/components/ui/amount-entry";
import { CurrencyBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { Segmented } from "@/components/ui/segmented";
import { Stepper } from "@/components/ui/stepper";
import { T } from "@/components/ui/text";
import { recordTransaction } from "@/lib/actions";
import { useOpenShift, useShiftBalances, useUnrecordedSms } from "@/lib/booth";
import { deviceStore } from "@/lib/device";
import { amount, toDate } from "@/lib/format";
import { localDb } from "@/lib/local-db";
import { DURATION, enterUp, exitFade, haptic } from "@/lib/motion";
import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";

const STEPS = ["Amount", "Customer", "Sign"];
/** SMS received this long before the screen opened still count as "just arrived". */
const SMS_LOOKBACK_MS = 10 * 60 * 1000;

/** Fills the draft from an SMS (from the incoming sheet or the inbox). */
function draftFromSms(smsId: string): Draft {
  const sms = localDb.get().smsMessages[smsId];
  if (!sms) return EMPTY_DRAFT;
  const customer = Object.values(localDb.get().customers).find((row) => row.phone === sms.counterpartyPhone);
  return {
    ...EMPTY_DRAFT,
    smsId,
    type: sms.type ?? "CASH_OUT",
    currency: sms.currency ?? "USD",
    amountText: sms.amount !== null ? (sms.amount / 100).toFixed(2).replace(/\.00$/, "") : "",
    phone: sms.counterpartyPhone ?? "",
    name: customer?.name ?? sms.counterpartyName ?? "",
    idNumber: customer?.idNumber ?? "",
    reference: sms.reference ?? "",
  };
}

/** B4–B5 New transaction: amount (with the cash-out SMS gate), customer, signature. */
export default function NewTransaction() {
  const params = useLocalSearchParams<{ type?: Draft["type"]; smsId?: string }>();
  const session = useObservable(sessionStore);
  const device = useObservable(deviceStore);
  const shift = useOpenShift();
  const balances = useShiftBalances(shift);
  const unrecorded = useUnrecordedSms();
  const openedAt = useRef(new Date()).current;

  const [draft, setDraft] = useState<Draft>(() =>
    params.smsId ? draftFromSms(params.smsId) : { ...EMPTY_DRAFT, type: params.type ?? "CASH_OUT" },
  );
  const [step, setStep] = useState(params.smsId ? 1 : 0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [askingWhy, setAskingWhy] = useState(false);
  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const cents = draftCents(draft);
  const isOwner = session?.user.role === "OWNER";

  // Link the EcoCash SMS for this amount as soon as it arrives.
  const arrived = useMemo(() => {
    if (draft.smsId) return localDb.get().smsMessages[draft.smsId] ?? null;
    if (cents <= 0) return null;
    return (
      unrecorded.find(
        (sms) =>
          sms.type === draft.type &&
          sms.currency === draft.currency &&
          sms.amount === cents &&
          toDate(sms.receivedAt).getTime() >= openedAt.getTime() - SMS_LOOKBACK_MS,
      ) ?? null
    );
  }, [draft.smsId, draft.type, draft.currency, cents, unrecorded, openedAt]);

  useEffect(() => {
    if (!arrived || draft.smsId === arrived.id) return;
    haptic.success();
    const customer = Object.values(localDb.get().customers).find((row) => row.phone === arrived.counterpartyPhone);
    update({
      smsId: arrived.id,
      phone: arrived.counterpartyPhone ?? draft.phone,
      name: customer?.name ?? arrived.counterpartyName ?? draft.name,
      idNumber: customer?.idNumber ?? draft.idNumber,
      reference: arrived.reference ?? draft.reference,
    });
  }, [arrived]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!session || !device) return null;

  if (!shift) {
    return (
      <Screen header={{ title: "New transaction", subtitle: device.label, leading: "close" }}>
        <NoShiftCard
          isOwner={isOwner}
          onStart={() =>
            router.replace(isOwner ? "/shift/start" : { pathname: "/owner-pin", params: { next: "start" } })
          }
        />
      </Screen>
    );
  }

  const cashOut = draft.type === "CASH_OUT";
  const waitingForSms = cashOut && !arrived && !draft.manual;
  const cashKey = draft.currency === "USD" ? "cashUsd" : "cashZig";
  const cashAfter = balances ? balances[cashKey] + (cashOut ? -cents : cents) : null;

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  function save() {
    if (!shift || !draft.signature) return;
    const phone = normalizePhone(draft.phone);
    if (!phone) return;
    const saved = recordTransaction(shift, {
      type: draft.type,
      currency: draft.currency,
      amount: cents,
      customerPhone: phone,
      customerName: draft.name.trim(),
      customerIdNumber: draft.idNumber.trim(),
      reference: draft.reference.trim() || undefined,
      signature: draft.signature,
      smsId: draft.smsId ?? undefined,
      manual: draft.manual,
      note: draft.note.trim() || undefined,
    });
    haptic.success();
    router.replace({ pathname: "/transaction/saved", params: { id: saved.id } });
  }

  const footer =
    step === 0 ? (
      waitingForSms ? (
        <>
          <Button label="Wait for the SMS to pay" icon="lock" disabled />
          <Button label="Save without SMS" icon="flag" variant="ghost" size="md" disabled={cents <= 0} onPress={() => setAskingWhy(true)} />
        </>
      ) : (
        <Button label="Next: customer" icon="arrow-forward" disabled={cents <= 0} onPress={() => go(1)} />
      )
    ) : step === 1 ? (
      <Button label="Next: customer signs" icon="draw" disabled={!customerReady(draft)} onPress={() => go(2)} />
    ) : (
      <Button label="Save" icon="check" disabled={!draft.signature || !draftPhone(draft)} onPress={save} />
    );

  const enter = direction === 1 ? SlideInRight : SlideInLeft;
  const exit = direction === 1 ? SlideOutLeft : SlideOutRight;

  return (
    <Screen
      header={{
        title: step === 2 ? "Customer signs" : "New transaction",
        subtitle: device.label,
        leading: step === 0 ? "close" : "back",
        onLeading: step === 0 ? undefined : () => go(step - 1),
      }}
      footer={footer}
    >
      <Stepper steps={STEPS} current={step} />

      <Animated.View key={step} entering={enter.duration(DURATION.base)} exiting={exit.duration(DURATION.fast)} className="gap-3">
        {step === 0 ? (
          <>
            <View className="flex-row gap-2">
              <Segmented
                className="flex-[1.6]"
                value={draft.type}
                onChange={(type) => update({ type, smsId: null })}
                options={[
                  { value: "CASH_IN", label: "Cash-in", icon: "south-west", activeClass: "bg-sun", activeText: "text-ink" },
                  { value: "CASH_OUT", label: "Cash-out", icon: "north-east" },
                ]}
              />
              <Segmented
                className="flex-1"
                value={draft.currency}
                onChange={(currency) => update({ currency, smsId: null })}
                options={[
                  { value: "USD", label: "USD" },
                  { value: "ZIG", label: "ZiG", activeClass: "bg-sun", activeText: "text-ink" },
                ]}
              />
            </View>

            {cashOut && cents > 0 && !draft.manual ? (
              <SmsWait received={arrived} waitingSince={openedAt} currency={draft.currency} cents={cents} />
            ) : null}
            {draft.manual ? (
              <Animated.View entering={enterUp(0)} className="flex-row items-center gap-2 p-3 rounded-2xl bg-line">
                <Icon name="flag" size={18} className="text-ink-soft" />
                <T weight="bold" className="flex-1 text-[13px] text-ink-soft">
                  Saving without SMS · Coline will check it
                </T>
              </Animated.View>
            ) : null}

            <AmountDisplay text={draft.amountText} currency={draft.currency} />
            {isOwner && cashAfter !== null && cents > 0 ? (
              <Animated.View entering={enterUp(0)} exiting={exitFade} className="flex-row items-center justify-center gap-1.5">
                <Icon name="payments" size={16} className={cashAfter < 0 ? "text-alarm" : "text-subtle"} />
                <T weight="bold" className={cashAfter < 0 ? "text-[13px] text-alarm" : "text-[13px] text-subtle"}>
                  Cash left after:
                </T>
                <CurrencyBadge currency={draft.currency} />
                <T weight="heavy" className="text-[13px]">
                  {amount(cashAfter)}
                </T>
              </Animated.View>
            ) : null}

            {askingWhy ? (
              <Card index={0} className="bg-amber-soft border-0">
                <T weight="heavy" className="text-amber-ink">
                  Why is there no SMS?
                </T>
                <Field placeholder="e.g. Customer's phone was off" value={draft.note} onChangeText={(note) => update({ note })} autoFocus />
                <View className="flex-row gap-2">
                  <Button label="Cancel" variant="light" size="md" className="flex-1" onPress={() => setAskingWhy(false)} />
                  <Button
                    label="Continue"
                    size="md"
                    className="flex-1"
                    disabled={draft.note.trim().length === 0}
                    onPress={() => {
                      haptic.warning();
                      update({ manual: true });
                      setAskingWhy(false);
                      go(1);
                    }}
                  />
                </View>
              </Card>
            ) : (
              <AmountKeys text={draft.amountText} onChange={(amountText) => update({ amountText, smsId: null })} />
            )}
          </>
        ) : null}

        {step === 1 ? (
          <>
            {cashOut && arrived ? (
              <SmsWait received={arrived} waitingSince={openedAt} currency={draft.currency} cents={cents} />
            ) : null}
            <CustomerStep draft={draft} update={update} sms={arrived} />
          </>
        ) : null}

        {step === 2 ? <SignStep draft={draft} update={update} /> : null}
      </Animated.View>
    </Screen>
  );
}
