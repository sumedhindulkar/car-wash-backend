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
import {
  parseCreateUserInput,
  parseUpdateUserInput,
} from '../validation/user.schema';

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = parseCreateUserInput(req.body);
    const user = await createUser(input);

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
    const updates = parseUpdateUserInput(req.body);
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await updateUserById(userId, updates);
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
