import { z } from "zod";

// Zod versions of the Prisma enums in packages/db/prisma/schema/enums.prisma.

export const currencySchema = z.enum(["USD", "ZIG"]);

export const transactionTypeSchema = z.enum(["CASH_IN", "CASH_OUT"]);

export const matchStateSchema = z.enum(["MATCHED", "NO_SMS", "MISMATCH", "MANUAL"]);

export const movementKindSchema = z.enum([
  "FLOAT_BOUGHT",
  "CASH_DEPOSITED",
  "CASH_ADDED",
  "CASH_REMOVED",
  "FLOAT_ADDED",
  "FLOAT_REMOVED",
]);

export const deviceKindSchema = z.enum(["BOOTH", "OWNER"]);
