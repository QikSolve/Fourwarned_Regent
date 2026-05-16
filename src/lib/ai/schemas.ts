import { z } from 'zod';

/**
 * Zod schemas for validating AI outputs from the Scribe and Advisor layers.
 * These ensure the AI returns structured JSON the simulation can safely consume.
 */

export const AdvisorRecommendationSchema = z.object({
  advisor: z.string(),
  concern: z.string(),
  recommendation: z.string(),
  risk: z.string(),
});
export type AdvisorRecommendation = z.infer<typeof AdvisorRecommendationSchema>;

export const ScribeClarificationSchema = z.object({
  summary: z.string(),
  question: z.string(),
  options: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      tradeoff: z.string(),
    })
  ).min(2).max(4),
  conflicts: z.array(z.string()).optional(),
});
export type ScribeClarification = z.infer<typeof ScribeClarificationSchema>;

export const ScribeConsequenceSchema = z.object({
  summary: z.string(),
  consequences: z.array(
    z.object({
      aspect: z.string(),
      direction: z.enum(['improved', 'worsened', 'unchanged']),
      explanation: z.string(),
    })
  ),
  warnings: z.array(z.string()).optional(),
});
export type ScribeConsequence = z.infer<typeof ScribeConsequenceSchema>;

export const DecreeDraftSchema = z.object({
  title: z.string(),
  preamble: z.string(),
  decree: z.string(),
  seal: z.string(),
});
export type DecreeDraft = z.infer<typeof DecreeDraftSchema>;
