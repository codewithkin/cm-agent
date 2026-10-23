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
    </View>
  );
}
