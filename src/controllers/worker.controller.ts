import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http-status';
import { WorkerResponse } from '../repositories/worker.repository';
import { createWorker, getWorker, updateWorker } from '../services/worker.service';
import { SuccessResponse } from '../types/api-response';

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const worker = await createWorker(req.body);
    const body: SuccessResponse<WorkerResponse> = {
      success: true,
      data: worker,
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
    const identifier = Array.isArray(req.params.identifier)
      ? req.params.identifier[0]
      : req.params.identifier;
    const worker = await getWorker(identifier);
    const body: SuccessResponse<WorkerResponse> = {
      success: true,
      data: worker,
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
    const identifier = Array.isArray(req.params.identifier)
      ? req.params.identifier[0]
      : req.params.identifier;
    const worker = await updateWorker(identifier, req.body);
    const body: SuccessResponse<WorkerResponse> = {
      success: true,
      data: worker,
    };

    res.status(HTTP_STATUS.OK).json(body);
  } catch (error) {
    next(error);
  }
}
