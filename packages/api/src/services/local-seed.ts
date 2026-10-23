import { applyDemoData, hasDemoData } from "./demo";
import { ensureOwner } from "./owner";
import type { Db } from "./types";

/**
 * Local development: makes sure Coline's account exists and that the demo week
 * is there, so the app always has something to show.
 */
export async function seedLocal(db: Db, startingPassword: string) {
  const { owner, created } = await ensureOwner(db, startingPassword);
  const demo = (await hasDemoData(db)).active ? null : await applyDemoData(db, owner.id);
  return { createdOwner: created, demo };
}
