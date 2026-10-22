import type { Prisma, Role } from "@cm-agent/db";

/** The Prisma client, or a client inside `$transaction`. */
export type Db = Prisma.TransactionClient;

/** Who is doing something, and on which phone. */
export type Actor = {
  userId: string;
  role: Role;
  deviceId: string;
};
