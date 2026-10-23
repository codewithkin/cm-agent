import { parseSms } from "@cm-agent/api/lib/sms-parser";
import { AppState, Platform } from "react-native";

import { addSmsReaderListener, smsReaderAvailable, startListening, stopListening } from "@/modules/sms-reader";

import { receiveSms } from "./actions";
import { localSettings, type LocalSms } from "./local-db";
import { observable } from "./observable";

/*
 * EcoCash SMS come in through Google's SMS User Consent API: while the booth
 * screens are open the app keeps a listening window running; when an SMS
 * arrives, Android asks "Allow CM to read this message?" and only then does
 * the app see it. No SMS permissions are needed.
 */

const FALLBACK_SENDERS = ["EcoCash"];

/** The SMS the incoming-SMS sheet is showing, if any. */
export const incomingSmsStore = observable<LocalSms | null>(null);

/** "listening" while waiting for the next SMS; "unavailable" without Google Play services or the native module. */
export const smsReaderStore = observable<"listening" | "idle" | "unavailable">(
  Platform.OS === "android" && smsReaderAvailable ? "idle" : "unavailable",
);

let sheetSuppressed = 0;

/**
 * Stops new SMS from opening the incoming-SMS sheet, e.g. while New transaction
 * is open and handles the SMS itself. Returns a function that lifts it.
 */
export function suppressIncomingSheet() {
  sheetSuppressed += 1;
  return () => {
    sheetSuppressed = Math.max(0, sheetSuppressed - 1);
  };
}

function ecoCashSender() {
  return localSettings.get()?.smsSenders[0] ?? FALLBACK_SENDERS[0]!;
}

/** Stores a consented SMS if it reads as an EcoCash message, and shows the sheet. */
function handle(body: string, receivedAt: number) {
  // The person chose to share it, but it could still be an unrelated SMS (e.g. a bank code).
  if (parseSms(body).status === "UNPARSED") return;
  const sender = ecoCashSender();
  const stored = receiveSms({ sender, body, receivedAt: new Date(receivedAt) }, [sender]);
  if (stored && !stored.transactionId && sheetSuppressed === 0) incomingSmsStore.set(stored);
}

async function listen() {
  if (smsReaderStore.get() === "unavailable" || AppState.currentState !== "active") return;
  const started = await startListening();
  smsReaderStore.set(started ? "listening" : "unavailable");
}

/**
 * Keeps an SMS listening window open while the app is in front, re-arming it
 * after each SMS, refusal or 5-minute timeout. `onPending` runs when an SMS
 * arrived in the background (the consent sheet waits until the app reopens).
 * Returns a stop function.
 */
export function startSmsReader({ onPending }: { onPending?: () => void } = {}) {
  if (smsReaderStore.get() === "unavailable") return () => {};

  const subscriptions = [
    addSmsReaderListener("onSms", (sms) => {
      handle(sms.body, sms.receivedAt);
      void listen();
    }),
    addSmsReaderListener("onDenied", () => void listen()),
    addSmsReaderListener("onTimeout", () => void listen()),
    addSmsReaderListener("onPending", () => onPending?.()),
  ];
  const appState = AppState.addEventListener("change", (state) => {
    if (state === "active") void listen();
  });
  void listen();

  return () => {
    for (const subscription of subscriptions) subscription.remove();
    appState.remove();
    stopListening();
    if (smsReaderStore.get() === "listening") smsReaderStore.set("idle");
  };
}
