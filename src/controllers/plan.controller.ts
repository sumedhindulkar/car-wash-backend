import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http-status';
import { generatePlan, verifyPlan } from '../services/plan.service';
import { SuccessResponse } from '../types/api-response';
import { GeneratedPlan, VerifyPlanResult } from '../types/plan';

export async function preview(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const plan = await generatePlan(req.body);
    const body: SuccessResponse<GeneratedPlan> = {
      success: true,
      data: plan,
    };

    res.status(HTTP_STATUS.OK).json(body);
  } catch (error) {
    next(error);
  }
}

export async function verify(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await verifyPlan(req.body);
    const body: SuccessResponse<VerifyPlanResult> = {
      success: true,
      data: result,
    };

    res.status(HTTP_STATUS.OK).json(body);
  } catch (error) {
    next(error);
  }
}
