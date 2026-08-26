import { PLAN_CONFIG, MONTHLY_PLAN_DISCOUNT_PERCENT, PLAN_INCLUDED_INTERIOR_ITEM_SLUG, PLAN_INCLUDED_INTERIOR_WASH } from '../constants/plan';
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
import { appendFileSync } from 'fs';
import { join } from 'path';

function agentLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
): void {
  const payload = {
    sessionId: '907f1d',
    runId: 'post-fix',
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  // #region agent log
  fetch('http://127.0.0.1:7298/ingest/2a78f3ec-2eb3-4525-a9d6-74e467d63751', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '907f1d',
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
  try {
    appendFileSync(
      join(process.cwd(), 'debug-907f1d.log'),
      `${JSON.stringify(payload)}\n`,
    );
  } catch {
    // ignore local debug log failures
  }
  // #endregion
}

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

function buildActiveItemMap(items: IServiceItem[]): Map<string, IServiceItem> {
  const itemsBySlug = new Map<string, IServiceItem>();

  for (const item of items) {
    if (item.active) {
      itemsBySlug.set(item.slug, item);
    }
  }

  return itemsBySlug;
}

function availableFeatureMessage(catalogSlugs: Set<string>): string {
  if (catalogSlugs.size === 0) {
    return 'none';
  }

  return [...catalogSlugs].join(', ');
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

  throw new AppError(
    `Unknown feature: ${slug}. Available features: ${availableFeatureMessage(catalogSlugs)}`,
    HTTP_STATUS.BAD_REQUEST,
  );
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

  const items = service.items ?? [];
  const catalogSlugs = new Set(items.map((item) => item.slug));
  const itemsBySlug = buildActiveItemMap(items);

  const mandatorySlugs = items
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

  // #region agent log
  agentLog('A,B,E', 'plan.service.ts:generatePlan', 'interior resolution before schedule', {
    serviceId: String(service._id),
    vehicleType: service.vehicleType,
    category: service.category,
    planType: parsed.planType,
    itemSlugs: [...itemsBySlug.keys()],
    hasInteriorVacuum: itemsBySlug.has('interior-vacuum'),
    hasInteriorCleaning: itemsBySlug.has('interior-cleaning'),
    interiorSlug: interiorSlug ?? null,
    includedInteriorWash,
    washModificationCount: washModifications.length,
    washModifications,
  });
  // #endregion

  const schedule = generateSchedule({
    planType: parsed.planType,
    mandatorySlugs,
    selectedItems,
    washModifications,
    includedInteriorSlug: interiorSlug,
  });

  const priced = priceSchedule(schedule, itemsBySlug);

  // #region agent log
  const week3Wash1 = priced.weeks.find((week) => week.week === 3)?.washes.find((wash) => wash.washNumber === 1);
  const targetWeek = includedInteriorWash.week;
  const targetWash = priced.weeks
    .find((week) => week.week === targetWeek)
    ?.washes.find((wash) => wash.washNumber === includedInteriorWash.washNumber);
  agentLog('C,D,F', 'plan.service.ts:generatePlan:afterPrice', 'schedule and priced target wash', {
    scheduleTargetSlugs:
      schedule.weeks
        .find((week) => week.week === targetWeek)
        ?.washes.find((wash) => wash.washNumber === includedInteriorWash.washNumber)
        ?.itemSlugs ?? null,
    pricedTargetSlugs: targetWash?.items.map((item) => item.slug) ?? null,
    week1Wash1Slugs:
      priced.weeks
        .find((week) => week.week === 1)
        ?.washes.find((wash) => wash.washNumber === 1)
        ?.items.map((item) => item.slug) ?? null,
    week3Wash1Slugs: week3Wash1?.items.map((item) => item.slug) ?? null,
    week2Wash1Slugs:
      priced.weeks
        .find((week) => week.week === 2)
        ?.washes.find((wash) => wash.washNumber === 1)
        ?.items.map((item) => item.slug) ?? null,
    totalPrice: priced.totalPrice,
  });
  // #endregion

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
