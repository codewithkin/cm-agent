import * as Notifications from "expo-notifications";
import { AppState } from "react-native";

// Banners only while the app is in the background; in front, the consent sheet shows instead.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: AppState.currentState !== "active",
    shouldShowList: true,
    shouldPlaySound: AppState.currentState !== "active",
    shouldSetBadge: false,
  }),
});

let permissionAsked = false;

/** Android 13+ asks before an app may show notifications (POST_NOTIFICATIONS). */
export async function ensureNotificationPermission() {
  if (permissionAsked) return;
  permissionAsked = true;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") await Notifications.requestPermissionsAsync();
}

/**
 * N1: an EcoCash SMS arrived while the app was in the background. Android's
 * "allow this message" sheet appears as soon as the app is opened again.
 */
export async function notifyPendingSms() {
  await ensureNotificationPermission();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "New EcoCash SMS",
      body: "Open the app and tap Allow to save it.",
      data: { kind: "pending-sms" },
    },
    trigger: null,
  });
}
