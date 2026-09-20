"use client";

import { useCallback, useEffect, useRef } from "react";
import { useResumeStore } from "@/store/resume-store";

/** An upload owns only the input revision at which it began. */
export function useInputTask(enabled = true, localRevision?: unknown) {
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!enabled) active.current?.abort();
    return () => active.current?.abort();
  }, [enabled, localRevision]);
  return useCallback(() => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const { sessionId, inputRevision } = useResumeStore.getState();
    const unchanged = () => {
      const state = useResumeStore.getState();
      return state.sessionId === sessionId && state.inputRevision === inputRevision;
    };
    const unsubscribe = useResumeStore.subscribe(() => { if (!unchanged()) controller.abort(); });
    controller.signal.addEventListener("abort", unsubscribe, { once: true });
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(60_000)]);
    return {
      signal,
      isCurrent: () => active.current === controller && !signal.aborted && unchanged(),
      canReportError: () => active.current === controller && !controller.signal.aborted && unchanged(),
      owns: () => active.current === controller,
      finish: () => { unsubscribe(); if (active.current === controller) active.current = null; },
    };
  }, []);
}
