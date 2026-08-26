import { Types } from 'mongoose';
import { MAX_NEARBY_DISTANCE_KM } from '../constants/zone';
import { GeoPoint, IZone, IZoneDocument, Zone } from '../models/zone.model';

export type CreateZoneRecordInput = {
  name: string;
  workerIds: Types.ObjectId[];
  pincodes: string[];
  location: GeoPoint;
  serviceRadiusKm?: number;
  active?: boolean;
};

export type UpdateZoneRecordInput = {
  name?: string;
  workerIds?: Types.ObjectId[];
  pincodes?: string[];
  location?: GeoPoint;
  serviceRadiusKm?: number;
  active?: boolean;
};

export type ZoneResponse = {
  id: string;
  name: string;
  workerIds: string[];
  pincodes: string[];
  location: GeoPoint;
  serviceRadiusKm: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ZoneWithDistanceResponse = ZoneResponse & {
  distanceKm: number;
};

export type ZoneLookupResponse = {
  primaryZone: ZoneWithDistanceResponse | null;
  nearbyZones: ZoneWithDistanceResponse[];
};

export type ZoneNearResult = IZone & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  distanceKm: number;
};

function readTimestamp(
  zone: IZoneDocument | ZoneNearResult,
  field: 'createdAt' | 'updatedAt',
): Date {
  if (typeof (zone as IZoneDocument).get === 'function') {
    return (zone as IZoneDocument).get(field) as Date;
  }

  return (zone as ZoneNearResult)[field];
}

export function toZoneResponse(zone: IZoneDocument | ZoneNearResult): ZoneResponse {
  const [longitude, latitude] = zone.location.coordinates;

  return {
    id: String(zone._id),
    name: zone.name,
    workerIds: zone.workerIds.map((workerId) => String(workerId)),
    pincodes: zone.pincodes,
    location: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
    serviceRadiusKm: zone.serviceRadiusKm,
    active: zone.active,
    createdAt: readTimestamp(zone, 'createdAt'),
    updatedAt: readTimestamp(zone, 'updatedAt'),
  };
}

export function toZoneWithDistanceResponse(
  zone: ZoneNearResult,
): ZoneWithDistanceResponse {
  return {
    ...toZoneResponse(zone),
    distanceKm: Math.round(zone.distanceKm * 10) / 10,
  };
}

export async function createZoneRecord(
  input: CreateZoneRecordInput,
): Promise<IZoneDocument> {
  return Zone.create(input);
}

export async function findZoneById(id: string): Promise<IZoneDocument | null> {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }

  return Zone.findById(id);
}

export async function updateZoneById(
  id: string,
  input: UpdateZoneRecordInput,
): Promise<IZoneDocument | null> {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }

  return Zone.findByIdAndUpdate(
    id,
    { $set: input },
    {
      returnDocument: 'after',
      runValidators: true,
      context: 'query',
    },
  );
}

export async function findActiveZoneByPincode(
  pincode: string,
  excludeZoneId?: string,
): Promise<IZoneDocument | null> {
  const query: Record<string, unknown> = {
    active: true,
    pincodes: pincode,
  };

  if (excludeZoneId && Types.ObjectId.isValid(excludeZoneId)) {
    query._id = { $ne: excludeZoneId };
  }

  return Zone.findOne(query);
}

export async function findActiveZoneWithAnyPincode(
  pincodes: string[],
  excludeZoneId?: string,
): Promise<IZoneDocument | null> {
  const query: Record<string, unknown> = {
    active: true,
    pincodes: { $in: pincodes },
  };

  if (excludeZoneId && Types.ObjectId.isValid(excludeZoneId)) {
    query._id = { $ne: excludeZoneId };
  }

  return Zone.findOne(query);
}

export async function findActiveZonesNear(
  coordinates: [number, number],
  maxDistanceKm: number = MAX_NEARBY_DISTANCE_KM,
): Promise<ZoneNearResult[]> {
  return Zone.aggregate<ZoneNearResult>([
    {
      $geoNear: {
        near: { type: 'Point', coordinates },
        distanceField: 'distanceKm',
        distanceMultiplier: 0.001,
        spherical: true,
        key: 'location',
        query: { active: true },
        maxDistance: maxDistanceKm * 1000,
      },
    },
  ]);
}
