import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http-status';
import {
  findServices,
  toServiceResponse,
  updateServiceById,
} from '../repositories/service.repository';
import { SuccessResponse } from '../types/api-response';
import { AppError } from '../utils/app-error';
import {
  parseListServicesQuery,
  parseUpdateServiceInput,
} from '../validation/service.schema';

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const filters = parseListServicesQuery(req.query);
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
    const updates = parseUpdateServiceInput(req.body);
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
