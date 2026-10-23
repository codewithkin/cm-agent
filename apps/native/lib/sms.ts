import { AppState, PermissionsAndroid, Platform } from "react-native";

import { addSmsListener, readInboxSince, smsReaderAvailable } from "@/modules/sms-reader";

import { receiveSms } from "./actions";
import { readJson, writeJson } from "./kv";
import { localSettings, type LocalSms } from "./local-db";
import { observable } from "./observable";

const LAST_SEEN_KEY = "cm.sms.lastSeen";
const FALLBACK_SENDERS = ["EcoCash"];

/** The SMS the incoming-SMS sheet is showing, if any. */
export const incomingSmsStore = observable<LocalSms | null>(null);

/** Whether this phone may read SMS. */
export const smsPermissionStore = observable<"granted" | "denied" | "unknown">("unknown");

function senders() {
  return localSettings.get()?.smsSenders ?? FALLBACK_SENDERS;
}

export async function checkSmsPermission() {
  if (Platform.OS !== "android" || !smsReaderAvailable) {
    smsPermissionStore.set("denied");
    return false;
  }
  const [receive, read] = await Promise.all([
    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS),
    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS),
  ]);
  const granted = receive && read;
  smsPermissionStore.set(granted ? "granted" : "denied");
  return granted;
}

export async function requestSmsPermission() {
  if (Platform.OS !== "android" || !smsReaderAvailable) return false;
  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    PermissionsAndroid.PERMISSIONS.READ_SMS,
  ]);
  const granted = Object.values(result).every((value) => value === PermissionsAndroid.RESULTS.GRANTED);
  smsPermissionStore.set(granted ? "granted" : "denied");
  return granted;
}

let lastSeen = 0;
let onIncoming: ((sms: LocalSms) => void) | undefined;

/** Stores an SMS and, if it's EcoCash, shows the incoming-SMS sheet. */
function handle(sms: { sender: string; body: string; receivedAt: number }, showSheet: boolean) {
  const stored = receiveSms({ ...sms, receivedAt: new Date(sms.receivedAt) }, senders());
  if (stored && showSheet && !stored.transactionId) {
    incomingSmsStore.set(stored);
    onIncoming?.(stored);
  }
  lastSeen = Math.max(sms.receivedAt, lastSeen);
  void writeJson(LAST_SEEN_KEY, lastSeen);
}

/** Picks up EcoCash SMS that arrived while the app was closed. */
async function catchUp() {
  const since = lastSeen || Date.now() - 24 * 60 * 60 * 1000;
  const missed = await readInboxSince(since, senders());
  for (const sms of missed) handle(sms, false);
}

/**
 * Starts reading EcoCash SMS on a booth phone. `notify` runs for each new one
 * (used for a local notification when the app is in the background).
 */
export async function startSmsReader(notify?: (sms: LocalSms) => void) {
  onIncoming = notify;
  if (!(await checkSmsPermission())) return () => {};
  lastSeen = await readJson<number>(LAST_SEEN_KEY, 0);
  await catchUp();

  const subscription = addSmsListener((sms) => handle(sms, true));
  const appState = AppState.addEventListener("change", (state) => {
    if (state === "active") void catchUp();
  });
  return () => {
    subscription.remove();
    appState.remove();
  };
}
