import { GeneratedPlan, PlanWash, PlanWeek, VerifyPlanResult } from '../types/plan';

function sameStringArray(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function readWeeks(value: unknown): PlanWeek[] {
  return Array.isArray(value) ? (value as PlanWeek[]) : [];
}

function readWashes(value: unknown): PlanWash[] {
  return Array.isArray(value) ? (value as PlanWash[]) : [];
}

export function comparePlans(
  calculated: GeneratedPlan,
  submitted: GeneratedPlan,
): VerifyPlanResult {
  const errors: string[] = [];
  let structureMismatch = false;
  let titleMismatch = false;
  let priceMismatch = false;
  let durationMismatch = false;

  if (calculated.serviceId !== submitted.serviceId) {
    structureMismatch = true;
  }

  if (calculated.planType !== submitted.planType) {
    structureMismatch = true;
  }

  if (!sameStringArray(calculated.selectedFeatures, submitted.selectedFeatures ?? [])) {
    structureMismatch = true;
  }

  const submittedWeeks = readWeeks(submitted.weeks);

  if (calculated.weeks.length !== submittedWeeks.length) {
    structureMismatch = true;
  }

  const weekCount = Math.min(calculated.weeks.length, submittedWeeks.length);

  for (let weekIndex = 0; weekIndex < weekCount; weekIndex += 1) {
    const calculatedWeek = calculated.weeks[weekIndex];
    const submittedWeek = submittedWeeks[weekIndex];
    const submittedWashes = readWashes(submittedWeek?.washes);

    if (
      calculatedWeek.week !== submittedWeek?.week ||
      calculatedWeek.washes.length !== submittedWashes.length
    ) {
      structureMismatch = true;
    }

    if (calculatedWeek.totalPrice !== submittedWeek?.totalPrice) {
      priceMismatch = true;
    }

    if (calculatedWeek.totalDurationMinutes !== submittedWeek?.totalDurationMinutes) {
      durationMismatch = true;
    }

    const washCount = Math.min(calculatedWeek.washes.length, submittedWashes.length);

    for (let washIndex = 0; washIndex < washCount; washIndex += 1) {
      const calculatedWash = calculatedWeek.washes[washIndex];
      const submittedWash = submittedWashes[washIndex];
      const submittedItems = Array.isArray(submittedWash?.items)
        ? submittedWash.items
        : [];

      if (
        calculatedWash.washNumber !== submittedWash?.washNumber ||
        calculatedWash.items.length !== submittedItems.length
      ) {
        structureMismatch = true;
      }

      if (calculatedWash.totalPrice !== submittedWash?.totalPrice) {
        priceMismatch = true;
      }

      if (calculatedWash.totalDurationMinutes !== submittedWash?.totalDurationMinutes) {
        durationMismatch = true;
      }

      const itemCount = Math.min(calculatedWash.items.length, submittedItems.length);

      for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
        const calculatedItem = calculatedWash.items[itemIndex];
        const submittedItem = submittedItems[itemIndex];

        if (calculatedItem.slug !== submittedItem?.slug) {
          structureMismatch = true;
        }

        if (calculatedItem.title !== submittedItem?.title) {
          titleMismatch = true;
        }

        if (calculatedItem.price !== submittedItem?.price) {
          priceMismatch = true;
        }

        if (calculatedItem.durationMinutes !== submittedItem?.durationMinutes) {
          durationMismatch = true;
        }
      }
    }
  }

  if (calculated.totalWashes !== submitted.totalWashes) {
    structureMismatch = true;
  }

  if (calculated.totalPrice !== submitted.totalPrice) {
    priceMismatch = true;
  }

  if (calculated.totalDurationMinutes !== submitted.totalDurationMinutes) {
    durationMismatch = true;
  }

  if (structureMismatch) {
    errors.push('Submitted plan schedule does not match');
  } else if (titleMismatch) {
    errors.push('Submitted item titles do not match the current service catalog');
  }

  if (priceMismatch) {
    errors.push('Submitted price does not match current server pricing');
  }

  if (durationMismatch) {
    errors.push('Submitted duration does not match current service catalog');
  }

  const result: VerifyPlanResult = {
    valid: errors.length === 0,
    priceValid: !priceMismatch && calculated.totalPrice === submitted.totalPrice,
    calculatedTotal: calculated.totalPrice,
    submittedTotal: submitted.totalPrice,
  };

  if (errors.length > 0) {
    result.errors = errors;
  }

  return result;
}
