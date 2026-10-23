import { View } from "react-native";

import { CurrencyBadge } from "@/components/ui/badges";
import { Icon } from "@/components/ui/icon";
import { SignaturePad } from "@/components/ui/signature-pad";
import { T } from "@/components/ui/text";
import { TypeTile } from "@/components/ui/transaction-row";
import { amount, maskPhone } from "@/lib/format";

import { draftCents, draftPhone, type Draft } from "./draft";

/** B5 Customer signature: a recap of what they're signing for, and the pad. */
export function SignStep({ draft, update }: { draft: Draft; update: (patch: Partial<Draft>) => void }) {
  const phone = draftPhone(draft);
  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-3 bg-ink rounded-3xl p-3.5">
        <TypeTile type={draft.type} size={40} />
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-1.5">
            <T weight="heavy" className="text-white">
              {draft.type === "CASH_OUT" ? "Cash-out" : "Cash-in"} ·
            </T>
            <CurrencyBadge currency={draft.currency} />
            <T weight="heavy" className="text-white">
              {amount(draftCents(draft))}
            </T>
          </View>
          <T weight="semibold" className="text-[12px] text-white/70">
            {draft.name} · {phone ? maskPhone(phone) : ""}
          </T>
        </View>
        <Icon name="verified" size={20} className="text-sun" />
      </View>

      <View>
        <SignaturePad onChange={(signature) => update({ signature })} />
      </View>

      <View className="flex-row items-center gap-3 p-3 rounded-3xl bg-white border border-line opacity-70">
        <View className="w-10 h-10 rounded-xl bg-page items-center justify-center">
          <Icon name="add-a-photo" size={20} className="text-subtle" />
        </View>
        <View className="flex-1">
          <T weight="heavy" className="text-[14px]">
            Add ID photo
          </T>
          <T weight="semibold" className="text-[12px] text-subtle">
            Optional
          </T>
        </View>
        <View className="flex-row items-center gap-1 px-2 h-6 rounded-full bg-page">
          <Icon name="schedule" size={12} className="text-subtle" />
          <T weight="bold" className="text-[10px] text-subtle">
            Coming soon
          </T>
        </View>
      </View>
    </View>
  );
}
