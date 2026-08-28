import { z } from 'zod';
import {
  BOOKING_TYPES,
  DEFAULT_AVAILABILITY_DAYS,
  MAX_AVAILABILITY_DAYS,
} from '../constants/booking';
import { PLAN_TYPES } from '../constants/plan';
import { TIME_OF_DAY_REGEX } from '../constants/validation';
import { isValidDateOnly, toDateOnly } from '../utils/slot-date';
import {
  nonEmptyString,
  objectIdSchema,
  objectIdStringSchema,
  parseSchema,
  slugArraySchema,
} from './common';

const dateOnlySchema = nonEmptyString('date is required').refine(isValidDateOnly, {
  message: 'date must be a valid calendar date in YYYY-MM-DD format',
});

const slotTimeSchema = nonEmptyString('startTime is required').regex(
  TIME_OF_DAY_REGEX,
  'startTime must be in HH:MM format',
);

const submittedItemSchema = z.object({
  slug: nonEmptyString('Item slug is required'),
  title: nonEmptyString('Item title is required'),
  price: z.number({ error: 'Item price is required' }).min(0, 'Item price cannot be negative'),
  durationMinutes: z
    .number({ error: 'Item duration is required' })
    .min(0, 'Item duration cannot be negative'),
});

const submittedWashSchema = z.object({
  washNumber: z
    .number({ error: 'washNumber must be a positive integer' })
    .int('washNumber must be a positive integer')
    .min(1, 'washNumber must be a positive integer'),
  items: z.array(submittedItemSchema).min(1, 'A wash needs at least one item'),
  totalPrice: z.number({ error: 'Wash totalPrice is required' }),
  totalDurationMinutes: z.number({ error: 'Wash totalDurationMinutes is required' }),
});

const submittedWeekSchema = z.object({
  week: z
    .number({ error: 'week must be a positive integer' })
    .int('week must be a positive integer')
    .min(1, 'week must be a positive integer'),
  washes: z.array(submittedWashSchema).min(1, 'A week needs at least one wash'),
  totalPrice: z.number({ error: 'Week totalPrice is required' }),
  totalDurationMinutes: z.number({ error: 'Week totalDurationMinutes is required' }),
});

const washModificationSchema = z.object({
  week: z
    .number({ error: 'week must be a positive integer' })
    .int('week must be a positive integer')
    .min(1, 'week must be a positive integer'),
  washNumber: z
    .number({ error: 'washNumber must be a positive integer' })
    .int('washNumber must be a positive integer')
    .min(1, 'washNumber must be a positive integer'),
  addFeatures: slugArraySchema('addFeatures'),
});

const bookingBaseShape = {
  customerId: objectIdSchema,
  serviceId: objectIdStringSchema,
  zoneId: objectIdSchema,
  date: dateOnlySchema,
  startTime: slotTimeSchema,
  selectedFeatures: slugArraySchema('selectedFeatures'),
  weeks: z.array(submittedWeekSchema).min(1, 'weeks are required'),
  totalPrice: z.number({ error: 'totalPrice is required' }),
  totalDurationMinutes: z.number({ error: 'totalDurationMinutes is required' }),
  totalWashes: z
    .number({ error: 'totalWashes is required' })
    .int('totalWashes must be a positive integer')
    .min(1, 'totalWashes must be a positive integer'),
};

export const createOneTimeBookingSchema = z.object({
  ...bookingBaseShape,
  bookingType: z.literal(BOOKING_TYPES[0]),
  discountPercent: z.number().optional(),
});

export const createSubscriptionSchema = z.object({
  ...bookingBaseShape,
  bookingType: z.literal(BOOKING_TYPES[1]),
  planType: z.enum(PLAN_TYPES, { error: 'Invalid plan type' }),
  discountPercent: z.number({ error: 'discountPercent is required' }),
  washModifications: z
    .array(washModificationSchema, { error: 'washModifications must be an array' })
    .default([]),
});

export const createBookingSchema = z.discriminatedUnion('bookingType', [
  createOneTimeBookingSchema,
  createSubscriptionSchema,
]);

export const availabilityQuerySchema = z.object({
  zoneId: objectIdSchema,
  startDate: dateOnlySchema.optional().transform((value) => value ?? toDateOnly(new Date())),
  days: z.coerce
    .number({ error: 'days must be a number' })
    .int('days must be a whole number')
    .min(1, 'days must be at least 1')
    .max(MAX_AVAILABILITY_DAYS, `days cannot exceed ${MAX_AVAILABILITY_DAYS}`)
    .default(DEFAULT_AVAILABILITY_DAYS),
});

export type CreateOneTimeBookingInput = z.infer<typeof createOneTimeBookingSchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export function parseCreateBookingInput(input: unknown): CreateBookingInput {
  return parseSchema(createBookingSchema, input);
}

export function parseAvailabilityQuery(input: unknown): AvailabilityQuery {
  return parseSchema(availabilityQuerySchema, input);
}
