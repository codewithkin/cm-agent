import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "heroui-native";
import { useState, type ReactNode } from "react";
import { View } from "react-native";

import { DemoDataCard } from "@/components/owner/demo-data-card";
import { LiveState } from "@/components/owner/live-state";
import { OwnerAccountCard } from "@/components/owner/owner-account-card";
import { CurrencyBadge, StatusChip } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Icon, type IconName } from "@/components/ui/icon";
import { MoneyInput } from "@/components/ui/money-input";
import { Screen } from "@/components/ui/screen";
import { Switch } from "@/components/ui/switch";
import { Tap } from "@/components/ui/tap";
import { T } from "@/components/ui/text";
import { amount, wholeAmount } from "@/lib/format";
import { saveSettings } from "@/lib/local-db";
import { haptic } from "@/lib/motion";
import { trpc, trpcClient, type RouterInputs } from "@/utils/trpc";

type Update = RouterInputs["settings"]["update"];

/** A settings row that opens an editor underneath it. */
function Row({
  icon,
  label,
  value,
  first,
  children,
}: {
  icon: IconName;
  label: string;
  value: string;
  first?: boolean;
  children?: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View className={cn(!first && "border-t border-line")}>
      <Tap onPress={() => children && setOpen((value) => !value)} scaleTo={0.99} className="flex-row items-center gap-3 py-3.5">
        <Icon name={icon} size={20} className="text-subtle" />
        <T weight="bold" className="flex-1 text-[14px]">
          {label}
        </T>
        <T weight="semibold" className="text-[13px] text-subtle" numberOfLines={1}>
          {value}
        </T>
        {children ? <Icon name={open ? "expand-less" : "chevron-right"} size={20} className="text-subtle" /> : null}
      </Tap>
      {open && children ? (
        <View className="pb-3 gap-2">
          {children(() => setOpen(false))}
        </View>
      ) : null}
    </View>
  );
}

