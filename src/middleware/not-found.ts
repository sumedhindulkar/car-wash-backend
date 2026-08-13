import { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http-status';
import { ErrorResponse } from '../types/api-response';

export function notFoundHandler(_req: Request, res: Response): void {
  const body: ErrorResponse = {
    success: false,
    message: 'Resource not found',
  };

  res.status(HTTP_STATUS.NOT_FOUND).json(body);
}
