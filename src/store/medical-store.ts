import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MedicalAnalysisResult, MedicalUserInput } from "@/types/medical";
import { MEDICAL_PRESETS, PRESET_PREVENTIVE_PUBLIC_HEALTH } from "@/lib/medical-presets";
import { enrichMedicalResult } from "@/lib/medical-enricher";

export type MedicalTabId = "input" | "ps" | "cv" | "email" | "interview" | "guide";

interface MedicalState {
  medicalInput: MedicalUserInput;
  analysisResult: MedicalAnalysisResult | null;
  activePresetId: string | null;
  activeTab: MedicalTabId;
  isAnalyzing: boolean;
  analysisError: string | null;

  setMedicalInput: (input: Partial<MedicalUserInput>) => void;
  loadPreset: (presetId: string) => void;
  setActiveTab: (tab: MedicalTabId) => void;
  setAnalysisResult: (result: MedicalAnalysisResult | null) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setAnalysisError: (error: string | null) => void;
  updateOptimizedPSSection: (index: number, text: string) => void;
  updateFullOptimizedPS: (text: string) => void;
  updateEmailDraft: (bodyText: string) => void;
  clearAllInputs: () => void;
  reset: () => void;
}

const defaultUserInput: MedicalUserInput = {
  name: "",
  undergradSchool: "",
  major: "",
  gpaRank: "",
  englishLevel: "",
  phone: "",
  email: "",
  track: "preventive-public-health",
  goalScene: "contact-mentor",
  targetUniversity: "",
  applicationStage: "",
  preventiveSubSpecialty: "",
  mentorName: "",
  targetHospital: "",
  targetDepartment: "",
  mentorResearchDirection: "",
  mentorKeyPaper: "",
  originalPS: "",
  originalResume: "",
  additionalNotes: "",
};

export const useMedicalStore = create<MedicalState>()(
  persist(
    (set) => ({
      medicalInput: defaultUserInput,
      analysisResult: null,
      activePresetId: null,
      activeTab: "input",
      isAnalyzing: false,
      analysisError: null,

      setMedicalInput: (input) =>
        set((state) => ({
          medicalInput: { ...state.medicalInput, ...input },
        })),

      loadPreset: (presetId: string) => {
        const preset = MEDICAL_PRESETS.find((p) => p.id === presetId) || PRESET_PREVENTIVE_PUBLIC_HEALTH;
        set({
          medicalInput: { ...preset.userInput },
          analysisResult: null, // 清空离线缓存，引导用户点击调用真实 AI 进行大模型优化
          activePresetId: preset.id,
          activeTab: "input",
          analysisError: null,
        });
      },

      setActiveTab: (tab) => set({ activeTab: tab }),

      setAnalysisResult: (result) =>
        set((state) => ({
          analysisResult: result ? enrichMedicalResult(result, state.medicalInput) : null,
          analysisError: null,
        })),

      setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),

      setAnalysisError: (error) => set({ analysisError: error, isAnalyzing: false }),

      updateOptimizedPSSection: (index, text) =>
        set((state) => {
          if (!state.analysisResult?.psDiagnosis?.sections) return state;
          const updatedSections = [...state.analysisResult.psDiagnosis.sections];
          if (updatedSections[index]) {
            updatedSections[index] = { ...updatedSections[index], optimizedText: text };
          }
          const fullOptimized = updatedSections.map((s) => s.optimizedText).join("\n\n");
          return {
            analysisResult: {
              ...state.analysisResult,
              psDiagnosis: {
                ...state.analysisResult.psDiagnosis,
                sections: updatedSections,
                fullOptimizedPS: fullOptimized,
              },
            },
          };
        }),

      updateFullOptimizedPS: (text) =>
        set((state) => {
          if (!state.analysisResult?.psDiagnosis) return state;
          return {
            analysisResult: {
              ...state.analysisResult,
              psDiagnosis: {
                ...state.analysisResult.psDiagnosis,
                fullOptimizedPS: text,
              },
            },
          };
        }),

      updateEmailDraft: (bodyText) =>
        set((state) => {
          if (!state.analysisResult?.mentorEmail) return state;
          return {
            analysisResult: {
              ...state.analysisResult,
              mentorEmail: {
                ...state.analysisResult.mentorEmail,
                bodyText,
              },
            },
          };
        }),

      clearAllInputs: () =>
        set({
          medicalInput: { ...defaultUserInput },
          analysisResult: null,
          activePresetId: null,
          activeTab: "input",
          isAnalyzing: false,
          analysisError: null,
        }),

      reset: () =>
        set({
          medicalInput: defaultUserInput,
          analysisResult: null,
          activePresetId: null,
          activeTab: "input",
          isAnalyzing: false,
          analysisError: null,
        }),
    }),
    {
      name: "medical-resume-expert-storage",
      partialize: (state) => ({
        medicalInput: state.medicalInput,
        analysisResult: state.analysisResult,
        activePresetId: state.activePresetId,
        activeTab: state.activeTab,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const currentInput = { ...(state.medicalInput || {}) };

          // If stored input contains legacy preset mock data, wipe clean to prevent contamination of user results
          const isPresetSampleData =
            currentInput.name === "周思敏" ||
            currentInput.name === "陈书涵" ||
            currentInput.name === "林逸舟" ||
            (Boolean(currentInput.originalPS) &&
              (currentInput.originalPS.includes("周思敏") ||
                currentInput.originalPS.includes("2.4万人") ||
                currentInput.originalPS.includes("2.4 万"))) ||
            (Boolean(currentInput.originalResume) &&
              (currentInput.originalResume.includes("周思敏") ||
                currentInput.originalResume.includes("2.4万人") ||
                currentInput.originalResume.includes("2.4 万"))) ||
            (Boolean(currentInput.mentorName) &&
              (currentInput.mentorName.includes("高建华") ||
                currentInput.mentorName.includes("李维新") ||
                currentInput.mentorName.includes("沈宏宇")));

          if (isPresetSampleData) {
            state.medicalInput = { ...defaultUserInput };
            state.analysisResult = null;
            state.activePresetId = null;
            state.activeTab = "input";
            return;
          }

          if (
            !state.activePresetId &&
            currentInput.targetUniversity === "北京大学公共卫生学院" &&
            currentInput.targetDepartment === "流行病与卫生统计学系"
          ) {
            currentInput.targetUniversity = "";
            currentInput.targetDepartment = "";
            currentInput.targetHospital = "";
            currentInput.mentorResearchDirection = "";
            currentInput.preventiveSubSpecialty = "";
          }

          state.medicalInput = {
            ...defaultUserInput,
            ...currentInput,
            originalPS: currentInput.originalPS || "",
            originalResume: currentInput.originalResume || "",
          };

          if (state.analysisResult) {
            state.analysisResult = enrichMedicalResult(state.analysisResult, state.medicalInput);
          }
        }
      },
    }
  )
);