/** C10 Settings · Coline only. */
export default function Settings() {
  const queryClient = useQueryClient();
  const settings = useQuery(trpc.settings.get.queryOptions());
  const data = settings.data;

  const save = useMutation({
    mutationFn: (patch: Update) => trpcClient.settings.update.mutate(patch),
    onSuccess: (updated) => {
      haptic.success();
      saveSettings(updated);
      void queryClient.invalidateQueries();
    },
    onError: () => haptic.error(),
  });

  const [name, setName] = useState("");
  const [codes, setCodes] = useState({ usd: "", zig: "" });
  const [lowCash, setLowCash] = useState({ usd: 0, zig: 0 });
  const [testSms, setTestSms] = useState("");
  const preview = useMutation({ mutationFn: (body: string) => trpcClient.sms.parsePreview.mutate({ body }) });

  return (
    <Screen header={{ title: "Settings", subtitle: "Coline only" }}>
      <LiveState query={settings}>
        {data ? (
          <>
            <T weight="heavy" className="text-[12px] text-subtle px-1">
              OWNER ACCOUNT
            </T>
            <OwnerAccountCard />

            <T weight="heavy" className="text-[12px] text-subtle px-1 mt-2">
              BUSINESS
            </T>
            <Card className="gap-0 py-0">
              <Row first icon="storefront" label="Business name" value={data.businessName}>
                {(close) => (
                  <>
                    <Field value={name || data.businessName} onChangeText={setName} autoFocus />
                    <Button variant="success" label="Save" size="md" loading={save.isPending} onPress={() => save.mutate({ businessName: (name || data.businessName).trim() }, { onSuccess: close })} />
                  </>
                )}
              </Row>
              <Row icon="badge" label="Agent codes" value={[data.agentCodeUsd && "USD", data.agentCodeZig && "ZiG"].filter(Boolean).join(" · ") || "Not set"}>
                {(close) => (
                  <>
                    <Field label="USD agent code" value={codes.usd || (data.agentCodeUsd ?? "")} onChangeText={(usd) => setCodes((c) => ({ ...c, usd }))} />
                    <Field label="ZiG agent code" value={codes.zig || (data.agentCodeZig ?? "")} onChangeText={(zig) => setCodes((c) => ({ ...c, zig }))} />
                    <Button
                      variant="success"
                      label="Save"
                      size="md"
                      loading={save.isPending}
                      onPress={() =>
                        save.mutate(
                          { agentCodeUsd: (codes.usd || data.agentCodeUsd) ?? null, agentCodeZig: (codes.zig || data.agentCodeZig) ?? null },
                          { onSuccess: close },
                        )
                      }
                    />
                  </>
                )}
              </Row>
            </Card>

            <T weight="heavy" className="text-[12px] text-subtle px-1 mt-2">
              MONEY RULES
            </T>
            <Card className="gap-0 py-0">
              <Row first icon="payments" label="Low cash alert" value={`USD ${wholeAmount(data.lowCashUsd)} · ZiG ${wholeAmount(data.lowCashZig)}`}>
                {(close) => (
                  <>
                    <MoneyInput currency="USD" label="Warn below" cents={lowCash.usd || data.lowCashUsd} onChange={(usd) => setLowCash((c) => ({ ...c, usd }))} />
                    <MoneyInput currency="ZIG" label="Warn below" cents={lowCash.zig || data.lowCashZig} onChange={(zig) => setLowCash((c) => ({ ...c, zig }))} />
                    <Button
                      variant="success"
                      label="Save"
                      size="md"
                      loading={save.isPending}
                      onPress={() => save.mutate({ lowCashUsd: lowCash.usd || data.lowCashUsd, lowCashZig: lowCash.zig || data.lowCashZig }, { onSuccess: close })}
                    />
                  </>
                )}
              </Row>
              <View className="flex-row items-center gap-3 py-3.5 border-t border-line">
                <Icon name="notifications-active" size={20} className="text-subtle" />
                <View className="flex-1">
                  <T weight="bold" className="text-[14px]">
                    Low money warning
                  </T>
                  <T weight="semibold" className="text-[12px] text-subtle">
                    Show on all phones
                  </T>
                </View>
                <Switch label="Show low money warning on all phones" value={data.lowWarningOnBooths} onChange={(value) => save.mutate({ lowWarningOnBooths: value })} />
              </View>
              <Row icon="rule" label="Allowed difference" value={`USD ${amount(data.toleranceUsd)} · ZiG ${amount(data.toleranceZig)}`} />
            </Card>

            <T weight="heavy" className="text-[12px] text-subtle px-1 mt-2">
              SMS
            </T>
            <Card>
              <View className="flex-row items-center gap-2">
                <Icon name="sms" size={20} className="text-subtle" />
                <T weight="bold" className="flex-1 text-[14px]">
                  Test an SMS
                </T>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="flex-1">
                  <Field placeholder="Paste an EcoCash SMS" value={testSms} onChangeText={setTestSms} />
                </View>
                <Button label="Test" size="md" disabled={!testSms.trim()} loading={preview.isPending} onPress={() => preview.mutate(testSms)} />
              </View>
              {preview.data ? (
                <View className="p-3 rounded-2xl bg-page gap-1.5">
                  <StatusChip status={preview.data.status === "PARSED" ? "MATCHED" : preview.data.status === "PARTIAL" ? "NO_SMS" : "MISMATCH"} />
                  <T weight="bold" className="text-[13px]">
                    {preview.data.type === "CASH_IN" ? "Cash-in" : preview.data.type === "CASH_OUT" ? "Cash-out" : "Type not found"}
                  </T>
                  {preview.data.currency && preview.data.amount !== null ? (
                    <View className="flex-row items-center gap-1.5">
                      <CurrencyBadge currency={preview.data.currency} />
                      <T weight="heavy">{amount(preview.data.amount)}</T>
                    </View>
                  ) : null}
                  <T weight="semibold" className="text-[12px] text-subtle">
                    Phone {preview.data.counterpartyPhone ?? "—"} · Ref {preview.data.reference ?? "—"}
                    {preview.data.balanceAfter !== null ? ` · Balance ${amount(preview.data.balanceAfter)}` : ""}
                  </T>
                </View>
              ) : null}
              <T weight="semibold" className="text-[12px] text-subtle">
                Senders read as EcoCash: {data.smsSenders.join(", ")}
              </T>
            </Card>

            <T weight="heavy" className="text-[12px] text-subtle px-1 mt-2">
              DEMO DATA
            </T>
            <DemoDataCard />

            <T weight="heavy" className="text-[12px] text-subtle px-1 mt-2">
              RECORDS
            </T>
            <Card className="gap-0 py-0">
              <Row first icon="backup" label="Backed up" value="On the server" />
              <Row icon="inventory-2" label="Keep records" value={`${Math.round(data.retentionDays / 365)} years`}>
                {(close) => (
                  <View className="flex-row gap-2">
                    {[5, 7, 10].map((years) => (
                      <Button
                        key={years}
                        label={`${years} years`}
                        size="md"
                        variant={Math.round(data.retentionDays / 365) === years ? "primary" : "outline"}
                        className="flex-1"
                        onPress={() => save.mutate({ retentionDays: years * 365 }, { onSuccess: close })}
                      />
                    ))}
                  </View>
                )}
              </Row>
            </Card>
          </>
        ) : null}
      </LiveState>
    </Screen>
  );
}
