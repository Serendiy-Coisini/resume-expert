import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  AnalysisResult,
  OptimizeStyle,
  StepId,
  UserInput,
} from "@/types/resume";
import { safeBrowserStorage } from "@/lib/safe-storage";

const MAX_SESSIONS = 20;

export interface HistorySession {
  id: string;
  createdAt: number;
  targetRole: string;
  jdExcerpt: string;
  userInput: UserInput;
  analysisResult: AnalysisResult;
  currentStep: StepId;
  maxReachedStepIndex: number;
  optimizeStyle: OptimizeStyle;
}

interface HistoryStore {
  sessions: HistorySession[];
  saveSession: (session: HistorySession) => void;
  deleteSession: (id: string) => void;
  clearAll: () => void;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      sessions: [],

      saveSession: (session) =>
        set((state) => {
          const rest = state.sessions.filter((s) => s.id !== session.id);
          return { sessions: [session, ...rest].slice(0, MAX_SESSIONS) };
        }),

      deleteSession: (id) =>
        set((state) => ({ sessions: state.sessions.filter((s) => s.id !== id) })),

      clearAll: () => set({ sessions: [] }),
    }),
    {
      name: "resume-expert-history",
      version: 1,
      storage: createJSONStorage(() => safeBrowserStorage),
    }
  )
);
