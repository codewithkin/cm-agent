import { TRPCClientError } from "@trpc/client";
import * as Crypto from "expo-crypto";

import { trpcClient } from "@/utils/trpc";

import { localDb } from "./local-db";
import { onlineStore } from "./network";
import { startSession } from "./session";

/** Same check the server's offline verifier allows: sha256(`${salt}:${pin}`). */
export async function checkPinOffline(pin: string, pinSalt: string, pinVerifier: string) {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${pinSalt}:${pin}`);
  return digest.toLowerCase() === pinVerifier.toLowerCase();
}

export type UnlockResult = { ok: true } | { ok: false; message: string };

function isNetworkError(error: unknown) {
  return error instanceof TRPCClientError && !error.data;
}

/**
 * Unlocks the phone for one person. Online, the server checks the PIN (and its
 * 5-tries lockout); offline, or if the server can't be reached, the phone
 * checks it against the synced verifier.
 */
export async function unlockWithPin(userId: string, pin: string): Promise<UnlockResult> {
  const user = localDb.get().users[userId];

  if (onlineStore.get()) {
    try {
      const result = await trpcClient.auth.unlock.mutate({ userId, pin });
      startSession({ user: result.user, sessionToken: result.sessionToken, pin });
      return { ok: true };
    } catch (error) {
      if (!isNetworkError(error)) {
        return { ok: false, message: error instanceof Error ? error.message : "Wrong PIN" };
      }
    }
  }

  if (!user) return { ok: false, message: "Connect to the internet once to set up this person" };
  if (user.pinLockedUntil && new Date(user.pinLockedUntil) > new Date()) {
    return { ok: false, message: "Too many wrong PINs. Ask Coline to reset your PIN." };
  }
  if (!(await checkPinOffline(pin, user.pinSalt, user.pinVerifier))) {
    return { ok: false, message: "Wrong PIN" };
  }
  startSession({
    user: { id: user.id, name: user.name, role: user.role, mustChangePin: user.mustChangePin },
    sessionToken: null,
    pin,
  });
  return { ok: true };
}

/** Coline's PIN check before she counts money on a helper's phone. Never changes the session. */
export async function verifyOwnerPin(pin: string): Promise<{ ownerId: string } | null> {
  const owner = Object.values(localDb.get().users).find((user) => user.role === "OWNER" && user.active);
  if (!owner) return null;
  return (await checkPinOffline(pin, owner.pinSalt, owner.pinVerifier)) ? { ownerId: owner.id } : null;
}
