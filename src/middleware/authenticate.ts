import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { getFirebaseAuth } from '../config/firebase';
import { HTTP_STATUS } from '../constants/http-status';
import { IUserDocument } from '../models/user.model';
import { findUserByPhoneNumber } from '../repositories/user.repository';
import { AppError } from '../utils/app-error';

declare module 'express-serve-static-core' {
  interface Request {
    user?: IUserDocument;
    firebasePhoneNumber?: string;
  }
}

function readBearerToken(header: string | undefined): string {
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED);
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    throw new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED);
  }

  return token;
}

async function verifiedPhoneNumber(req: Request): Promise<string | undefined> {
  if (env.nodeEnv !== 'production') {
    return undefined;
  }

  const token = readBearerToken(req.headers.authorization);

  let phoneNumber: string | undefined;
  try {
    const decoded = await getFirebaseAuth().verifyIdToken(token);
    phoneNumber = decoded.phone_number;
  } catch {
    throw new AppError('Invalid or expired token', HTTP_STATUS.UNAUTHORIZED);
  }

  if (!phoneNumber) {
    throw new AppError('Invalid or expired token', HTTP_STATUS.UNAUTHORIZED);
  }

  return phoneNumber;
}

export async function verifyToken(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const phoneNumber = await verifiedPhoneNumber(req);
    if (phoneNumber) {
      req.firebasePhoneNumber = phoneNumber;
    }
    next();
  } catch (error) {
    next(error);
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (env.nodeEnv !== 'production') {
    next();
    return;
  }

  try {
    const phoneNumber =
      req.firebasePhoneNumber ?? (await verifiedPhoneNumber(req));
    if (!phoneNumber) {
      throw new AppError('Invalid or expired token', HTTP_STATUS.UNAUTHORIZED);
    }

    const user = await findUserByPhoneNumber(phoneNumber);
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.UNAUTHORIZED);
    }

    req.user = user;
    req.firebasePhoneNumber = phoneNumber;
    next();
  } catch (error) {
    next(error);
  }
}
