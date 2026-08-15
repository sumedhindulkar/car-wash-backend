import { NextFunction, Request, Response } from 'express';
import {
  SERVICE_CATEGORIES,
  ServiceCategory,
  VEHICLE_TYPES,
  VehicleType,
} from '../constants/service';
import { HTTP_STATUS } from '../constants/http-status';
import {
  findServices,
  ServiceFilters,
  toServiceResponse,
  updateServiceById,
  UpdateServiceInput,
} from '../repositories/service.repository';
import { IServiceItem } from '../models/service.model';
import { SuccessResponse } from '../types/api-response';
import { AppError } from '../utils/app-error';

function readRouteId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function readOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new AppError(
      `Invalid field type for ${fieldName}: expected string`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  return value;
}

function readOptionalBoolean(
  value: unknown,
  fieldName: string,
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new AppError(
      `Invalid field type for ${fieldName}: expected boolean`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  return value;
}

function parseQueryBoolean(value: unknown): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') {
    throw new AppError('Invalid active filter', HTTP_STATUS.BAD_REQUEST);
  }

  if (raw === 'true') {
    return true;
  }

  if (raw === 'false') {
    return false;
  }

  throw new AppError(
    'active filter must be true or false',
    HTTP_STATUS.BAD_REQUEST,
  );
}

function parseQueryEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fieldName: string,
): T | undefined {
  if (value === undefined) {
    return undefined;
  }

  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') {
    throw new AppError(`Invalid ${fieldName} filter`, HTTP_STATUS.BAD_REQUEST);
  }

  if (!(allowed as readonly string[]).includes(raw)) {
    throw new AppError(
      `Invalid ${fieldName}. Allowed values: ${allowed.join(', ')}`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  return raw as T;
}

function parseVehicleType(value: unknown): VehicleType | undefined {
  return parseQueryEnum(value, VEHICLE_TYPES, 'vehicleType');
}

function parseCategory(value: unknown): ServiceCategory | undefined {
  return parseQueryEnum(value, SERVICE_CATEGORIES, 'category');
}

function assertServiceItems(value: unknown): IServiceItem[] {
  if (!Array.isArray(value)) {
    throw new AppError('items must be an array', HTTP_STATUS.BAD_REQUEST);
  }

  return value as IServiceItem[];
}

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const filters: ServiceFilters = {
      vehicleType: parseVehicleType(req.query.vehicleType),
      category: parseCategory(req.query.category),
      active: parseQueryBoolean(req.query.active),
    };

    const services = await findServices(filters);

    const body: SuccessResponse<ReturnType<typeof toServiceResponse>[]> = {
      success: true,
      data: services.map(toServiceResponse),
    };

    res.status(HTTP_STATUS.OK).json(body);
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (req.body?.id !== undefined || req.body?._id !== undefined) {
      throw new AppError('Service id cannot be updated', HTTP_STATUS.BAD_REQUEST);
    }

    const updates: UpdateServiceInput = {};

    if (req.body?.title !== undefined) {
      updates.title = readOptionalString(req.body.title, 'title');
    }

    if (req.body?.description !== undefined) {
      updates.description = readOptionalString(req.body.description, 'description');
    }

    if (req.body?.bannerImage !== undefined) {
      updates.bannerImage = readOptionalString(req.body.bannerImage, 'bannerImage');
    }

    if (req.body?.image !== undefined) {
      updates.image = readOptionalString(req.body.image, 'image');
    }

    if (req.body?.active !== undefined) {
      updates.active = readOptionalBoolean(req.body.active, 'active');
    }

    if (req.body?.vehicleType !== undefined) {
      const vehicleType = parseVehicleType(req.body.vehicleType);
      if (vehicleType === undefined) {
        throw new AppError('vehicleType is required', HTTP_STATUS.BAD_REQUEST);
      }
      updates.vehicleType = vehicleType;
    }

    if (req.body?.category !== undefined) {
      const category = parseCategory(req.body.category);
      if (category === undefined) {
        throw new AppError('category is required', HTTP_STATUS.BAD_REQUEST);
      }
      updates.category = category;
    }

    if (req.body?.items !== undefined) {
      updates.items = assertServiceItems(req.body.items);
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError(
        'Provide at least one field to update',
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const service = await updateServiceById(readRouteId(req.params.id), updates);
    if (!service) {
      throw new AppError('Service not found', HTTP_STATUS.NOT_FOUND);
    }

    const body: SuccessResponse<ReturnType<typeof toServiceResponse>> = {
      success: true,
      data: toServiceResponse(service),
    };

    res.status(HTTP_STATUS.OK).json(body);
  } catch (error) {
    next(error);
  }
}
