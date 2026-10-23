import { View } from "react-native";

import { Avatar, Banner, Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { initials } from "@/lib/format";
import { useRows } from "@/lib/local-db";

const RULES: { label: string; helpers: boolean }[] = [
  { label: "Serve customers", helpers: true },
  { label: "Own cash in and cash out", helpers: true },
  { label: "Everyone's transactions", helpers: false },
  { label: "Cash and EcoCash balances", helpers: false },
  { label: "Reports", helpers: false },
  { label: "Count the money", helpers: false },
  { label: "Move money", helpers: false },
  { label: "Edit or cancel entries", helpers: false },
  { label: "People, phones, settings", helpers: false },
];

function Mark({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <Icon name="check-circle" size={20} className="text-leaf" />
  ) : (
    <Icon name="lock" size={18} className="text-subtle" />
  );
}

/** C11 Who can see what: Coline sees everything; helpers see only their own work. */
export default function Access() {
  const helpers = useRows("users", (user) => user.active && user.role === "HELPER");
  return (
    <Screen header={{ title: "Who can see what", subtitle: "Set by Coline" }}>
      <View className="flex-row gap-2">
        <View className="flex-1 rounded-3xl bg-sun-soft p-3.5 gap-2">
          <Avatar label="CM" owner />
          <T weight="heavy">Coline</T>
          <T weight="semibold" className="text-[12px] text-sun-ink">
            Sees and does everything
          </T>
        </View>
        <View className="flex-1 rounded-3xl bg-lilac p-3.5 gap-2">
          <View className="flex-row">
            {helpers.slice(0, 3).map((helper, index) => (
              <View key={helper.id} style={{ marginLeft: index ? -10 : 0 }}>
                <Avatar label={initials(helper.name)} className="border-2 border-lilac" />
              </View>
            ))}
          </View>
          <T weight="heavy">Helpers · {helpers.length}</T>
          <T weight="semibold" className="text-[12px] text-lilac-ink">
            See only their own work
          </T>
        </View>
      </View>

      <Card className="gap-0 py-1">
        <View className="flex-row py-2 border-b border-line">
          <View className="flex-1" />
          <T weight="heavy" className="w-16 text-center text-[11px] text-subtle">
            COLINE
          </T>
          <T weight="heavy" className="w-16 text-center text-[11px] text-subtle">
            HELPERS
          </T>
        </View>
        {RULES.map((rule, index) => (
          <View
            key={rule.label}
            className={index < RULES.length - 1 ? "flex-row items-center py-3 border-b border-line" : "flex-row items-center py-3"}
          >
            <T weight="bold" className="flex-1 text-[13px]">
              {rule.label}
            </T>
            <View className="w-16 items-center">
              <Mark allowed />
            </View>
            <View className="w-16 items-center">
              <Mark allowed={rule.helpers} />
            </View>
          </View>
        ))}
      </Card>

      <Banner tone="lilac" icon="flag" text="Helpers can report a problem to Coline." />
    </Screen>
  );
}
