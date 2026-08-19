import { PLAN_CONFIG, isPlanType } from '../constants/plan';
import { HTTP_STATUS } from '../constants/http-status';
import { IServiceItem } from '../models/service.model';
import { findServiceById } from '../repositories/service.repository';
import {
  GeneratePlanInput,
  GeneratedPlan,
  VerifyPlanResult,
  WashModification,
} from '../types/plan';
import { AppError } from '../utils/app-error';
import { generateSchedule } from './plan-generator';
import { priceSchedule } from './plan-pricing';
import { comparePlans } from './plan-verifier';

function uniqueSlugs(slugs: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const slug of slugs) {
    if (!seen.has(slug)) {
      seen.add(slug);
      result.push(slug);
    }
  }

  return result;
}

function readStringArray(value: unknown, fieldName: string): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new AppError(`${fieldName} must be an array of slugs`, HTTP_STATUS.BAD_REQUEST);
  }

  return uniqueSlugs(
    value.map((slug) => slug.trim()).filter((slug) => slug.length > 0),
  );
}

function readWashModifications(value: unknown): WashModification[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new AppError(
      'washModifications must be an array',
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  return value.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new AppError(
        `washModifications[${index}] must be an object`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const modification = entry as {
      week?: unknown;
      washNumber?: unknown;
      addFeatures?: unknown;
    };

    if (
      typeof modification.week !== 'number' ||
      !Number.isInteger(modification.week) ||
      modification.week < 1
    ) {
      throw new AppError(
        `washModifications[${index}].week must be a positive integer`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    if (
      typeof modification.washNumber !== 'number' ||
      !Number.isInteger(modification.washNumber) ||
      modification.washNumber < 1
    ) {
      throw new AppError(
        `washModifications[${index}].washNumber must be a positive integer`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    return {
      week: modification.week,
      washNumber: modification.washNumber,
      addFeatures: readStringArray(
        modification.addFeatures,
        `washModifications[${index}].addFeatures`,
      ),
    };
  });
}

function parseGeneratePlanInput(input: unknown): GeneratePlanInput {
  if (typeof input !== 'object' || input === null) {
    throw new AppError('Request body is required', HTTP_STATUS.BAD_REQUEST);
  }

  const body = input as {
    serviceId?: unknown;
    planType?: unknown;
    selectedFeatures?: unknown;
    washModifications?: unknown;
  };

  if (typeof body.serviceId !== 'string' || body.serviceId.trim() === '') {
    throw new AppError('serviceId is required', HTTP_STATUS.BAD_REQUEST);
  }

  if (typeof body.planType !== 'string' || !isPlanType(body.planType)) {
    throw new AppError('Invalid plan type', HTTP_STATUS.BAD_REQUEST);
  }

  return {
    serviceId: body.serviceId.trim(),
    planType: body.planType,
    selectedFeatures: readStringArray(body.selectedFeatures, 'selectedFeatures'),
    washModifications: readWashModifications(body.washModifications),
  };
}

function buildActiveItemMap(items: IServiceItem[]): Map<string, IServiceItem> {
  const itemsBySlug = new Map<string, IServiceItem>();

  for (const item of items) {
    if (item.active) {
      itemsBySlug.set(item.slug, item);
    }
  }

  return itemsBySlug;
}

function resolveFeature(
  slug: string,
  itemsBySlug: Map<string, IServiceItem>,
  catalogSlugs: Set<string>,
): IServiceItem {
  const item = itemsBySlug.get(slug);
  if (item) {
    return item;
  }

  if (catalogSlugs.has(slug)) {
    throw new AppError(
      `Feature is not available: ${slug}`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  throw new AppError(`Unknown feature: ${slug}`, HTTP_STATUS.BAD_REQUEST);
}

function validateWashModifications(
  washModifications: WashModification[],
  planType: GeneratePlanInput['planType'],
  itemsBySlug: Map<string, IServiceItem>,
  catalogSlugs: Set<string>,
): void {
  const config = PLAN_CONFIG[planType];

  for (const modification of washModifications) {
    if (
      modification.week > config.weeks ||
      modification.washNumber > config.washesPerWeek
    ) {
      throw new AppError(
        `Invalid wash modification: week ${modification.week} wash ${modification.washNumber} is not part of ${planType}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    for (const slug of modification.addFeatures) {
      resolveFeature(slug, itemsBySlug, catalogSlugs);
    }
  }
}

export async function generatePlan(input: unknown): Promise<GeneratedPlan> {
  const parsed = parseGeneratePlanInput(input);
  const service = await findServiceById(parsed.serviceId);

  if (!service) {
    throw new AppError('Service not found', HTTP_STATUS.NOT_FOUND);
  }

  if (!service.active) {
    throw new AppError('Service is not available', HTTP_STATUS.BAD_REQUEST);
  }

  const catalogSlugs = new Set(service.items.map((item) => item.slug));
  const itemsBySlug = buildActiveItemMap(service.items);

  const mandatorySlugs = service.items
    .filter((item) => item.active && item.mandatory)
    .map((item) => item.slug);

  const selectedItems = parsed.selectedFeatures
    .map((slug) => resolveFeature(slug, itemsBySlug, catalogSlugs))
    .filter((item) => !item.mandatory);

  validateWashModifications(
    parsed.washModifications,
    parsed.planType,
    itemsBySlug,
    catalogSlugs,
  );

  const schedule = generateSchedule({
    planType: parsed.planType,
    mandatorySlugs,
    selectedItems,
    washModifications: parsed.washModifications,
  });

  const priced = priceSchedule(schedule, itemsBySlug);

  const plan: GeneratedPlan = {
    serviceId: String(service._id),
    planType: parsed.planType,
    selectedFeatures: parsed.selectedFeatures,
    weeks: priced.weeks,
    totalPrice: priced.totalPrice,
    totalDurationMinutes: priced.totalDurationMinutes,
    totalWashes: priced.totalWashes,
  };

  if (parsed.washModifications.length > 0) {
    plan.washModifications = parsed.washModifications;
  }

  return plan;
}

function parseSubmittedPlan(input: unknown): GeneratedPlan {
  const parsedInput = parseGeneratePlanInput(input);

  if (typeof input !== 'object' || input === null) {
    throw new AppError('Request body is required', HTTP_STATUS.BAD_REQUEST);
  }

  const body = input as {
    weeks?: unknown;
    totalPrice?: unknown;
    totalDurationMinutes?: unknown;
    totalWashes?: unknown;
  };

  if (!Array.isArray(body.weeks)) {
    throw new AppError('Submitted plan weeks are required', HTTP_STATUS.BAD_REQUEST);
  }

  if (typeof body.totalPrice !== 'number') {
    throw new AppError('Submitted plan totalPrice is required', HTTP_STATUS.BAD_REQUEST);
  }

  return {
    serviceId: parsedInput.serviceId,
    planType: parsedInput.planType,
    selectedFeatures: parsedInput.selectedFeatures,
    washModifications: parsedInput.washModifications,
    weeks: body.weeks as GeneratedPlan['weeks'],
    totalPrice: body.totalPrice,
    totalDurationMinutes:
      typeof body.totalDurationMinutes === 'number' ? body.totalDurationMinutes : NaN,
    totalWashes: typeof body.totalWashes === 'number' ? body.totalWashes : NaN,
  };
}

export async function verifyPlan(input: unknown): Promise<VerifyPlanResult> {
  const submitted = parseSubmittedPlan(input);
  const calculated = await generatePlan({
    serviceId: submitted.serviceId,
    planType: submitted.planType,
    selectedFeatures: submitted.selectedFeatures,
    washModifications: submitted.washModifications,
  });

  return comparePlans(calculated, submitted);
}
