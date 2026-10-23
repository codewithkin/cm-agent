import { Redirect } from "expo-router";

import { deviceStore } from "@/lib/device";
import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";

/** Sends the phone where it belongs: setup, the lock screen, the owner tabs or the booth tabs. */
export default function Entry() {
  const device = useObservable(deviceStore);
  const session = useObservable(sessionStore);

  if (!device) return <Redirect href="/setup" />;
  if (!session) return <Redirect href="/lock" />;
  if (session.user.mustChangePin) return <Redirect href="/lock/set-pin" />;
  if (device.kind === "OWNER") return <Redirect href="/today" />;
  return <Redirect href="/home" />;
}
