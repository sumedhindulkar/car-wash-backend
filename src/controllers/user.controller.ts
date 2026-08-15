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
      name: req.body?.name,
      email: req.body?.email,
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
      throw new AppError('Phone number cannot be updated', HTTP_STATUS.BAD_REQUEST);
    }

    const { name, email } = req.body ?? {};
    if (name === undefined && email === undefined) {
      throw new AppError(
        'Provide at least one field to update: name or email',
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await updateUserById(userId, {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
    });
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
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await deleteUserById(userId);
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
