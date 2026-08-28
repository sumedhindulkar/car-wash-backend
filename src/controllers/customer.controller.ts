import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http-status';
import { CustomerResponse } from '../repositories/customer.repository';
import {
  createCustomer,
  getCustomer,
  updateCustomer,
} from '../services/customer.service';
import { SuccessResponse } from '../types/api-response';

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const customer = await createCustomer(req.body);
    const body: SuccessResponse<CustomerResponse> = {
      success: true,
      data: customer,
    };

    res.status(HTTP_STATUS.CREATED).json(body);
  } catch (error) {
    next(error);
  }
}

export async function getByIdentifier(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const customer = await getCustomer(req.params.identifier);
    const body: SuccessResponse<CustomerResponse> = {
      success: true,
      data: customer,
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
    const customer = await updateCustomer(req.params.identifier, req.body);
    const body: SuccessResponse<CustomerResponse> = {
      success: true,
      data: customer,
    };

    res.status(HTTP_STATUS.OK).json(body);
  } catch (error) {
    next(error);
  }
}
