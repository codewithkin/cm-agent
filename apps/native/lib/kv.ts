import Storage from "expo-sqlite/kv-store";

/** JSON values in the phone's local SQLite key-value store. */
export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await Storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  await Storage.setItem(key, JSON.stringify(value));
}

export async function removeKey(key: string): Promise<void> {
  await Storage.removeItem(key);
}
