import { Types } from 'mongoose';
import { z } from 'zod';
import {
  aadhaarSchema,
  forbiddenIdFields,
  geoPointSchema,
  indianPhoneSchema,
  nonEmptyString,
  objectIdSchema,
  parseSchema,
} from './common';

export type WorkerIdentifier =
  | { type: 'id'; value: string }
  | { type: 'phone'; value: string };

function isObjectIdString(value: string): boolean {
  return (
    Types.ObjectId.isValid(value) &&
    String(new Types.ObjectId(value)) === value
  );
}

export const createWorkerSchema = z.object({
  name: nonEmptyString('name is required').max(
    100,
    'Worker name cannot exceed 100 characters',
  ),
  phone: indianPhoneSchema,
  aadharNumber: aadhaarSchema,
  zoneId: objectIdSchema,
  primaryLocation: geoPointSchema,
});

export const updateWorkerSchema = z
  .object({
    ...forbiddenIdFields('Worker'),
    phone: z.never({
      error: 'Phone number cannot be updated',
    }).optional(),
    name: nonEmptyString('name is required')
      .max(100, 'Worker name cannot exceed 100 characters')
      .optional(),
    aadharNumber: aadhaarSchema.optional(),
    zoneId: objectIdSchema.optional(),
    primaryLocation: geoPointSchema.optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.aadharNumber !== undefined ||
      value.zoneId !== undefined ||
      value.primaryLocation !== undefined,
    { message: 'Provide at least one field to update' },
  );

export type CreateWorkerInput = z.infer<typeof createWorkerSchema>;
export type UpdateWorkerInput = Omit<
  z.infer<typeof updateWorkerSchema>,
  'id' | '_id' | 'phone'
>;

export function parseCreateWorkerInput(input: unknown): CreateWorkerInput {
  return parseSchema(createWorkerSchema, input);
}

export function parseUpdateWorkerInput(input: unknown): UpdateWorkerInput {
  const parsed = parseSchema(updateWorkerSchema, input);
  const {
    id: _idIgnored,
    _id: __idIgnored,
    phone: _phoneIgnored,
    ...updates
  } = parsed;
  return updates;
}

export function parseWorkerIdentifier(input: unknown): WorkerIdentifier {
  const identifier = parseSchema(
    nonEmptyString('Worker identifier is required'),
    input,
  );

  if (isObjectIdString(identifier)) {
    return { type: 'id', value: identifier };
  }

  const phone = parseSchema(indianPhoneSchema, identifier);
  return { type: 'phone', value: phone };
}
