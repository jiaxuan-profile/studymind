// src/config/subscriptionConfig.ts
import { SubscriptionTier } from '../types';

export interface SubscriptionFeatures {
  dailyNoteLimit: number;
  aiAnalysisEnabled: boolean;
  pdfUploadEnabled: boolean;
  maxPdfSizeMB: number;
  questionGenerationEnabled: boolean;
  conceptExtractionEnabled: boolean;
  knowledgeGapAnalysisEnabled: boolean;
}

export const SUBSCRIPTION_FEATURES: Record<SubscriptionTier, SubscriptionFeatures> = {
  standard: {
    dailyNoteLimit: 2,
    aiAnalysisEnabled: false,
    pdfUploadEnabled: false,
    maxPdfSizeMB: 0,
    questionGenerationEnabled: false,
    conceptExtractionEnabled: false,
    knowledgeGapAnalysisEnabled: false,
  },
  pro: {
    dailyNoteLimit: Infinity,
    aiAnalysisEnabled: true,
    pdfUploadEnabled: true,
    maxPdfSizeMB: 50,
    questionGenerationEnabled: true,
    conceptExtractionEnabled: true,
    knowledgeGapAnalysisEnabled: true,
  },
};

export function getSubscriptionFeatures(tier: SubscriptionTier): SubscriptionFeatures {
  return SUBSCRIPTION_FEATURES[tier];
}

export function canGenerateQuestions(tier: SubscriptionTier): boolean {
  return SUBSCRIPTION_FEATURES[tier].questionGenerationEnabled;
}

export function canUseAIFeatures(tier: SubscriptionTier): boolean {
  return SUBSCRIPTION_FEATURES[tier].aiAnalysisEnabled;
}