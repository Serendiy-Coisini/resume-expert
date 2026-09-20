import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useResumeStore } from "@/store/resume-store";
import { safeBrowserStorage } from "@/lib/safe-storage";

export interface UserAIConfig {
  serverAccessToken?: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  providerId: string;
  provider?: string;
}

interface AIConfigState {
  config: UserAIConfig;
  forceMock: boolean;
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
      forceMock: false,
      hasHydrated: false,
      setConfig: (newConfig) =>
        set((state) => ({
          forceMock: false,
          config: {
            ...state.config,
            ...newConfig,
          },
        })),
      resetConfig: () =>
        set({
          config: { ...DEFAULT_CONFIG },
          forceMock: true,
        }),
      setHasHydrated: (state) => set({ hasHydrated: state }),
    }),
    {
      name: "resume_expert_user_ai_config",
      storage: createJSONStorage(() => safeBrowserStorage),
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
    const stored = safeBrowserStorage.getItem("resume_expert_user_ai_config");
    if (typeof stored === "string") {
      const parsed = JSON.parse(stored);
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
    }
  } catch {
    // ignore parse errors
  }
  const config = useAIConfigStore.getState().config;
  return config.apiKey.trim() ? { ...config, apiKey: config.apiKey.trim() } : null;
}

/**
 * Generates custom request headers carrying user AI credentials safely.
 * If the user has not configured an API key in localStorage, returns an empty object.
 */
export function getAIHeaders(): Record<string, string> {
  const privacyHeaders = { "x-pii-mask": useResumeStore.getState().enablePIIMasking ? "on" : "off" };
  if (useAIConfigStore.getState().forceMock) return { ...privacyHeaders, "x-ai-mode": "mock" };
  const userConfig = getUserAIConfig();
  if (!userConfig || !userConfig.apiKey) {
    const token = useAIConfigStore.getState().config.serverAccessToken?.trim();
    return token ? { ...privacyHeaders, "x-server-access-token": token } : privacyHeaders;
  }

  return {
    ...privacyHeaders,
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
