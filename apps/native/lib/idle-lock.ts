import { router } from "expo-router";
import { AppState } from "react-native";

import { endSession, sessionStore } from "./session";

/** After 2 minutes without a touch (or in the background), the phone goes back to "Who is serving?". */
export const IDLE_LOCK_MS = 2 * 60 * 1000;

let timer: ReturnType<typeof setTimeout> | null = null;
let backgroundedAt: number | null = null;

export function lockNow() {
  if (!sessionStore.get()) return;
  endSession();
  router.replace("/lock");
}

/** Call on every touch; restarts the idle countdown. */
export function bumpIdleTimer() {
  if (timer) clearTimeout(timer);
  if (!sessionStore.get()) return;
  timer = setTimeout(lockNow, IDLE_LOCK_MS);
}

/** Watches the app going to the background; returns a stop function. */
export function watchIdle() {
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      if (backgroundedAt && Date.now() - backgroundedAt > IDLE_LOCK_MS) lockNow();
      backgroundedAt = null;
      bumpIdleTimer();
    } else {
      backgroundedAt ??= Date.now();
    }
  });
  const unsubscribe = sessionStore.subscribe(bumpIdleTimer);
  return () => {
    subscription.remove();
    unsubscribe();
    if (timer) clearTimeout(timer);
  };
}
