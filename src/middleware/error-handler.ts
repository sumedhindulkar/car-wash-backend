import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http-status';
import { ErrorResponse } from '../types/api-response';
import { AppError } from '../utils/app-error';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    const body: ErrorResponse = {
      success: false,
      message: err.message,
    };
    res.status(err.statusCode).json(body);
    return;
  }

  console.error(err);

  const body: ErrorResponse = {
    success: false,
    message: 'Internal server error',
  };
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(body);
}
