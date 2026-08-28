import {
  PLAN_CONFIG,
  MONTHLY_PLAN_DISCOUNT_PERCENT,
  PLAN_INCLUDED_INTERIOR_ITEM_SLUG,
  PLAN_INCLUDED_INTERIOR_WASH,
} from '../constants/plan';
import { HTTP_STATUS } from '../constants/http-status';
import { ServiceCategory } from '../constants/service';
import { IServiceItem } from '../models/service.model';
import { findServiceById } from '../repositories/service.repository';
import {
  GeneratePlanInput,
  GeneratedPlan,
  VerifyPlanResult,
  WashModification,
} from '../types/plan';
import { AppError } from '../utils/app-error';
import {
  parseGeneratePlanInput,
  parseSubmittedPlan,
} from '../validation/plan.schema';
import { generateSchedule } from './plan-generator';
import { priceSchedule } from './plan-pricing';
import { comparePlans } from './plan-verifier';
import { buildActiveItemMap, resolveServiceItem } from './service-catalog';

function includedInteriorItemSlug(
  vehicleType: string,
  category: string,
  itemsBySlug: Map<string, IServiceItem>,
): string | undefined {
  if (vehicleType !== 'car') {
    return undefined;
  }

  const preferred = PLAN_INCLUDED_INTERIOR_ITEM_SLUG[category as ServiceCategory];
  if (preferred && itemsBySlug.has(preferred)) {
    return preferred;
  }

  if (itemsBySlug.has('interior-vacuum')) {
    return 'interior-vacuum';
  }

  if (itemsBySlug.has('interior-cleaning')) {
    return 'interior-cleaning';
  }

  return undefined;
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
      resolveServiceItem(slug, itemsBySlug, catalogSlugs);
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

  const items = service.items ?? [];
  const catalogSlugs = new Set(items.map((item) => item.slug));
  const itemsBySlug = buildActiveItemMap(items);

  const mandatorySlugs = items
    .filter((item) => item.active && item.mandatory)
    .map((item) => item.slug);

  const selectedItems = parsed.selectedFeatures
    .map((slug) => resolveServiceItem(slug, itemsBySlug, catalogSlugs))
    .filter((item) => !item.mandatory);

  validateWashModifications(
    parsed.washModifications,
    parsed.planType,
    itemsBySlug,
    catalogSlugs,
  );

  const interiorSlug = includedInteriorItemSlug(
    service.vehicleType,
    service.category,
    itemsBySlug,
  );
  const includedInteriorWash = PLAN_INCLUDED_INTERIOR_WASH[parsed.planType];
  const washModifications = interiorSlug
    ? [
        ...parsed.washModifications,
        {
          week: includedInteriorWash.week,
          washNumber: includedInteriorWash.washNumber,
          addFeatures: [interiorSlug],
        },
      ]
    : parsed.washModifications;

  const schedule = generateSchedule({
    planType: parsed.planType,
    mandatorySlugs,
    selectedItems,
    washModifications,
    includedInteriorSlug: interiorSlug,
  });

  const priced = priceSchedule(schedule, itemsBySlug);

  const plan: GeneratedPlan = {
    serviceId: String(service._id),
    planType: parsed.planType,
    selectedFeatures: parsed.selectedFeatures,
    discountPercent: MONTHLY_PLAN_DISCOUNT_PERCENT,
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
