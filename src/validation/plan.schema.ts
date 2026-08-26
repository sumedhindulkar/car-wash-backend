import { z } from 'zod';
import { PLAN_TYPES } from '../constants/plan';
import { GeneratedPlan, GeneratePlanInput } from '../types/plan';
import { nonEmptyString, parseSchema, slugArraySchema } from './common';

const washModificationSchema = z.object({
  week: z
    .number({ error: 'week must be a positive integer' })
    .int('week must be a positive integer')
    .min(1, 'week must be a positive integer'),
  washNumber: z
    .number({ error: 'washNumber must be a positive integer' })
    .int('washNumber must be a positive integer')
    .min(1, 'washNumber must be a positive integer'),
  addFeatures: slugArraySchema('addFeatures'),
});

export const generatePlanSchema = z.object({
  serviceId: nonEmptyString('serviceId is required'),
  planType: z.enum(PLAN_TYPES, { error: 'Invalid plan type' }),
  selectedFeatures: slugArraySchema('selectedFeatures'),
  washModifications: z
    .array(washModificationSchema, {
      error: 'washModifications must be an array',
    })
    .default([]),
});

export const verifyPlanSchema = generatePlanSchema.extend({
  weeks: z.array(z.any(), {
    error: 'Submitted plan weeks are required',
  }),
  totalPrice: z.number({
    error: 'Submitted plan totalPrice is required',
  }),
  totalDurationMinutes: z.number().optional(),
  totalWashes: z.number().optional(),
  discountPercent: z.number().optional(),
});

export function parseGeneratePlanInput(input: unknown): GeneratePlanInput {
  return parseSchema(generatePlanSchema, input);
}

export function parseSubmittedPlan(input: unknown): GeneratedPlan {
  const parsed = parseSchema(verifyPlanSchema, input);

  return {
    serviceId: parsed.serviceId,
    planType: parsed.planType,
    selectedFeatures: parsed.selectedFeatures,
    washModifications: parsed.washModifications,
    discountPercent: parsed.discountPercent ?? Number.NaN,
    weeks: parsed.weeks as GeneratedPlan['weeks'],
    totalPrice: parsed.totalPrice,
    totalDurationMinutes: parsed.totalDurationMinutes ?? Number.NaN,
    totalWashes: parsed.totalWashes ?? Number.NaN,
  };
}
