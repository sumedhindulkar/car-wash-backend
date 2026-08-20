import {
  IServiceDocument,
  IService,
  IServiceItem,
  IServiceItemPricing,
  Service,
} from '../models/service.model';
import { ServiceCategory, VehicleType } from '../constants/service';
import { HTTP_STATUS } from '../constants/http-status';
import { AppError } from '../utils/app-error';

export type ServiceFilters = {
  vehicleType?: VehicleType;
  category?: ServiceCategory;
  active?: boolean;
};

export type UpdateServiceItemInput = {
  slug?: string;
  id?: string;
  title?: string;
  description?: string;
  image?: string;
  bannerImage?: string;
  pricing?: Partial<IServiceItemPricing>;
  durationMinutes?: number;
  mandatory?: boolean;
  selected?: boolean;
  active?: boolean;
  monthlyRule?: IServiceItem['monthlyRule'];
};

export type UpdateServiceInput = {
  title?: string;
  vehicleType?: VehicleType;
  category?: ServiceCategory;
  description?: string;
  bannerImage?: string;
  active?: boolean;
  items?: UpdateServiceItemInput[];
};

export type ServiceResponse = {
  id: string;
  title: string;
  vehicleType: VehicleType;
  category: ServiceCategory;
  description: string;
  bannerImage: string;
  active: boolean;
  items: IServiceItem[];
  createdAt: Date;
  updatedAt: Date;
};

export async function findServices(
  filters: ServiceFilters = {},
): Promise<IServiceDocument[]> {
  const query: Record<string, unknown> = {};

  if (filters.vehicleType !== undefined) {
    query.vehicleType = filters.vehicleType;
  }

  if (filters.category !== undefined) {
    query.category = filters.category;
  }

  if (filters.active !== undefined) {
    query.active = filters.active;
  }

  return Service.find(query).sort({ vehicleType: 1, category: 1 }).lean(false);
}

export async function findServiceById(
  id: string,
): Promise<(IService & { _id: unknown }) | null> {
  return Service.findById(id).lean();
}

function mergeServiceItems(
  existingItems: IServiceItem[],
  itemUpdates: UpdateServiceItemInput[],
): IServiceItem[] {
  const mergedItems = existingItems.map((item) => ({ ...item, pricing: { ...item.pricing } }));

  for (const update of itemUpdates) {
    const key = update.slug ?? update.id;
    if (!key) {
      throw new AppError(
        'Each item update requires a slug or id',
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const index = mergedItems.findIndex((item) => item.slug === key);
    if (index === -1) {
      throw new AppError(
        `Service item not found: ${key}. New items cannot be added.`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const current = mergedItems[index];
    const { slug: _slug, id: _id, pricing, ...fields } = update;

    mergedItems[index] = {
      ...current,
      ...fields,
      pricing: pricing
        ? {
            oneTime: pricing.oneTime ?? current.pricing.oneTime,
            monthly:
              pricing.monthly !== undefined ? pricing.monthly : current.pricing.monthly,
          }
        : current.pricing,
    };
  }

  return mergedItems;
}

export async function updateServiceById(
  id: string,
  input: UpdateServiceInput,
): Promise<IServiceDocument | null> {
  const { items, ...serviceFields } = input;

  if (!items) {
    return Service.findByIdAndUpdate(
      id,
      { $set: serviceFields },
      {
        returnDocument: 'after',
        runValidators: true,
        context: 'query',
      },
    );
  }

  const service = await Service.findById(id).lean();
  if (!service) {
    return null;
  }

  const mergedItems = mergeServiceItems(service.items, items);

  return Service.findByIdAndUpdate(
    id,
    { $set: { ...serviceFields, items: mergedItems } },
    {
      returnDocument: 'after',
      runValidators: true,
      context: 'query',
    },
  );
}

export function toServiceResponse(service: IServiceDocument): ServiceResponse {
  return {
    id: String(service._id),
    title: service.title,
    vehicleType: service.vehicleType,
    category: service.category,
    description: service.description,
    bannerImage: service.bannerImage,
    active: service.active,
    items: service.items,
    createdAt: service.get('createdAt') as Date,
    updatedAt: service.get('updatedAt') as Date,
  };
}
