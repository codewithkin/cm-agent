import { TRPCError } from "@trpc/server";

import { hashSecret, pinFields, verifySecret } from "../lib/secrets";
import type { Db } from "./types";

/**
 * Coline's account as first created. She can change the phone number and the
 * password later in Settings; the starting password is OWNER_SETUP_CODE.
 */
export const DEFAULT_OWNER = {
  name: "Coline Murahwa",
  phone: "+263775101506",
} as const;

/** Her first PIN is the last 4 digits of her phone number; she must change it on first unlock. */
export const DEFAULT_OWNER_PIN = DEFAULT_OWNER.phone.slice(-4);

/** Creates Coline's owner account if there isn't one yet. Safe to call on every start. */
export async function ensureOwner(db: Db, startingPassword: string) {
  const existing = await db.user.findFirst({ where: { role: "OWNER" } });
  if (existing) return { owner: existing, created: false };
  const owner = await db.user.create({
    data: {
      name: DEFAULT_OWNER.name,
      phone: DEFAULT_OWNER.phone,
      role: "OWNER",
      passwordHash: await hashSecret(startingPassword),
      ...(await pinFields(DEFAULT_OWNER_PIN)),
      mustChangePin: true,
    },
  });
  return { owner, created: true };
}

/** Checks the owner's phone and password. Fails with one message so it does not reveal which was wrong. */
export async function verifyOwnerCredentials(db: Db, phone: string, password: string) {
  const owner = await db.user.findFirst({ where: { phone, role: "OWNER", active: true } });
  if (!owner?.passwordHash || !(await verifySecret(password, owner.passwordHash))) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Wrong phone number or password" });
  }
  return owner;
}
