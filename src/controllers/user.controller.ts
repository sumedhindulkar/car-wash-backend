import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http-status';
import {
  createUser,
  deleteUserById,
  toUserResponse,
  updateUserById,
} from '../repositories/user.repository';
import { SuccessResponse } from '../types/api-response';
import { AppError } from '../utils/app-error';

function readRouteId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function readOptionalString(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new AppError('Invalid field type: expected string', HTTP_STATUS.BAD_REQUEST);
  }

  return value;
}

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const phoneNumber = req.body?.phoneNumber;
    if (typeof phoneNumber !== 'string' || phoneNumber.trim() === '') {
      throw new AppError('Phone number is required', HTTP_STATUS.BAD_REQUEST);
    }

    const user = await createUser({
      phoneNumber: phoneNumber.trim(),
      name: readOptionalString(req.body?.name),
      email: readOptionalString(req.body?.email),
    });

    const body: SuccessResponse<ReturnType<typeof toUserResponse>> = {
      success: true,
      data: toUserResponse(user),
    };

    res.status(HTTP_STATUS.CREATED).json(body);
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
    if (req.body?.phoneNumber !== undefined) {
      throw new AppError(
        'Phone number cannot be updated',
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const updates: {
      name?: string;
      email?: string;
    } = {};

    if (req.body?.name !== undefined) {
      updates.name = readOptionalString(req.body.name);
    }

    if (req.body?.email !== undefined) {
      updates.email = readOptionalString(req.body.email);
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError(
        'Provide at least one field to update: name or email',
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const user = await updateUserById(readRouteId(req.params.id), updates);
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    const body: SuccessResponse<ReturnType<typeof toUserResponse>> = {
      success: true,
      data: toUserResponse(user),
    };

    res.status(HTTP_STATUS.OK).json(body);
  } catch (error) {
    next(error);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await deleteUserById(readRouteId(req.params.id));
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    const body: SuccessResponse<ReturnType<typeof toUserResponse>> = {
      success: true,
      data: toUserResponse(user),
    };

    res.status(HTTP_STATUS.OK).json(body);
  } catch (error) {
    next(error);
  }
}
