import {
  IService,
  IServiceDocument,
  IServiceItem,
  Service,
} from '../models/service.model';
import { ServiceCategory, VehicleType } from '../constants/service';

export type ServiceFilters = {
  vehicleType?: VehicleType;
  category?: ServiceCategory;
  active?: boolean;
};

export type UpdateServiceInput = {
  title?: string;
  vehicleType?: VehicleType;
  category?: ServiceCategory;
  description?: string;
  bannerImage?: string;
  image?: string;
  active?: boolean;
  items?: IServiceItem[];
};

export type ServiceResponse = {
  id: string;
  title: string;
  vehicleType: VehicleType;
  category: ServiceCategory;
  description: string;
  bannerImage: string;
  image: string;
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
): Promise<IServiceDocument | null> {
  return Service.findById(id);
}

export async function updateServiceById(
  id: string,
  input: UpdateServiceInput,
): Promise<IServiceDocument | null> {
  return Service.findByIdAndUpdate(
    id,
    { $set: input },
    {
      returnDocument: 'after',
      runValidators: true,
      context: 'query',
    },
  );
}

export function toServiceResponse(service: IServiceDocument | IService): ServiceResponse {
  return {
    id: String(service._id),
    title: service.title,
    vehicleType: service.vehicleType,
    category: service.category,
    description: service.description,
    bannerImage: service.bannerImage,
    image: service.image,
    active: service.active,
    items: service.items,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}
