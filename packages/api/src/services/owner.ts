import { TRPCError } from "@trpc/server";

import { verifySecret } from "../lib/secrets";
import type { Db } from "./types";

/** Checks the owner's phone and password. Fails with one message so it does not reveal which was wrong. */
export async function verifyOwnerCredentials(db: Db, phone: string, password: string) {
  const owner = await db.user.findFirst({ where: { phone, role: "OWNER", active: true } });
  if (!owner?.passwordHash || !(await verifySecret(password, owner.passwordHash))) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Wrong phone number or password" });
  }
  return owner;
}
