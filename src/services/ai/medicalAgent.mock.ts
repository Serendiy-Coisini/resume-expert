import type { MedicalAnalysisResult, MedicalUserInput } from "@/types/medical";
import { enrichMedicalResult } from "@/lib/medical-enricher";
import { delay } from "@/lib/utils";

export async function runMockMedicalAnalysis(input: MedicalUserInput): Promise<MedicalAnalysisResult> {
  // Simulate AI network delay
  await delay(800);
  return enrichMedicalResult(null, input);
}
