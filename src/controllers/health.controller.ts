import { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http-status';
import { SuccessResponse } from '../types/api-response';

type HealthData = {
  status: 'ok';
};

export function getHealth(_req: Request, res: Response): void {
  const body: SuccessResponse<HealthData> = {
    success: true,
    data: { status: 'ok' },
  };

  res.status(HTTP_STATUS.OK).json(body);
}
