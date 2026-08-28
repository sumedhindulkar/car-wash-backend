import { PLAN_CONFIG, PlanType } from '../constants/plan';
import { SubscriptionOccurrence } from '../types/booking';
import { addDays, parseDateOnly, skipSunday, toDateOnly, toSlotStart } from '../utils/slot-date';

/** Day offsets of the washes inside one plan week, counted from the start day. */
const WASH_OFFSET_DAYS: Record<PlanType, number[]> = {
  ONCE_A_WEEK: [0],
  TWICE_A_WEEK: [0, 3],
  ALTERNATE_DAYS: [0, 2, 4],
  TWICE_A_MONTH: [0],
};

/** TWICE_A_MONTH repeats every fortnight, every other plan every week. */
const WEEK_OFFSET_DAYS: Record<PlanType, number> = {
  ONCE_A_WEEK: 7,
  TWICE_A_WEEK: 7,
  ALTERNATE_DAYS: 7,
  TWICE_A_MONTH: 14,
};

/**
 * Expands a plan into its concrete booking dates from the customer's start
 * date, keeping the same slot and moving any Sunday to the following day.
 */
export function generateOccurrences(
  planType: PlanType,
  startDate: string,
  startTime: string,
): SubscriptionOccurrence[] {
  const { weeks } = PLAN_CONFIG[planType];
  const washOffsets = WASH_OFFSET_DAYS[planType];
  const weekOffset = WEEK_OFFSET_DAYS[planType];
  const firstDay = parseDateOnly(startDate);
  const occurrences: SubscriptionOccurrence[] = [];

  for (let weekIndex = 0; weekIndex < weeks; weekIndex += 1) {
    for (let washIndex = 0; washIndex < washOffsets.length; washIndex += 1) {
      const day = skipSunday(
        addDays(firstDay, weekIndex * weekOffset + washOffsets[washIndex]),
      );
      const date = toDateOnly(day);

      occurrences.push({
        week: weekIndex + 1,
        washNumber: washIndex + 1,
        date,
        startTime,
        startAt: toSlotStart(date, startTime),
      });
    }
  }

  return occurrences;
}
