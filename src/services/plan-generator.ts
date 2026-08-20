import { PLAN_CONFIG, PLAN_INCLUDED_INTERIOR_WASH, PlanType } from '../constants/plan';
import { MonthlyRule } from '../constants/service';
import { IServiceItem } from '../models/service.model';
import { PlanSchedule, WashModification } from '../types/plan';

function shouldIncludeOptionalItem(
  monthlyRule: MonthlyRule,
  week: number,
  washNumber: number,
): boolean {
  if (monthlyRule === 'once') {
    return week === 1 && washNumber === 1;
  }

  // every_visit and multiple: include on every wash when selected at plan level.
  // Per-wash extras (e.g. interior cleaning on week 3) are applied via washModifications.
  return true;
}

function appendUniqueSlug(slugs: string[], slug: string): void {
  if (!slugs.includes(slug)) {
    slugs.push(slug);
  }
}

export function generateSchedule(params: {
  planType: PlanType;
  mandatorySlugs: string[];
  selectedItems: IServiceItem[];
  washModifications: WashModification[];
  includedInteriorSlug?: string;
}): PlanSchedule {
  const { weeks, washesPerWeek } = PLAN_CONFIG[params.planType];
  const includedInteriorWash = PLAN_INCLUDED_INTERIOR_WASH[params.planType];
  const modificationsByWeek = new Map<number, Map<number, string[]>>();

  for (const modification of params.washModifications) {
    const washes = modificationsByWeek.get(modification.week) ?? new Map<number, string[]>();
    const existing = washes.get(modification.washNumber) ?? [];
    for (const slug of modification.addFeatures) {
      appendUniqueSlug(existing, slug);
    }
    washes.set(modification.washNumber, existing);
    modificationsByWeek.set(modification.week, washes);
  }

  // #region agent log
  fetch('http://127.0.0.1:7298/ingest/2a78f3ec-2eb3-4525-a9d6-74e467d63751',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'907f1d'},body:JSON.stringify({sessionId:'907f1d',runId:'pre-fix',hypothesisId:'C,E',location:'plan-generator.ts:generateSchedule',message:'generator interior inputs',data:{planType:params.planType,includedInteriorSlug:params.includedInteriorSlug??null,includedInteriorWash,modWeek3Wash1:modificationsByWeek.get(includedInteriorWash.week)?.get(includedInteriorWash.washNumber)??null,washModificationCount:params.washModifications.length},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  return {
    weeks: Array.from({ length: weeks }, (_, weekIndex) => {
      const week = weekIndex + 1;

      return {
        week,
        washes: Array.from({ length: washesPerWeek }, (_, washIndex) => {
          const washNumber = washIndex + 1;
          const itemSlugs: string[] = [];

          for (const slug of params.mandatorySlugs) {
            appendUniqueSlug(itemSlugs, slug);
          }

          for (const item of params.selectedItems) {
            if (shouldIncludeOptionalItem(item.monthlyRule, week, washNumber)) {
              appendUniqueSlug(itemSlugs, item.slug);
            }
          }

          const extraSlugs =
            modificationsByWeek.get(week)?.get(washNumber) ?? [];
          for (const slug of extraSlugs) {
            appendUniqueSlug(itemSlugs, slug);
          }

          if (
            params.includedInteriorSlug &&
            week === includedInteriorWash.week &&
            washNumber === includedInteriorWash.washNumber
          ) {
            appendUniqueSlug(itemSlugs, params.includedInteriorSlug);
          }

          return { washNumber, itemSlugs };
        }),
      };
    }),
  };
}
