import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { HTTP_STATUS } from '../constants/http-status';
import { ErrorResponse } from '../types/api-response';
import { AppError } from '../utils/app-error';

type MongoDuplicateKeyError = {
  code: number;
  keyPattern?: Record<string, unknown>;
};

function isMongoDuplicateKeyError(error: unknown): error is MongoDuplicateKeyError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 11000
  );
}

function duplicateFieldMessage(error: MongoDuplicateKeyError): string {
  const fields = Object.keys(error.keyPattern ?? {});
  if (fields.includes('phoneNumber')) {
    return 'Phone number already exists';
  }
  if (fields.includes('email')) {
    return 'Email already exists';
  }
  if (fields.includes('pincodes')) {
    return 'Pincode already belongs to another active zone';
  }
  return 'Duplicate value';
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const body: ErrorResponse = {
      success: false,
      message: err.message,
    };
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const body: ErrorResponse = {
      success: false,
      message: err.issues[0]?.message ?? 'Validation failed',
    };
    res.status(HTTP_STATUS.BAD_REQUEST).json(body);
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const firstError = Object.values(err.errors)[0];
    const body: ErrorResponse = {
      success: false,
      message: firstError?.message ?? 'Validation failed',
    };
    res.status(HTTP_STATUS.BAD_REQUEST).json(body);
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    const body: ErrorResponse = {
      success: false,
      message: 'Invalid identifier',
    };
    res.status(HTTP_STATUS.BAD_REQUEST).json(body);
    return;
  }

  if (isMongoDuplicateKeyError(err)) {
    const body: ErrorResponse = {
      success: false,
      message: duplicateFieldMessage(err),
    };
    res.status(HTTP_STATUS.CONFLICT).json(body);
    return;
  }

  console.error(err);

  const body: ErrorResponse = {
    success: false,
    message: 'Internal server error',
  };
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(body);
}
