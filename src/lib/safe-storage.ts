import type { StateStorage } from "zustand/middleware";
import { useSyncExternalStore } from "react";

const memoryFallback = new Map<string, string>();
const pendingWrites = new Set<string>();
const listeners = new Set<() => void>();

function notifyVolatileChange() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error("Storage listener error:", e);
    }
  });
}

/**
 * 订阅存储写入失败/内存兜底状态变动。
 */
export function subscribeStorageVolatile(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 查询指定或任意存储条目是否处于临时内存兜底（写入 localStorage 失败）状态。
 */
export function isStorageVolatile(name?: string): boolean {
  if (name) return pendingWrites.has(name);
  return pendingWrites.size > 0;
}

/**
 * 响应式 Hook：组件订阅当前浏览器存储写满或不可用的状态变动。
 */
export function useIsStorageVolatile(name?: string): boolean {
  return useSyncExternalStore(
    subscribeStorageVolatile,
    () => isStorageVolatile(name),
    () => false
  );
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
    const wasVolatile = pendingWrites.has(name);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(name, value);
        if (wasVolatile) {
          pendingWrites.delete(name);
          notifyVolatileChange();
        }
      }
    } catch {
      if (!wasVolatile) {
        pendingWrites.add(name);
        notifyVolatileChange();
      }
    }
  },
  removeItem: (name) => {
    memoryFallback.delete(name);
    const wasVolatile = pendingWrites.has(name);
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(name);
      if (wasVolatile) {
        pendingWrites.delete(name);
        notifyVolatileChange();
      }
    } catch {
      if (!wasVolatile) {
        pendingWrites.add(name);
        notifyVolatileChange();
      }
    }
  },
};
