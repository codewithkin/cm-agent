import { router } from "expo-router";

import { NoShiftCard } from "@/components/booth/no-shift-card";
import { ServingHeader } from "@/components/booth/serving-header";
import { Screen } from "@/components/ui/screen";
import { useOpenShift } from "@/lib/booth";
import { deviceStore } from "@/lib/device";
import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";

/** B2 Home. */
export default function Home() {
  const session = useObservable(sessionStore);
  const device = useObservable(deviceStore);
  const shift = useOpenShift();
  if (!session || !device) return null;
  const isOwner = session.user.role === "OWNER";

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
      ) : null}
    </Screen>
  );
}
