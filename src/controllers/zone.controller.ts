import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http-status';
import {
  createZone,
  deactivateZone,
  findZonesByLocation,
  findZonesByPincode,
  getZone,
  updateZone,
} from '../services/zone.service';
import { SuccessResponse } from '../types/api-response';
import {
  ZoneLookupResponse,
  ZoneResponse,
} from '../repositories/zone.repository';

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const zone = await createZone(req.body);
    const body: SuccessResponse<ZoneResponse> = {
      success: true,
      data: zone,
    };

    res.status(HTTP_STATUS.CREATED).json(body);
  } catch (error) {
    next(error);
  }
}

export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const zoneId = Array.isArray(req.params.zoneId)
      ? req.params.zoneId[0]
      : req.params.zoneId;
    const zone = await getZone(zoneId);
    const body: SuccessResponse<ZoneResponse> = {
      success: true,
      data: zone,
    };

    res.status(HTTP_STATUS.OK).json(body);
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
    const zoneId = Array.isArray(req.params.zoneId)
      ? req.params.zoneId[0]
      : req.params.zoneId;
    const zone = await updateZone(zoneId, req.body);
    const body: SuccessResponse<ZoneResponse> = {
      success: true,
      data: zone,
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
    const zoneId = Array.isArray(req.params.zoneId)
      ? req.params.zoneId[0]
      : req.params.zoneId;
    const zone = await deactivateZone(zoneId);
    const body: SuccessResponse<ZoneResponse> = {
      success: true,
      data: zone,
    };

    res.status(HTTP_STATUS.OK).json(body);
  } catch (error) {
    next(error);
  }
}

export async function byPincode(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pincode = Array.isArray(req.params.pincode)
      ? req.params.pincode[0]
      : req.params.pincode;
    const result = await findZonesByPincode(pincode);
    const body: SuccessResponse<ZoneLookupResponse> = {
      success: true,
      data: result,
    };

    res.status(HTTP_STATUS.OK).json(body);
  } catch (error) {
    next(error);
  }
}

export async function byLocation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const lat = Array.isArray(req.query.lat) ? req.query.lat[0] : req.query.lat;
    const lng = Array.isArray(req.query.lng) ? req.query.lng[0] : req.query.lng;
    const result = await findZonesByLocation(lat, lng);
    const body: SuccessResponse<ZoneLookupResponse> = {
      success: true,
      data: result,
    };

    res.status(HTTP_STATUS.OK).json(body);
  } catch (error) {
    next(error);
  }
}
