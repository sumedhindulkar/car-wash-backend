import { HTTP_STATUS } from '../constants/http-status';
import { IServiceItem } from '../models/service.model';
import { AppError } from '../utils/app-error';

export function buildActiveItemMap(items: IServiceItem[]): Map<string, IServiceItem> {
  const itemsBySlug = new Map<string, IServiceItem>();

  for (const item of items) {
    if (item.active) {
      itemsBySlug.set(item.slug, item);
    }
  }

  return itemsBySlug;
}

export function mandatoryItems(items: IServiceItem[]): IServiceItem[] {
  return items.filter((item) => item.active && item.mandatory);
}

function availableFeatureMessage(catalogSlugs: Set<string>): string {
  if (catalogSlugs.size === 0) {
    return 'none';
  }

  return [...catalogSlugs].join(', ');
}

/**
 * Resolves a requested feature slug against the service catalog and
 * distinguishes an inactive item from one that the service does not offer.
 */
export function resolveServiceItem(
  slug: string,
  itemsBySlug: Map<string, IServiceItem>,
  catalogSlugs: Set<string>,
): IServiceItem {
  const item = itemsBySlug.get(slug);
  if (item) {
    return item;
  }

  if (catalogSlugs.has(slug)) {
    throw new AppError(`Feature is not available: ${slug}`, HTTP_STATUS.BAD_REQUEST);
  }

  throw new AppError(
    `Unknown feature: ${slug}. Available features: ${availableFeatureMessage(catalogSlugs)}`,
    HTTP_STATUS.BAD_REQUEST,
  );
}
