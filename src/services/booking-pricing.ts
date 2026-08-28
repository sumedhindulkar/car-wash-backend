import { IServiceItem } from '../models/service.model';
import { PlanItem, PlanWash, PlanWeek } from '../types/plan';
import { buildActiveItemMap, mandatoryItems, resolveServiceItem } from './service-catalog';

export type SubmittedPricing = {
  weeks: PlanWeek[];
  totalPrice: number;
  totalDurationMinutes: number;
  totalWashes: number;
  discountPercent?: number;
};

/**
 * A one-time booking is a single wash priced with the catalog one-time price:
 * every mandatory item of the service plus the selected optional features.
 */
export function buildOneTimeWash(
  items: IServiceItem[],
  selectedFeatures: string[],
): PlanWash {
  const catalogSlugs = new Set(items.map((item) => item.slug));
  const itemsBySlug = buildActiveItemMap(items);

  const washItems: PlanItem[] = [];
  const includedSlugs = new Set<string>();

  const appendItem = (item: IServiceItem): void => {
    if (includedSlugs.has(item.slug)) {
      return;
    }

    includedSlugs.add(item.slug);
    washItems.push({
      slug: item.slug,
      title: item.title,
      price: item.pricing.oneTime,
      durationMinutes: item.durationMinutes,
    });
  };

  for (const item of mandatoryItems(items)) {
    appendItem(item);
  }

  for (const slug of selectedFeatures) {
    appendItem(resolveServiceItem(slug, itemsBySlug, catalogSlugs));
  }

  return {
    washNumber: 1,
    items: washItems,
    totalPrice: washItems.reduce((sum, item) => sum + item.price, 0),
    totalDurationMinutes: washItems.reduce(
      (sum, item) => sum + item.durationMinutes,
      0,
    ),
  };
}

/**
 * Compares the submitted one-time payload against the wash recalculated from
 * the database. Nothing is corrected silently: every mismatch is reported.
 */
export function compareOneTimePricing(
  calculated: PlanWash,
  submitted: SubmittedPricing,
): string[] {
  const errors: string[] = [];

  if (submitted.weeks.length !== 1 || submitted.weeks[0]?.washes.length !== 1) {
    errors.push('A one-time booking must contain exactly one week with one wash');
    return errors;
  }

  const submittedWeek = submitted.weeks[0];
  const submittedWash = submittedWeek.washes[0];

  if (submittedWeek.week !== 1 || submittedWash.washNumber !== 1) {
    errors.push('A one-time booking must be week 1 wash 1');
  }

  if (submitted.totalWashes !== 1) {
    errors.push('totalWashes must be 1 for a one-time booking');
  }

  if (submitted.discountPercent !== undefined && submitted.discountPercent !== 0) {
    errors.push('A one-time booking cannot carry a discount');
  }

  if (submittedWash.items.length !== calculated.items.length) {
    errors.push('Submitted items do not match the current service catalog');
  } else {
    for (let index = 0; index < calculated.items.length; index += 1) {
      const calculatedItem = calculated.items[index];
      const submittedItem = submittedWash.items[index];

      if (calculatedItem.slug !== submittedItem.slug) {
        errors.push(
          `Item ${index + 1} must be ${calculatedItem.slug} but ${submittedItem.slug} was submitted`,
        );
        continue;
      }

      if (calculatedItem.title !== submittedItem.title) {
        errors.push(`Title of ${calculatedItem.slug} does not match the catalog`);
      }

      if (calculatedItem.price !== submittedItem.price) {
        errors.push(
          `Price of ${calculatedItem.slug} must be ${calculatedItem.price} but ${submittedItem.price} was submitted`,
        );
      }

      if (calculatedItem.durationMinutes !== submittedItem.durationMinutes) {
        errors.push(
          `Duration of ${calculatedItem.slug} must be ${calculatedItem.durationMinutes} but ${submittedItem.durationMinutes} was submitted`,
        );
      }
    }
  }

  if (submittedWash.totalPrice !== calculated.totalPrice) {
    errors.push(
      `Wash total price must be ${calculated.totalPrice} but ${submittedWash.totalPrice} was submitted`,
    );
  }

  if (submittedWash.totalDurationMinutes !== calculated.totalDurationMinutes) {
    errors.push(
      `Wash total duration must be ${calculated.totalDurationMinutes} but ${submittedWash.totalDurationMinutes} was submitted`,
    );
  }

  if (submittedWeek.totalPrice !== calculated.totalPrice) {
    errors.push(
      `Week total price must be ${calculated.totalPrice} but ${submittedWeek.totalPrice} was submitted`,
    );
  }

  if (submittedWeek.totalDurationMinutes !== calculated.totalDurationMinutes) {
    errors.push(
      `Week total duration must be ${calculated.totalDurationMinutes} but ${submittedWeek.totalDurationMinutes} was submitted`,
    );
  }

  if (submitted.totalPrice !== calculated.totalPrice) {
    errors.push(
      `Total price must be ${calculated.totalPrice} but ${submitted.totalPrice} was submitted`,
    );
  }

  if (submitted.totalDurationMinutes !== calculated.totalDurationMinutes) {
    errors.push(
      `Total duration must be ${calculated.totalDurationMinutes} but ${submitted.totalDurationMinutes} was submitted`,
    );
  }

  return errors;
}
