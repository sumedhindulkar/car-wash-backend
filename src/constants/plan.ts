export const PLAN_TYPES = [
  'TWICE_A_WEEK',
  'ONCE_A_WEEK',
  'ALTERNATE_DAYS',
  'TWICE_A_MONTH',
] as const;

export type PlanType = (typeof PLAN_TYPES)[number];

export type PlanConfig = {
  weeks: number;
  washesPerWeek: number;
};

export const PLAN_CONFIG: Record<PlanType, PlanConfig> = {
  TWICE_A_WEEK: { weeks: 4, washesPerWeek: 2 },
  ONCE_A_WEEK: { weeks: 4, washesPerWeek: 1 },
  ALTERNATE_DAYS: { weeks: 4, washesPerWeek: 3 },
  TWICE_A_MONTH: { weeks: 2, washesPerWeek: 1 },
};

/** Percent off each subscription plan price. Use 0 for no discount. */
export const MONTHLY_PLAN_DISCOUNT_PERCENT = 0;

export function isPlanType(value: string): value is PlanType {
  return (PLAN_TYPES as readonly string[]).includes(value);
}
