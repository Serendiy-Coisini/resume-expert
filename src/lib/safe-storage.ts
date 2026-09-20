import type { StateStorage } from "zustand/middleware";

const memoryFallback = new Map<string, string>();
const pendingWrites = new Set<string>();

export function isStorageVolatile(name: string): boolean {
  return pendingWrites.has(name);
}

/** Browser storage that keeps the current session usable when localStorage is unavailable or full. */
export const safeBrowserStorage: StateStorage = {
  getItem: (name) => {
    if (pendingWrites.has(name)) return memoryFallback.get(name) ?? null;
    try {
      const value = typeof window === "undefined" ? null : window.localStorage.getItem(name);
      if (value !== null) memoryFallback.set(name, value);
      return value ?? memoryFallback.get(name) ?? null;
    } catch {
      return memoryFallback.get(name) ?? null;
    }
  },
  setItem: (name, value) => {
    memoryFallback.set(name, value);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(name, value);
        pendingWrites.delete(name);
      }
    } catch {
      pendingWrites.add(name);
    }
  },
  removeItem: (name) => {
    memoryFallback.delete(name);
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(name);
      pendingWrites.delete(name);
    } catch {
      pendingWrites.add(name);
    }
  },
};
