import type { AuditAction, Prisma } from "@cm-agent/db";

export type AuditEntity =
  | "BusinessSettings"
  | "Device"
  | "Movement"
  | "Shift"
  | "SmsMessage"
  | "Transaction"
  | "User";

export type AuditEntry = {
  actorId: string;
  deviceId?: string | null;
  entity: AuditEntity;
  entityId: string;
  action: AuditAction;
  /** Never pass secrets (hashes, tokens) or signatures here. */
  before?: unknown;
  after?: unknown;
  reason?: string | null;
};

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function recordAudit(db: Prisma.TransactionClient, entry: AuditEntry) {
  return db.auditEvent.create({
    data: {
      actorId: entry.actorId,
      deviceId: entry.deviceId ?? null,
      entity: entry.entity,
      entityId: entry.entityId,
      action: entry.action,
      before: toJson(entry.before),
      after: toJson(entry.after),
      reason: entry.reason ?? null,
    },
  });
}
