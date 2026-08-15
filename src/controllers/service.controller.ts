import { NextFunction, Request, Response } from 'express';
import { ServiceCategory, VehicleType } from '../constants/service';
import { HTTP_STATUS } from '../constants/http-status';
import {
  findServices,
  toServiceResponse,
  updateServiceById,
} from '../repositories/service.repository';
import { SuccessResponse } from '../types/api-response';
import { AppError } from '../utils/app-error';

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { vehicleType, category, active } = req.query;

    const services = await findServices({
      ...(typeof vehicleType === 'string' ? { vehicleType: vehicleType as VehicleType } : {}),
      ...(typeof category === 'string' ? { category: category as ServiceCategory } : {}),
      ...(active === 'true' ? { active: true } : active === 'false' ? { active: false } : {}),
    });

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
    const { id, _id, ...updates } = req.body ?? {};

    if (id !== undefined || _id !== undefined) {
      throw new AppError('Service id cannot be updated', HTTP_STATUS.BAD_REQUEST);
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError('Provide at least one field to update', HTTP_STATUS.BAD_REQUEST);
    }

    const serviceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const service = await updateServiceById(serviceId, updates);
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
