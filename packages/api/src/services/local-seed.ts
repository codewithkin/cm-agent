import { phoneSchema } from "../lib/phone";
import { hashSecret, pinFields } from "../lib/secrets";
import { applyDemoData, hasDemoData } from "./demo";
import type { Db } from "./types";

/** Sign-in for the local owner account. Development only; never created in production. */
export const LOCAL_OWNER = {
  name: "Coline Murahwa",
  phone: "0771234567",
  password: "localdev123",
  pin: "1234",
} as const;

/**
 * Local development: makes sure there's an owner to sign in with and that the
 * demo week is there, so the app always has something to show.
 */
export async function seedLocal(db: Db) {
  let owner = await db.user.findFirst({ where: { role: "OWNER" } });
  let createdOwner = false;
  if (!owner) {
    owner = await db.user.create({
      data: {
        name: LOCAL_OWNER.name,
        role: "OWNER",
        phone: phoneSchema.parse(LOCAL_OWNER.phone),
        passwordHash: await hashSecret(LOCAL_OWNER.password),
        ...(await pinFields(LOCAL_OWNER.pin)),
      },
    });
    createdOwner = true;
  }
  const demo = (await hasDemoData(db)).active ? null : await applyDemoData(db, owner.id);
  return { createdOwner, demo };
}
