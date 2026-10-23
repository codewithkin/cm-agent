import { parseSms } from "@cm-agent/api/lib/sms-parser";
import { router } from "expo-router";
import { useState } from "react";
import { TextInput, View } from "react-native";

import { CurrencyBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Banner, Card, InfoRow } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { FONT_FAMILY } from "@/lib/fonts";
import { amount } from "@/lib/format";
import { haptic } from "@/lib/motion";
import { savePastedSms } from "@/lib/sms";

/**
 * Paste an EcoCash SMS: for a message the app didn't catch (Deny was tapped,
 * or it arrived before the app was open). Saved like a received SMS, then
 * straight on to recording its transaction.
 */
export default function PasteSms() {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const parsed = body.trim() ? parseSms(body.trim()) : null;
  const readable = parsed && parsed.status !== "UNPARSED";

  function save() {
    const sms = savePastedSms(body);
    if (!sms) {
      haptic.error();
      setError("This doesn't read as an EcoCash SMS. Copy the whole message and try again.");
      return;
    }
    if (sms.transactionId) {
      haptic.warning();
      setError("This SMS is already saved with a transaction.");
      return;
    }
    haptic.success();
    router.replace({ pathname: "/transaction/new", params: { smsId: sms.id } });
  }

  return (
    <Screen
      header={{ title: "Paste an EcoCash SMS", subtitle: "For a message the app didn't catch", leading: "close" }}
      footer={<Button variant="success" label="Save and record it" icon="check" disabled={!readable} onPress={save} />}
    >
      <T weight="semibold" className="text-ink-soft">
        Open the SMS in Messages, long-press it, copy, then long-press below and paste.
      </T>
      <TextInput
        value={body}
        onChangeText={(text) => {
          setBody(text);
          setError(null);
        }}
        multiline
        autoFocus
        placeholder="Confirmed. You have received USD 20.00 from…"
        placeholderTextColor="#8A8780"
        textAlignVertical="top"
        className="min-h-[140px] p-4 rounded-2xl bg-white border-2 border-line text-[15px] text-ink"
        style={{ fontFamily: FONT_FAMILY.semibold }}
      />
      {error ? <Banner tone="danger" icon="error" text={error} /> : null}
      {parsed && !readable ? <Banner tone="amber" icon="help" text="Can't read this yet. Make sure it's the whole EcoCash message." /> : null}
      {parsed && readable ? (
        <Card title="What the app read">
          {parsed.amount !== null && parsed.currency ? (
            <View className="flex-row items-center gap-2">
              <CurrencyBadge currency={parsed.currency} size="md" />
              <T weight="heavy" className="text-[24px]">
                {amount(parsed.amount)}
              </T>
              <T weight="bold" className="text-subtle">
                {parsed.type === "CASH_IN" ? "Cash-in" : parsed.type === "CASH_OUT" ? "Cash-out" : ""}
              </T>
            </View>
          ) : null}
          {parsed.counterpartyName ? <InfoRow label="Name" value={parsed.counterpartyName} /> : null}
          {parsed.counterpartyPhone ? <InfoRow label="Number" value={parsed.counterpartyPhone} /> : null}
          {parsed.reference ? <InfoRow label="Reference" value={parsed.reference} /> : null}
        </Card>
      ) : null}
    </Screen>
  );
}
