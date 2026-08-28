import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http-status';
import { getZoneAvailability } from '../services/booking-availability';
import { CreateBookingResult, createBooking } from '../services/booking.service';
import { SuccessResponse } from '../types/api-response';
import { ZoneAvailability } from '../types/booking';

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await createBooking(req.body);
    const body: SuccessResponse<CreateBookingResult> = {
      success: true,
      data: result,
    };

    res.status(HTTP_STATUS.CREATED).json(body);
  } catch (error) {
    next(error);
  }
}

export async function availability(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await getZoneAvailability(req.query);
    const body: SuccessResponse<ZoneAvailability> = {
      success: true,
      data: result,
    };

    res.status(HTTP_STATUS.OK).json(body);
  } catch (error) {
    next(error);
  }
}
