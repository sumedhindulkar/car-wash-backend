import { HTTP_STATUS } from '../constants/http-status';
import { IWorkerDocument } from '../models/worker.model';
import {
  WorkerResponse,
  createWorkerRecord,
  findWorkerById,
  findWorkerByPhone,
  toWorkerResponse,
  updateWorkerById,
} from '../repositories/worker.repository';
import { findZoneById } from '../repositories/zone.repository';
import { AppError } from '../utils/app-error';
import {
  parseCreateWorkerInput,
  parseUpdateWorkerInput,
  parseWorkerIdentifier,
} from '../validation/worker.schema';

async function findWorkerByIdentifier(
  identifierInput: unknown,
): Promise<IWorkerDocument> {
  const identifier = parseWorkerIdentifier(identifierInput);

  const worker =
    identifier.type === 'id'
      ? await findWorkerById(identifier.value)
      : await findWorkerByPhone(identifier.value);

  if (!worker) {
    throw new AppError('Worker not found', HTTP_STATUS.NOT_FOUND);
  }

  return worker;
}

export async function createWorker(input: unknown): Promise<WorkerResponse> {
  const parsed = parseCreateWorkerInput(input);

  const zone = await findZoneById(String(parsed.zoneId));
  if (!zone) {
    throw new AppError('Zone not found', HTTP_STATUS.NOT_FOUND);
  }

  const worker = await createWorkerRecord(parsed);
  return toWorkerResponse(worker);
}

export async function getWorker(identifierInput: unknown): Promise<WorkerResponse> {
  const worker = await findWorkerByIdentifier(identifierInput);
  return toWorkerResponse(worker);
}

export async function updateWorker(
  identifierInput: unknown,
  input: unknown,
): Promise<WorkerResponse> {
  const existing = await findWorkerByIdentifier(identifierInput);
  const parsed = parseUpdateWorkerInput(input);

  if (parsed.zoneId !== undefined) {
    const zone = await findZoneById(String(parsed.zoneId));
    if (!zone) {
      throw new AppError('Zone not found', HTTP_STATUS.NOT_FOUND);
    }
  }

  const worker = await updateWorkerById(String(existing._id), parsed);
  if (!worker) {
    throw new AppError('Worker not found', HTTP_STATUS.NOT_FOUND);
  }

  return toWorkerResponse(worker);
}
