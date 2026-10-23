import { router } from "expo-router";
import { useEffect } from "react";

import { ensureNotificationPermission, notifyPendingSms } from "./notifications";
import { incomingSmsStore, startSmsReader } from "./sms";

/**
 * While `enabled`, listens for EcoCash SMS (with consent); each one the person
 * allows opens the incoming-SMS sheet. On booth phones always, on the owner
 * phone while a shift is open on it.
 */
export function useSmsListener(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    void ensureNotificationPermission();
    const stop = startSmsReader({ onPending: () => void notifyPendingSms() });
    const unsubscribe = incomingSmsStore.subscribe(() => {
      if (incomingSmsStore.get()) router.push("/incoming-sms");
    });
    return () => {
      stop();
      unsubscribe();
    };
  }, [enabled]);
}
