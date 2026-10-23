import { Redirect, router, Tabs } from "expo-router";
import { useEffect } from "react";

import { FloatingTabBar } from "@/components/ui/tab-bar";
import { useUnrecordedSms } from "@/lib/booth";
import { notifyIncomingSms, watchNotificationTaps } from "@/lib/notifications";
import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";
import { incomingSmsStore, startSmsReader } from "@/lib/sms";

/** Booth tabs: Home · Transactions · ＋ · SMS · Shift. Only while someone has unlocked the phone. */
export default function BoothLayout() {
  const session = useObservable(sessionStore);
  const unrecorded = useUnrecordedSms().length;

  // Read EcoCash SMS while the booth tabs are open; new ones open the incoming-SMS sheet.
  useEffect(() => {
    let stop: (() => void) | undefined;
    void startSmsReader((sms) => void notifyIncomingSms(sms)).then((cleanup) => {
      stop = cleanup;
    });
    const unsubscribe = incomingSmsStore.subscribe(() => {
      if (incomingSmsStore.get()) router.push("/incoming-sms");
    });
    const stopTaps = watchNotificationTaps();
    return () => {
      stop?.();
      unsubscribe();
      stopTaps();
    };
  }, []);

  if (!session) return <Redirect href="/lock" />;

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "#F4F3EF" }, animation: "shift" }}
      tabBar={(props) => (
        <FloatingTabBar
          {...props}
          items={[
            { name: "home", label: "Home", icon: "home" },
            { name: "transactions", label: "Transactions", icon: "receipt-long" },
            { name: "sms", label: "SMS", icon: "sms", badge: unrecorded },
            { name: "shift", label: "Shift", icon: "timer" },
          ]}
          centerAction={{ label: "New transaction", onPress: () => router.push("/transaction/new") }}
        />
      )}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="transactions" />
      <Tabs.Screen name="sms" />
      <Tabs.Screen name="shift" />
    </Tabs>
  );
}
