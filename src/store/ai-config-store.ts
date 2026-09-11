import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserAIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  providerId: string;
  provider?: string;
}

interface AIConfigState {
  config: UserAIConfig;
  hasHydrated: boolean;
  setConfig: (config: Partial<UserAIConfig>) => void;
  resetConfig: () => void;
  setHasHydrated: (state: boolean) => void;
}

const DEFAULT_CONFIG: UserAIConfig = {
  apiKey: "",
  baseUrl: "https://api.deepseek.com/v1",
  model: "deepseek-chat",
  providerId: "deepseek",
  provider: "openai",
};

export const useAIConfigStore = create<AIConfigState>()(
  persist(
    (set) => ({
      config: DEFAULT_CONFIG,
      hasHydrated: false,
      setConfig: (newConfig) =>
        set((state) => ({
          config: {
            ...state.config,
            ...newConfig,
          },
        })),
      resetConfig: () =>
        set({
          config: { ...DEFAULT_CONFIG },
        }),
      setHasHydrated: (state) => set({ hasHydrated: state }),
    }),
    {
      name: "resume_expert_user_ai_config",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/**
 * Synchronously retrieves the current user AI config from localStorage (or store state).
 * Safe to call in browser environments.
 */
export function getUserAIConfig(): UserAIConfig | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem("resume_expert_user_ai_config");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const cfg = parsed?.state?.config;
    if (cfg && typeof cfg === "object" && cfg.apiKey?.trim()) {
      return {
        apiKey: cfg.apiKey.trim(),
        baseUrl: (cfg.baseUrl || "").trim(),
        model: (cfg.model || "").trim(),
        providerId: (cfg.providerId || "").trim(),
        provider: (cfg.provider || "openai").trim(),
      };
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

/**
 * Generates custom request headers carrying user AI credentials safely.
 * If the user has not configured an API key in localStorage, returns an empty object.
 */
export function getAIHeaders(): Record<string, string> {
  const userConfig = getUserAIConfig();
  if (!userConfig || !userConfig.apiKey) {
    return {};
  }

  return {
    "x-llm-config": encodeURIComponent(
      JSON.stringify({
        apiKey: userConfig.apiKey,
        baseUrl: userConfig.baseUrl,
        model: userConfig.model,
        providerId: userConfig.providerId,
        provider: userConfig.provider || "openai",
      })
    ),
  };
}
