import { z } from 'zod';
import {
  forbiddenIdFields,
  geoPointSchema,
  indianPincodeSchema,
  nonEmptyString,
  objectIdSchema,
  parseSchema,
  queryLatitudeSchema,
  queryLongitudeSchema,
  uniqueArray,
} from './common';

const pincodesSchema = uniqueArray(
  indianPincodeSchema,
  'Pincodes must be unique within a zone',
).min(1, 'At least one pincode is required');

const workerIdsSchema = uniqueArray(
  objectIdSchema,
  'workerIds must be unique within a zone',
).default([]);

const serviceRadiusKmSchema = z
  .number({ error: 'serviceRadiusKm must be a valid number' })
  .min(0, 'Service radius cannot be negative');

export const createZoneSchema = z.object({
  name: nonEmptyString('name is required').max(
    100,
    'Zone name cannot exceed 100 characters',
  ),
  pincodes: pincodesSchema,
  location: geoPointSchema,
  serviceRadiusKm: serviceRadiusKmSchema.optional(),
  workerIds: workerIdsSchema,
  active: z.boolean({ error: 'active must be a boolean' }).optional(),
});

export const updateZoneSchema = z
  .object({
    ...forbiddenIdFields('Zone'),
    name: nonEmptyString('name is required')
      .max(100, 'Zone name cannot exceed 100 characters')
      .optional(),
    pincodes: pincodesSchema.optional(),
    location: geoPointSchema.optional(),
    serviceRadiusKm: serviceRadiusKmSchema.optional(),
    workerIds: uniqueArray(
      objectIdSchema,
      'workerIds must be unique within a zone',
    ).optional(),
    active: z.boolean({ error: 'active must be a boolean' }).optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.pincodes !== undefined ||
      value.location !== undefined ||
      value.serviceRadiusKm !== undefined ||
      value.workerIds !== undefined ||
      value.active !== undefined,
    { message: 'Provide at least one field to update' },
  );

export const zoneByLocationQuerySchema = z.object({
  lat: queryLatitudeSchema('lat'),
  lng: queryLongitudeSchema('lng'),
});

export type CreateZoneInput = z.infer<typeof createZoneSchema>;
export type UpdateZoneInput = Omit<
  z.infer<typeof updateZoneSchema>,
  'id' | '_id'
>;

export function parseCreateZoneInput(input: unknown): CreateZoneInput {
  return parseSchema(createZoneSchema, input);
}

export function parseUpdateZoneInput(input: unknown): UpdateZoneInput {
  const parsed = parseSchema(updateZoneSchema, input);
  const { id: _idIgnored, _id: __idIgnored, ...updates } = parsed;
  return updates;
}

export function parseZonePincode(input: unknown): string {
  return parseSchema(indianPincodeSchema, input);
}

export function parseZoneLocationQuery(input: unknown): {
  lat: number;
  lng: number;
} {
  return parseSchema(zoneByLocationQuerySchema, input);
}
