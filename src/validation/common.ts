import { Types } from 'mongoose';
import { z, ZodType } from 'zod';
import { HTTP_STATUS } from '../constants/http-status';
import {
  AADHAAR_REGEX,
  EMAIL_REGEX,
  INDIAN_PHONE_REGEX,
  INDIAN_PINCODE_REGEX,
} from '../constants/validation';
import { AppError } from '../utils/app-error';

export function parseSchema<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }

  const firstIssue = result.error.issues[0];
  throw new AppError(
    firstIssue?.message ?? 'Validation failed',
    HTTP_STATUS.BAD_REQUEST,
  );
}

export function nonEmptyString(message: string) {
  return z
    .string({ error: message })
    .trim()
    .min(1, message);
}

export function uniqueArray<T extends z.ZodType>(
  itemSchema: T,
  message: string,
) {
  return z.array(itemSchema).refine(
    (items) => new Set(items.map(String)).size === items.length,
    { message },
  );
}

export const objectIdStringSchema = z
  .string({ error: 'must be a valid id' })
  .refine((value) => Types.ObjectId.isValid(value), {
    message: 'must be a valid id',
  });

export const objectIdSchema = objectIdStringSchema.transform(
  (value) => new Types.ObjectId(value),
);

export function latitudeSchema(fieldName = 'Latitude') {
  return z
    .number({ error: `${fieldName} must be a valid number` })
    .min(-90, `${fieldName} must be between -90 and 90`)
    .max(90, `${fieldName} must be between -90 and 90`);
}

export function longitudeSchema(fieldName = 'Longitude') {
  return z
    .number({ error: `${fieldName} must be a valid number` })
    .min(-180, `${fieldName} must be between -180 and 180`)
    .max(180, `${fieldName} must be between -180 and 180`);
}

export function queryLatitudeSchema(fieldName = 'lat') {
  return z.coerce
    .number({ error: `${fieldName} is required` })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90');
}

export function queryLongitudeSchema(fieldName = 'lng') {
  return z.coerce
    .number({ error: `${fieldName} is required` })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180');
}

export const geoPointSchema = z.object({
  type: z.literal('Point', { error: 'Location type must be Point' }).default('Point'),
  coordinates: z.tuple(
    [longitudeSchema(), latitudeSchema()],
    { error: 'Coordinates must be [longitude, latitude]' },
  ),
});

export const indianPincodeSchema = nonEmptyString(
  'Pincode must be a valid 6-digit Indian pincode',
).regex(INDIAN_PINCODE_REGEX, 'Pincode must be a valid 6-digit Indian pincode');

export const indianPhoneSchema = nonEmptyString('Phone number is required').regex(
  INDIAN_PHONE_REGEX,
  'Phone number must be a valid Indian mobile number (10 digits starting with 6–9, optionally prefixed with +91 or 91)',
);

export const aadhaarSchema = nonEmptyString('Aadhaar number is required').regex(
  AADHAAR_REGEX,
  'Aadhaar number must be a valid 12-digit number',
);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(EMAIL_REGEX, 'Please provide a valid email address');

export function slugArraySchema(fieldName: string) {
  return z
    .array(z.string(), {
      error: `${fieldName} must be an array of slugs`,
    })
    .default([])
    .transform((slugs) => {
      const seen = new Set<string>();
      const result: string[] = [];

      for (const slug of slugs) {
        const trimmed = slug.trim();
        if (trimmed.length === 0 || seen.has(trimmed)) {
          continue;
        }
        seen.add(trimmed);
        result.push(trimmed);
      }

      return result;
    });
}

export function forbiddenIdFields(entityName: string) {
  return {
    id: z.never({ error: `${entityName} id cannot be updated` }).optional(),
    _id: z.never({ error: `${entityName} id cannot be updated` }).optional(),
  };
}
