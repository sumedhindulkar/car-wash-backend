import { MONTHLY_PLAN_DISCOUNT_PERCENT } from '../constants/plan';
import { IServiceItem } from '../models/service.model';
import { PlanItem, PlanSchedule, PlanWeek } from '../types/plan';

export function applyMonthlyPlanDiscount(price: number): number {
  if (MONTHLY_PLAN_DISCOUNT_PERCENT <= 0) {
    return Math.round(price);
  }

  return Math.round((price * (100 - MONTHLY_PLAN_DISCOUNT_PERCENT)) / 100);
}

export function getSubscriptionItemPrice(item: IServiceItem): number {
  const basePrice = item.pricing.monthly ?? item.pricing.oneTime;
  return applyMonthlyPlanDiscount(basePrice);
}

export function priceSchedule(
  schedule: PlanSchedule,
  itemsBySlug: Map<string, IServiceItem>,
): {
  weeks: PlanWeek[];
  totalPrice: number;
  totalDurationMinutes: number;
  totalWashes: number;
} {
  let totalPrice = 0;
  let totalDurationMinutes = 0;
  let totalWashes = 0;

  const weeks = schedule.weeks.map((week) => {
    const washes = week.washes.map((wash) => {
      const items: PlanItem[] = wash.itemSlugs.map((slug) => {
        const item = itemsBySlug.get(slug);
        if (!item) {
          throw new Error(`Missing catalog item for slug: ${slug}`);
        }

        return {
          slug: item.slug,
          title: item.title,
          price: getSubscriptionItemPrice(item),
          durationMinutes: item.durationMinutes,
        };
      });

      const washTotalPrice = items.reduce((sum, item) => sum + item.price, 0);
      const washTotalDuration = items.reduce(
        (sum, item) => sum + item.durationMinutes,
        0,
      );

      totalWashes += 1;

      return {
        washNumber: wash.washNumber,
        items,
        totalPrice: washTotalPrice,
        totalDurationMinutes: washTotalDuration,
      };
    });

    const weekTotalPrice = washes.reduce((sum, wash) => sum + wash.totalPrice, 0);
    const weekTotalDuration = washes.reduce(
      (sum, wash) => sum + wash.totalDurationMinutes,
      0,
    );

    totalPrice += weekTotalPrice;
    totalDurationMinutes += weekTotalDuration;

    return {
      week: week.week,
      washes,
      totalPrice: weekTotalPrice,
      totalDurationMinutes: weekTotalDuration,
    };
  });

  return {
    weeks,
    totalPrice,
    totalDurationMinutes,
    totalWashes,
  };
}
