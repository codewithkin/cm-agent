import * as SecureStore from "expo-secure-store";

import { observable } from "./observable";

export type DeviceKind = "BOOTH" | "OWNER";

export type RegisteredDevice = {
  token: string;
  id: string;
  label: string;
  kind: DeviceKind;
};

const KEY = "cm.device";

/** This phone's registration, or null before first-launch setup. undefined while loading. */
export const deviceStore = observable<RegisteredDevice | null | undefined>(undefined);

export async function loadDevice(): Promise<RegisteredDevice | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  const device = raw ? (JSON.parse(raw) as RegisteredDevice) : null;
  deviceStore.set(device);
  return device;
}

export async function saveDevice(device: RegisteredDevice) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(device));
  deviceStore.set(device);
}

/** Used when the server says this phone was signed out. */
export async function forgetDevice() {
  await SecureStore.deleteItemAsync(KEY);
  deviceStore.set(null);
}

/** Where "done" goes back to: Coline's Today on the owner phone, the booth Home elsewhere. */
export function homeHref(): "/today" | "/home" {
  return deviceStore.get()?.kind === "OWNER" ? "/today" : "/home";
}
