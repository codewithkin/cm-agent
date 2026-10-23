import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { T } from "@/components/ui/text";
import { haptic } from "@/lib/motion";
import { trpc, trpcClient } from "@/utils/trpc";

/** Coline's correction of an entry: amount, customer details, reference, and why. */
export function EditTransaction({ transactionId, onDone }: { transactionId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const current = useQuery(trpc.transactions.get.queryOptions({ transactionId }));
  const tx = current.data?.transaction;
  const [cents, setCents] = useState(0);
  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!tx) return;
    setCents(tx.amount);
    setName(tx.customerName);
    setIdNumber(tx.customerIdNumber);
    setReference(tx.reference ?? "");
  }, [tx]);

  const save = useMutation({
    mutationFn: () =>
      trpcClient.transactions.edit.mutate({
        transactionId,
        reason: reason.trim(),
        changes: {
          amount: cents,
          customerName: name.trim(),
          customerIdNumber: idNumber.trim(),
          reference: reference.trim() || null,
        },
      }),
    onSuccess: () => {
      haptic.success();
      void queryClient.invalidateQueries();
      onDone();
    },
    onError: () => haptic.error(),
  });

  if (!tx) return null;

  return (
    <Card index={0} className="bg-page border-0 gap-2">
      <T weight="heavy">Edit entry</T>
      <MoneyInput currency={tx.currency} label="Amount" cents={cents} onChange={setCents} />
      <Field label="Customer name" value={name} onChangeText={setName} />
      <Field label="ID number" value={idNumber} onChangeText={setIdNumber} autoCapitalize="characters" />
      <Field label="EcoCash reference" value={reference} onChangeText={setReference} autoCapitalize="characters" />
      <Field label="Why the change?" placeholder="e.g. Typed wrong amount" value={reason} onChangeText={setReason} />
      {save.error ? (
        <T weight="bold" className="text-[12px] text-alarm-ink">
          {save.error.message}
        </T>
      ) : null}
      <View className="flex-row gap-2">
        <Button label="Cancel" variant="light" size="md" className="flex-1" onPress={onDone} />
        <Button
          variant="success"
          label="Save change"
          icon="check"
          size="md"
          className="flex-[1.4]"
          loading={save.isPending}
          disabled={!reason.trim() || cents <= 0}
          onPress={() => save.mutate()}
        />
      </View>
    </Card>
  );
}
