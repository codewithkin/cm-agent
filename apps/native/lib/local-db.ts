import { useMemo } from "react";

import type { RouterOutputs } from "@/utils/trpc";

import { readJson, writeJson } from "./kv";
import { observable, useObservable } from "./observable";

type Pull = RouterOutputs["sync"]["pull"];

/** Records as they come from sync.pull (dates are ISO strings over the wire). */
export type LocalUser = Pull["users"][number];
export type LocalCustomer = Pull["customers"][number];
export type LocalShift = Pull["shifts"][number];
export type LocalTransaction = Pull["transactions"][number] & { pending?: boolean };
export type LocalMovement = Pull["movements"][number] & { pending?: boolean };
export type LocalSms = Pull["smsMessages"][number] & { pending?: boolean };
export type LocalSettings = NonNullable<Pull["settings"]>;

type Tables = {
  users: Record<string, LocalUser>;
  customers: Record<string, LocalCustomer>;
  shifts: Record<string, LocalShift>;
  transactions: Record<string, LocalTransaction>;
  movements: Record<string, LocalMovement>;
  smsMessages: Record<string, LocalSms>;
};

export type TableName = keyof Tables;
type Row<K extends TableName> = Tables[K][string];

const EMPTY: Tables = {
  users: {},
  customers: {},
  shifts: {},
  transactions: {},
  movements: {},
  smsMessages: {},
};
const TABLE_NAMES = Object.keys(EMPTY) as TableName[];

/**
 * The booth phone's own copy of its records, so every screen works offline.
 * Filled by sync.pull and by changes made on the phone; saved to SQLite.
 */
export const localDb = observable<Tables>(EMPTY);
export const localSettings = observable<LocalSettings | null>(null);

const dirty = new Set<TableName>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    const tables = localDb.get();
    const names = [...dirty];
    dirty.clear();
    await Promise.all(names.map((name) => writeJson(`cm.db.${name}`, tables[name])));
  }, 300);
}

export async function loadLocalDb() {
  const loaded = await Promise.all(TABLE_NAMES.map((name) => readJson(`cm.db.${name}`, {})));
  localDb.set(Object.fromEntries(TABLE_NAMES.map((name, i) => [name, loaded[i]])) as Tables);
  localSettings.set(await readJson<LocalSettings | null>("cm.db.settings", null));
}

/** Inserts or replaces rows by id. */
export function upsertRows<K extends TableName>(table: K, rows: Row<K>[]) {
  if (rows.length === 0) return;
  localDb.set((current) => {
    const next = { ...current[table] } as Tables[K];
    for (const row of rows) (next as Record<string, Row<K>>)[row.id] = row;
    return { ...current, [table]: next };
  });
  dirty.add(table);
  scheduleSave();
}

export function patchRow<K extends TableName>(table: K, id: string, patch: Partial<Row<K>>) {
  const existing = localDb.get()[table][id];
  if (!existing) return;
  upsertRows(table, [{ ...existing, ...patch } as Row<K>]);
}

export function saveSettings(settings: LocalSettings) {
  localSettings.set(settings);
  void writeJson("cm.db.settings", settings);
}

/** Wipes everything, e.g. when the phone is signed out. */
export async function clearLocalDb() {
  localDb.set(EMPTY);
  localSettings.set(null);
  await Promise.all([
    ...TABLE_NAMES.map((name) => writeJson(`cm.db.${name}`, {})),
    writeJson("cm.db.settings", null),
  ]);
}

/**
 * Rows of one table, filtered and sorted, re-rendering when the table changes.
 * Pass the values the filter reads (like a shift id) in `deps`.
 */
export function useRows<K extends TableName>(
  table: K,
  filter?: (row: Row<K>) => boolean,
  sort?: (a: Row<K>, b: Row<K>) => number,
  deps: unknown[] = [],
): Row<K>[] {
  const tables = useObservable(localDb);
  const rows = tables[table];
  return useMemo(() => {
    let list = Object.values(rows) as Row<K>[];
    if (filter) list = list.filter(filter);
    if (sort) list.sort(sort);
    return list;
    // Callers pass inline functions; recompute when the data or their deps change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, ...deps]);
}

export function useLocalSettings() {
  return useObservable(localSettings);
}
