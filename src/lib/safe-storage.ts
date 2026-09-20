import type { StateStorage } from "zustand/middleware";

const memoryFallback = new Map<string, string>();

/** Browser storage that keeps the current session usable when localStorage is unavailable or full. */
export const safeBrowserStorage: StateStorage = {
  getItem: (name) => {
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
      if (typeof window !== "undefined") window.localStorage.setItem(name, value);
    } catch {
      // Memory fallback already contains the latest state for this session.
    }
  },
  removeItem: (name) => {
    memoryFallback.delete(name);
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(name);
    } catch {
      // The in-memory copy has still been removed.
    }
  },
};
