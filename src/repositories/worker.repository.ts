import { Types } from 'mongoose';
import { IWorker, IWorkerDocument, Worker } from '../models/worker.model';
import { GeoPoint } from '../models/zone.model';

export type CreateWorkerRecordInput = {
  name: string;
  phone: string;
  aadharNumber: string;
  zoneId: Types.ObjectId;
  primaryLocation: GeoPoint;
};

export type UpdateWorkerRecordInput = {
  name?: string;
  aadharNumber?: string;
  zoneId?: Types.ObjectId;
  primaryLocation?: GeoPoint;
};

export type WorkerResponse = {
  id: string;
  name: string;
  phone: string;
  zoneId: string;
  primaryLocation: GeoPoint;
};

export function toWorkerResponse(worker: IWorkerDocument | IWorker & { _id: Types.ObjectId }): WorkerResponse {
  const [longitude, latitude] = worker.primaryLocation.coordinates;

  return {
    id: String(worker._id),
    name: worker.name,
    phone: worker.phone,
    zoneId: String(worker.zoneId),
    primaryLocation: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
  };
}

export async function createWorkerRecord(
  input: CreateWorkerRecordInput,
): Promise<IWorkerDocument> {
  return Worker.create(input);
}

export async function findWorkerById(id: string): Promise<IWorkerDocument | null> {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }

  return Worker.findById(id);
}

export async function findWorkerByPhone(phone: string): Promise<IWorkerDocument | null> {
  return Worker.findOne({ phone });
}

export async function countWorkersByZone(zoneId: Types.ObjectId): Promise<number> {
  return Worker.countDocuments({ zoneId });
}

export async function updateWorkerById(
  id: string,
  input: UpdateWorkerRecordInput,
): Promise<IWorkerDocument | null> {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }

  return Worker.findByIdAndUpdate(
    id,
    { $set: input },
    {
      returnDocument: 'after',
      runValidators: true,
      context: 'query',
    },
  );
}
