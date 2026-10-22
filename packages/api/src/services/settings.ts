import type { Db } from "./types";

export const SETTINGS_ID = "default";

/** The single settings row, created with defaults the first time it is read. */
export function getSettings(db: Db) {
  return db.businessSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
  });
}
