import type { Database } from "@cm-agent/db";

export type Context = {
  db: Database;
  /** Identifies a registered phone. Sent as `Authorization: Bearer <token>`. */
  deviceToken: string | null;
  /** Identifies who unlocked the phone with their PIN. Sent as `x-session-token`. */
  sessionToken: string | null;
  /** Secret needed once to create the owner account. */
  ownerSetupCode: string;
};
