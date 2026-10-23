import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { cn } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { EditTransaction } from "@/components/owner/edit-transaction";
import { LiveState } from "@/components/owner/live-state";
import { CurrencyBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/card";
import { ChipFilter } from "@/components/ui/chip-filter";
import { Field } from "@/components/ui/field";
import { Icon, type IconName } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { amount, clock, dayLabel, initials, localDateKey } from "@/lib/format";
import { enterUp, exitFade, haptic, layout } from "@/lib/motion";
import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";
import { trpc, trpcClient, type RouterOutputs } from "@/utils/trpc";

type Item = RouterOutputs["review"]["queue"]["items"][number];
type Filter = "ALL" | "NO_SMS" | "REPORTED" | "NO_MATCH" | "OTHER";

const LOOK: Record<Item["category"], { title: string; icon: IconName; box: string; ink: string }> = {
  NO_SMS: { title: "No SMS", icon: "sms-failed", box: "bg-amber-soft", ink: "text-amber-ink" },
  REPORTED: { title: "Reported", icon: "flag", box: "bg-lilac", ink: "text-lilac-ink" },
  NO_MATCH: { title: "No match", icon: "error", box: "bg-alarm-soft", ink: "text-alarm-ink" },
  SMS_NOT_SAVED: { title: "SMS not saved", icon: "mark-chat-unread", box: "bg-alarm-soft", ink: "text-alarm-ink" },
  SHIFT: { title: "Shift didn't balance", icon: "account-balance-wallet", box: "bg-peach", ink: "text-peach-ink" },
};

function ReviewCard({ item, index }: { item: Item; index: number }) {
  const queryClient = useQueryClient();
  const look = LOOK[item.category];
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");

  const refresh = () => void queryClient.invalidateQueries();
  const checked = useMutation({
    mutationFn: () => trpcClient.review.markChecked.mutate({ kind: item.kind, id: item.id }),
    onSuccess: () => {
      haptic.success();
      refresh();
    },
  });
  const cancel = useMutation({
    mutationFn: () => trpcClient.transactions.void.mutate({ transactionId: item.id, reason: reason.trim() }),
    onSuccess: () => {
      haptic.warning();
      refresh();
    },
  });

  const money = item.money;
  return (
    <Animated.View entering={enterUp(index)} exiting={exitFade} layout={layout} className="bg-white rounded-3xl border border-line p-3.5 gap-3">
      <View className="flex-row items-start gap-3">
        <View className={cn("w-10 h-10 rounded-xl items-center justify-center", look.box)}>
          <Icon name={look.icon} size={20} className={look.ink} />
        </View>
        <View className="flex-1 gap-1">
          <View className="flex-row items-center justify-between">
            <T weight="heavy" className="text-[14px]">
              {item.category === "REPORTED" && item.person ? `Reported by ${item.person.name}` : look.title}
            </T>
            <T weight="bold" className="text-[12px] text-subtle">
              {clock(item.at)}
            </T>
          </View>
          {money?.currency && money.amount !== null ? (
            <View className="flex-row items-center gap-1.5">
              <T weight="bold" className="text-[13px]">
                {money.type === "CASH_IN" ? "Cash-in" : "Cash-out"}
              </T>
              <CurrencyBadge currency={money.currency} />
              <T weight="heavy" className="text-[13px]">
                {amount(money.amount)}
              </T>
              {item.smsAmount !== null ? (
                <T weight="bold" className="text-[12px] text-alarm-ink">
                  · SMS {amount(item.smsAmount)}
                </T>
              ) : null}
            </View>
          ) : (
            item.reasons.map((reasonText) => (
              <T key={reasonText} weight="bold" className="text-[13px]">
                {reasonText}
              </T>
            ))
          )}
          <View className="flex-row items-center gap-1.5">
            {item.person ? <Avatar label={initials(item.person.name)} size={20} /> : null}
            <T weight="semibold" className="text-[12px] text-subtle">
              {[item.person?.name, item.deviceLabel].filter(Boolean).join(" · ")}
            </T>
          </View>
          {item.quote ? (
            <View className="mt-1 px-3 py-2 rounded-xl bg-page">
              <T weight="semibold" className="text-[13px] italic text-ink-soft">
                "{item.quote}"
              </T>
            </View>
          ) : null}
        </View>
      </View>

      {editing ? <EditTransaction transactionId={item.id} onDone={() => setEditing(false)} /> : null}

      {cancelling ? (
        <Animated.View entering={enterUp(0)} className="gap-2">
          <Field placeholder="Why cancel it?" value={reason} onChangeText={setReason} autoFocus />
          <View className="flex-row gap-2">
            <Button label="Keep it" variant="light" size="md" className="flex-1" onPress={() => setCancelling(false)} />
            <Button
              variant="destructive"
              label="Cancel entry"
              icon="block"
              size="md"
              className="flex-1"
              loading={cancel.isPending}
              disabled={!reason.trim()}
              onPress={() => cancel.mutate()}
            />
          </View>
        </Animated.View>
      ) : null}

      {!editing && !cancelling ? (
        <View className="flex-row gap-2 justify-end">
          {item.kind === "TRANSACTION" ? (
            item.category === "REPORTED" ? (
              <Button variant="danger" label="Cancel it" icon="block" size="sm" onPress={() => setCancelling(true)} />
            ) : (
              <Button variant="success" label="Open" size="sm" onPress={() => router.push({ pathname: "/transaction/[id]", params: { id: item.id } })} />
            )
          ) : null}
          {item.kind === "TRANSACTION" && item.category !== "NO_SMS" ? (
            <Button variant="caution" label="Edit" icon="edit" size="sm" onPress={() => setEditing(true)} />
          ) : (
            <Button variant="success" label="It is fine" icon="check" size="sm" loading={checked.isPending} onPress={() => checked.mutate()} />
          )}
        </View>
      ) : null}
    </Animated.View>
  );
}

/** C2 Review · things Coline should look at. */
export default function Review() {
  const session = useObservable(sessionStore);
  const queue = useQuery({ ...trpc.review.queue.queryOptions(), enabled: Boolean(session?.sessionToken) });
  const [filter, setFilter] = useState<Filter>("ALL");
  const items = queue.data?.items ?? [];

  const counts = {
    NO_SMS: items.filter((item) => item.category === "NO_SMS").length,
    REPORTED: items.filter((item) => item.category === "REPORTED").length,
    NO_MATCH: items.filter((item) => item.category === "NO_MATCH").length,
    OTHER: items.filter((item) => item.category === "SMS_NOT_SAVED" || item.category === "SHIFT").length,
  };
  const shown = items.filter((item) =>
    filter === "ALL"
      ? true
      : filter === "OTHER"
        ? item.category === "SMS_NOT_SAVED" || item.category === "SHIFT"
        : item.category === filter,
  );

  const byDay = new Map<string, Item[]>();
  for (const item of shown) {
    const key = localDateKey(item.at);
    byDay.set(key, [...(byDay.get(key) ?? []), item]);
  }

  return (
    <Screen withTabBar header={{ title: "To check", subtitle: `${items.length} things`, leading: null, large: true }}>
      <ChipFilter
        value={filter}
        onChange={setFilter}
        options={[
          { value: "ALL", label: "All", count: items.length },
          { value: "NO_SMS", label: "No SMS", count: counts.NO_SMS },
          { value: "REPORTED", label: "Reported", count: counts.REPORTED },
          { value: "NO_MATCH", label: "No match", count: counts.NO_MATCH },
          { value: "OTHER", label: "Other", count: counts.OTHER },
        ]}
      />
      <LiveState query={queue}>
        {shown.length === 0 ? (
          <Animated.View entering={enterUp(1)} className="items-center py-14 gap-2">
            <Icon name="task-alt" size={44} className="text-leaf-bright" />
            <T weight="heavy" className="text-[18px]">
              Nothing to check
            </T>
            <T weight="semibold" className="text-subtle">
              Every entry matches its SMS.
            </T>
          </Animated.View>
        ) : (
          [...byDay].map(([day, dayItems]) => (
            <View key={day} className="gap-2">
              <T weight="heavy" className="text-[12px] text-subtle px-1">
                {day === localDateKey() ? `Today · ${dayLabel(new Date())}` : dayLabel(dayItems[0]!.at)}
              </T>
              {dayItems.map((item, index) => (
                <ReviewCard key={`${item.kind}-${item.id}`} item={item} index={index} />
              ))}
            </View>
          ))
        )}
      </LiveState>
    </Screen>
  );
}
