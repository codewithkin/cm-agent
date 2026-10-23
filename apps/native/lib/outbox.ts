import { trpcClient, type RouterInputs } from "@/utils/trpc";

import { readJson, writeJson } from "./kv";
import { observable } from "./observable";

export type OutboxOperation = RouterInputs["sync"]["push"]["operations"][number];

export type OutboxItem = {
  operation: OutboxOperation;
  queuedAt: string;
  attempts: number;
  /** Set when the server refused the operation; it stays queued so the owner can see it. */
  lastError?: string;
};

const KEY = "cm.outbox";
const BATCH = 100;

/** Changes made on this phone that the server hasn't confirmed yet. */
export const outboxStore = observable<OutboxItem[]>([]);

export async function loadOutbox() {
  outboxStore.set(await readJson<OutboxItem[]>(KEY, []));
}

function persist() {
  void writeJson(KEY, outboxStore.get());
}

export function enqueue(operation: OutboxOperation) {
  outboxStore.set((items) => [...items, { operation, queuedAt: new Date().toISOString(), attempts: 0 }]);
  persist();
}

export function pendingCount() {
  return outboxStore.get().length;
}

/**
 * Sends queued changes in the order they happened. Confirmed ones leave the
 * queue; refused ones stay with the server's message. Throws on network errors.
 */
export async function flushOutbox(): Promise<{ sent: number; failed: number }> {
  const queued = outboxStore.get();
  if (queued.length === 0) return { sent: 0, failed: 0 };

  const batch = queued.slice(0, BATCH);
  const { results } = await trpcClient.sync.push.mutate({
    operations: batch.map((item) => item.operation),
  });

  // Results carry their position in the batch; an open and a close of the same
  // shift share an id, so match by position rather than by id.
  const outcome = new Map<OutboxItem, string | null>();
  for (const result of results) {
    const item = batch[result.index];
    if (item) outcome.set(item, result.status === "error" ? (result.message ?? "Refused by the server") : null);
  }

  outboxStore.set((items) =>
    items.flatMap((item) => {
      if (!outcome.has(item)) return [item];
      const error = outcome.get(item);
      return error ? [{ ...item, attempts: item.attempts + 1, lastError: error }] : [];
    }),
  );
  persist();
  const failed = [...outcome.values()].filter(Boolean).length;
  return { sent: outcome.size - failed, failed };
}
