import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { EditTransaction } from "@/components/owner/edit-transaction";
import { CurrencyBadge, StatusChip } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Banner, Card, InfoRow } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Screen } from "@/components/ui/screen";
import { SignatureView } from "@/components/ui/signature-view";
import { Tap } from "@/components/ui/tap";
import { T } from "@/components/ui/text";
import { TypeTile } from "@/components/ui/transaction-row";
import { statusOf } from "@/lib/booth";
import { amount, clock, dayLabel, maskPhone } from "@/lib/format";
import { localDb, patchRow } from "@/lib/local-db";
import { enterUp, exitFade, haptic, popIn } from "@/lib/motion";
import { onlineStore } from "@/lib/network";
import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";
import { trpc, trpcClient } from "@/utils/trpc";

function Toggle({ label, open, onPress }: { label: string; open: boolean; onPress: () => void }) {
  return (
    <Tap onPress={onPress} className="px-3 h-8 rounded-full bg-page justify-center">
      <T weight="heavy" className="text-[12px]">
        {open ? "Hide" : label}
      </T>
    </Tap>
  );
}

/** B8 Transaction detail. Helpers can report a problem; Coline can edit or cancel it. */
export default function TransactionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useObservable(sessionStore);
  const online = useObservable(onlineStore);
  const local = useObservable(localDb).transactions[id];
  const remote = useQuery({
    ...trpc.transactions.get.queryOptions({ transactionId: id }),
    enabled: online && Boolean(session?.sessionToken),
  });
  const tx = remote.data?.transaction ?? local;
  const sms = remote.data?.transaction.sms ?? Object.values(localDb.get().smsMessages).find((row) => row.transactionId === id);

  const [showSignature, setShowSignature] = useState(false);
  const [showSms, setShowSms] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const queryClient = useQueryClient();
  const isOwner = session?.user.role === "OWNER";

  const cancel = useMutation({
    mutationFn: () => trpcClient.transactions.void.mutate({ transactionId: id, reason: cancelReason.trim() }),
    onSuccess: () => {
      haptic.warning();
      patchRow("transactions", id, { voidedAt: new Date(), voidReason: cancelReason.trim() });
      setCancelling(false);
      void queryClient.invalidateQueries();
    },
    onError: () => haptic.error(),
  });

  const flag = useMutation({
    mutationFn: () => trpcClient.transactions.flag.mutate({ transactionId: id, reason: reason.trim() }),
    onSuccess: () => {
      haptic.success();
      patchRow("transactions", id, { flaggedAt: new Date(), flagReason: reason.trim() });
      setReporting(false);
      void remote.refetch();
    },
    onError: () => haptic.error(),
  });

  if (!tx) {
    return (
      <Screen header={{ title: "Transaction" }}>
        <Card index={0}>
          <T weight="semibold" className="text-subtle">
            {online ? "Loading…" : "This transaction isn't on this phone. Connect to the internet to see it."}
          </T>
        </Card>
      </Screen>
    );
  }

  const servedBy = remote.data?.transaction.servedBy.name ?? (tx.servedById === session?.user.id ? session.user.name : "—");
  const flagged = Boolean(tx.flaggedAt);

  return (
    <Screen
      header={{ title: "Transaction", subtitle: `${dayLabel(tx.occurredAt)} · ${clock(tx.occurredAt)}` }}
      footer={
        isOwner ? (
          tx.voidedAt || editing || cancelling ? undefined : (
            <View className="flex-row gap-2">
              <Button label="Cancel it" icon="block" variant="danger" className="flex-1" disabled={!online} onPress={() => setCancelling(true)} />
              <Button label="Edit" icon="edit" className="flex-1" disabled={!online} onPress={() => setEditing(true)} />
            </View>
          )
        ) : reporting ? undefined : flagged ? (
          <Banner tone="amber" icon="flag" text={`Reported to Coline: "${tx.flagReason ?? ""}"`} />
        ) : (
          <Button label="Report to Coline" icon="flag" variant="outline" onPress={() => setReporting(true)} />
        )
      }
    >
      <Animated.View entering={enterUp(0)} className="items-center gap-2 py-4">
        <Animated.View entering={popIn}>
          <TypeTile type={tx.type} size={56} />
        </Animated.View>
        <T weight="bold" className="text-subtle">
          {tx.type === "CASH_OUT" ? "Cash-out" : "Cash-in"}
        </T>
        <View className="flex-row items-center gap-2">
          <CurrencyBadge currency={tx.currency} size="md" />
          <T weight="heavy" className={tx.voidedAt ? "text-[40px] text-subtle line-through" : "text-[40px]"}>
            {amount(tx.amount)}
          </T>
        </View>
        <StatusChip status={statusOf(tx)} />
        {tx.voidedAt ? (
          <T weight="bold" className="text-[12px] text-subtle">
            Cancelled by Coline · {tx.voidReason}
          </T>
        ) : null}
      </Animated.View>

      <Card index={1} className="gap-0 py-1">
        {isOwner ? (
          <Tap onPress={() => router.push({ pathname: "/customer/[id]", params: { id: tx.customerId } })} scaleTo={0.99}>
            <InfoRow icon="person" label="Customer" right={<T weight="heavy" className="text-[14px] underline">{tx.customerName}</T>} />
          </Tap>
        ) : (
          <InfoRow icon="person" label="Customer" value={tx.customerName} />
        )}
        <InfoRow icon="call" label="Phone" value={maskPhone(tx.customerPhone)} />
        <InfoRow icon="badge" label="ID" value={tx.customerIdNumber} />
        <InfoRow icon="tag" label="Reference" value={tx.reference ?? "—"} />
        <InfoRow icon="storefront" label="Served by" value={servedBy} />
        <InfoRow
          icon="draw"
          label="Signature"
          right={<Toggle label="View" open={showSignature} onPress={() => setShowSignature((value) => !value)} />}
        />
        {showSignature ? (
          <Animated.View entering={enterUp(0)} exiting={exitFade} className="pb-3">
            <SignatureView signature={remote.data?.transaction.signature} />
          </Animated.View>
        ) : null}
        <InfoRow
          icon="sms"
          label="Full SMS"
          last={!showSms}
          right={sms ? <Toggle label="Show" open={showSms} onPress={() => setShowSms((value) => !value)} /> : <T weight="bold" className="text-[13px] text-subtle">None</T>}
        />
        {showSms && sms ? (
          <Animated.View entering={enterUp(0)} exiting={exitFade} className="pb-3">
            <View className="rounded-2xl bg-page p-3">
              <T weight="mono" className="text-[12px] text-ink-soft">
                {sms.body}
              </T>
            </View>
          </Animated.View>
        ) : null}
      </Card>

      {tx.note ? <Banner tone="lilac" icon="edit-note" text={`Note: ${tx.note}`} /> : null}

      <T weight="semibold" className="text-[12px] text-subtle text-center">
        Saved by {servedBy} · {clock(tx.createdAt)}
      </T>

      {editing ? <EditTransaction transactionId={id} onDone={() => setEditing(false)} /> : null}

      {cancelling ? (
        <Card index={0} className="bg-alarm-soft border-0">
          <T weight="heavy" className="text-alarm-ink">
            Cancel this entry?
          </T>
          <T weight="semibold" className="text-[13px] text-alarm-ink">
            It stays in the logbook, crossed out, and its SMS goes back to "not saved".
          </T>
          <Field placeholder="Why? e.g. wrong amount" value={cancelReason} onChangeText={setCancelReason} autoFocus />
          <View className="flex-row gap-2">
            <Button label="Keep it" variant="light" size="md" className="flex-1" onPress={() => setCancelling(false)} />
            <Button
              label="Cancel entry"
              icon="block"
              size="md"
              className="flex-1 bg-alarm"
              loading={cancel.isPending}
              disabled={!cancelReason.trim()}
              onPress={() => cancel.mutate()}
            />
          </View>
        </Card>
      ) : null}

      {reporting ? (
        <Card index={0} className="bg-amber-soft border-0">
          <T weight="heavy" className="text-amber-ink">
            What's wrong with this entry?
          </T>
          <Field placeholder="e.g. Typed wrong amount, should be 300" value={reason} onChangeText={setReason} autoFocus />
          {!online ? <Banner tone="danger" icon="wifi-off" text="Reporting needs internet." /> : null}
          <View className="flex-row gap-2">
            <Button label="Cancel" variant="light" size="md" className="flex-1" onPress={() => setReporting(false)} />
            <Button
              label="Send to Coline"
              icon="flag"
              size="md"
              className="flex-[1.4]"
              loading={flag.isPending}
              disabled={!online || reason.trim().length === 0}
              onPress={() => flag.mutate()}
            />
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}
