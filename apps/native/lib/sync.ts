import { TRPCClientError } from "@trpc/client";
import Constants from "expo-constants";

import { trpcClient } from "@/utils/trpc";

import { clearLocalDb, saveSettings, upsertRows } from "./local-db";
import { deviceStore, forgetDevice } from "./device";
import { readJson, writeJson } from "./kv";
import { onlineStore } from "./network";
import { observable } from "./observable";
import { flushOutbox, outboxStore } from "./outbox";
import { sessionStore, setSessionToken } from "./session";

export type SyncState = {
  syncing: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
};

const CURSOR_KEY = "cm.sync.since";
const LAST_SYNC_KEY = "cm.sync.last";
const MAX_PAGES = 20;

export const syncStore = observable<SyncState>({ syncing: false, lastSyncedAt: null, lastError: null });

export async function loadSyncState() {
  const lastSyncedAt = await readJson<string | null>(LAST_SYNC_KEY, null);
  syncStore.set((state) => ({ ...state, lastSyncedAt }));
}

function isSignedOut(error: unknown) {
  return error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED" && /signed out|not registered/i.test(error.message);
}

/** Downloads everything that changed since the last sync into the local store. */
async function pullChanges() {
  let since = await readJson<string | null>(CURSOR_KEY, null);
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await trpcClient.sync.pull.mutate(since ? { since } : undefined);
    upsertRows("users", result.users);
    upsertRows("customers", result.customers);
    upsertRows("shifts", result.shifts);
    upsertRows("transactions", result.transactions);
    upsertRows("movements", result.movements);
    upsertRows("smsMessages", result.smsMessages);
    if (result.settings) saveSettings(result.settings);
    since = new Date(result.nextSince).toISOString();
    await writeJson(CURSOR_KEY, since);
    if (!result.hasMore) break;
  }
}

/** After an offline unlock, gets a server session with the PIN kept in memory. */
async function restoreServerSession() {
  const session = sessionStore.get();
  if (!session || session.sessionToken) return;
  try {
    const result = await trpcClient.auth.unlock.mutate({ userId: session.user.id, pin: session.pin });
    setSessionToken(result.sessionToken);
  } catch {
    // Wrong or changed PIN: stay in offline mode until the next unlock.
  }
}

let running: Promise<void> | null = null;

/** Sends queued changes, then fetches new ones. Safe to call often; runs one at a time. */
export function syncNow(): Promise<void> {
  if (running) return running;
  if (!deviceStore.get() || !onlineStore.get()) return Promise.resolve();

  running = (async () => {
    syncStore.set((state) => ({ ...state, syncing: true }));
    try {
      await flushOutbox();
      await pullChanges();
      await restoreServerSession();
      await trpcClient.devices.heartbeat.mutate({
        appVersion: Constants.expoConfig?.version,
        pendingSyncCount: outboxStore.get().length,
      });
      const lastSyncedAt = new Date().toISOString();
      await writeJson(LAST_SYNC_KEY, lastSyncedAt);
      syncStore.set({ syncing: false, lastSyncedAt, lastError: null });
    } catch (error) {
      if (isSignedOut(error)) {
        // Coline signed this phone out (lost or replaced): wipe it back to setup.
        await clearLocalDb();
        await forgetDevice();
      }
      const message = error instanceof Error ? error.message : "Sync failed";
      syncStore.set((state) => ({ ...state, syncing: false, lastError: message }));
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Syncs every minute while the app is open; returns a stop function. */
export function startSyncLoop(intervalMs = 60_000) {
  void syncNow();
  const timer = setInterval(() => void syncNow(), intervalMs);
  return () => clearInterval(timer);
}
