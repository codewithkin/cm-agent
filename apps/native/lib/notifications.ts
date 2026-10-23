import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { AppState } from "react-native";

import { amount, maskPhone } from "./format";
import { localDb, type LocalSms } from "./local-db";
import { incomingSmsStore } from "./sms";

// Show notifications even while the app is open, but quietly (the sheet is already up).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: AppState.currentState !== "active",
    shouldShowList: true,
    shouldPlaySound: AppState.currentState !== "active",
    shouldSetBadge: false,
  }),
});

let permissionAsked = false;

async function ensurePermission() {
  if (permissionAsked) return;
  permissionAsked = true;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") await Notifications.requestPermissionsAsync();
}

/** N1 "New cash-out · USD 50.00 · EcoCash SMS from 0772 ••• 123. Tap to save it." */
export async function notifyIncomingSms(sms: LocalSms) {
  if (AppState.currentState === "active") return;
  await ensurePermission();
  const kind = sms.type === "CASH_IN" ? "cash-in" : "cash-out";
  const money = sms.currency && sms.amount !== null ? ` · ${sms.currency === "USD" ? "USD" : "ZiG"} ${amount(sms.amount)}` : "";
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `New ${kind}${money}`,
      body: `EcoCash SMS${sms.counterpartyPhone ? ` from ${maskPhone(sms.counterpartyPhone)}` : ""}. Tap to save it.`,
      data: { smsId: sms.id },
    },
    trigger: null,
  });
}

/** Tapping the notification opens the incoming-SMS sheet for that SMS. Returns a stop function. */
export function watchNotificationTaps() {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const smsId = response.notification.request.content.data?.smsId;
    if (typeof smsId !== "string") return;
    const sms = localDb.get().smsMessages[smsId];
    if (!sms || sms.transactionId) return;
    incomingSmsStore.set(sms);
    router.push("/incoming-sms");
  });
  return () => subscription.remove();
}
