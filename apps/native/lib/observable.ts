import { useSyncExternalStore } from "react";

export type Observable<T> = {
  get: () => T;
  set: (next: T | ((current: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
};

/** A small global value React components can subscribe to. */
export function observable<T>(initial: T): Observable<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next) {
      value = typeof next === "function" ? (next as (current: T) => T)(value) : next;
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useObservable<T>(store: Observable<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
