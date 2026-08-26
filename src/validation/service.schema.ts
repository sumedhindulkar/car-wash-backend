import { z } from 'zod';
import {
  SERVICE_CATEGORIES,
  VEHICLE_TYPES,
} from '../constants/service';
import { UpdateServiceInput } from '../repositories/service.repository';
import { forbiddenIdFields, parseSchema } from './common';

export const listServicesQuerySchema = z.object({
  vehicleType: z.preprocess(
    (value) => (Array.isArray(value) ? value[0] : value),
    z.enum(VEHICLE_TYPES).optional(),
  ),
  category: z.preprocess(
    (value) => (Array.isArray(value) ? value[0] : value),
    z.enum(SERVICE_CATEGORIES).optional(),
  ),
  active: z.preprocess((value) => {
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw === 'true') {
      return true;
    }
    if (raw === 'false') {
      return false;
    }
    return undefined;
  }, z.boolean().optional()),
});

export const updateServiceSchema = z
  .object({
    ...forbiddenIdFields('Service'),
    title: z.string().optional(),
    vehicleType: z.enum(VEHICLE_TYPES).optional(),
    category: z.enum(SERVICE_CATEGORIES).optional(),
    description: z.string().optional(),
    bannerImage: z.string().optional(),
    active: z.boolean().optional(),
    items: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough()
  .refine(
    (value) => {
      const keys = Object.keys(value).filter(
        (key) => key !== 'id' && key !== '_id',
      );
      return keys.length > 0;
    },
    { message: 'Provide at least one field to update' },
  );

export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;

export function parseListServicesQuery(input: unknown): ListServicesQuery {
  return parseSchema(listServicesQuerySchema, input);
}

export function parseUpdateServiceInput(input: unknown): UpdateServiceInput {
  const parsed = parseSchema(updateServiceSchema, input);
  const { id: _idIgnored, _id: __idIgnored, ...updates } = parsed;
  return updates as UpdateServiceInput;
}
