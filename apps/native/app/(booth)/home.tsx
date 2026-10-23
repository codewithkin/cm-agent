import { router } from "expo-router";

import { MyShiftCard } from "@/components/booth/my-shift-card";
import { NoShiftCard } from "@/components/booth/no-shift-card";
import { QuickActions } from "@/components/booth/quick-actions";
import { RecentCard } from "@/components/booth/recent-card";
import { ServingHeader } from "@/components/booth/serving-header";
import { Banner } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import {
  BALANCE_LABEL,
  useLowWarnings,
  useOpenShift,
  useShiftBalances,
  useShiftTransactions,
  useSummary,
  useUnrecordedSms,
} from "@/lib/booth";
import { deviceStore } from "@/lib/device";
import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";

/** B2 Home: no shift, or the shift dashboard. */
export default function Home() {
  const session = useObservable(sessionStore);
  const device = useObservable(deviceStore);
  const shift = useOpenShift();
  const isOwner = session?.user.role === "OWNER";
  const mine = useShiftTransactions(shift?.id, isOwner ? undefined : session?.user.id);
  const summary = useSummary(mine);
  const unrecorded = useUnrecordedSms();
  const balances = useShiftBalances(shift);
  const low = useLowWarnings(balances, isOwner);

  if (!session || !device) return null;

  return (
    <Screen withTabBar>
      <ServingHeader session={session} since={shift?.openedAt ?? null} deviceLabel={device.label} />

      {!shift ? (
        <NoShiftCard
          isOwner={isOwner}
          onStart={() =>
            isOwner ? router.push("/shift/start") : router.push({ pathname: "/owner-pin", params: { next: "start" } })
          }
        />
      ) : (
        <>
          <MyShiftCard summary={summary} index={1} />
          <QuickActions index={2} />
          {unrecorded.length > 0 ? (
            <Banner
              tone="alarm"
              icon="mark-chat-unread"
              text={`${unrecorded.length} EcoCash SMS not saved`}
              actionLabel="Save"
              onAction={() => router.push("/sms")}
            />
          ) : null}
          {low.map((key) => (
            <Banner
              key={key}
              tone="amber"
              icon="warning"
              text={isOwner ? `${BALANCE_LABEL[key]} is low.` : `${BALANCE_LABEL[key]} is low. Tell Coline.`}
            />
          ))}
          <RecentCard transactions={mine} index={4} />
        </>
      )}
    </Screen>
  );
}
