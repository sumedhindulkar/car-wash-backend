export const BOOKING_TYPES = ['ONE_TIME', 'MONTHLY_SUBSCRIPTION'] as const;
export type BookingType = (typeof BOOKING_TYPES)[number];

export const BOOKING_STATUSES = [
  'UNASSIGNED',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'REFUND',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = ['ACTIVE', 'COMPLETED', 'CANCELLED'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/**
 * Statuses that still consume a worker in a zone slot.
 * REFUND and CANCELLED bookings free the capacity again.
 */
export const CAPACITY_BLOCKING_BOOKING_STATUSES: BookingStatus[] = [
  'UNASSIGNED',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
];

/** Slot grid used when a zone has no dedicated slot configuration. */
export const DEFAULT_SLOT_START_TIMES = [
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
] as const;

export const SLOT_DURATION_MINUTES = 60;

/** Share of a zone's workers that can be booked in the same slot. */
export const ZONE_CAPACITY_UTILIZATION = 0.85;

/** Below this worker count the zone capacity equals the worker count. */
export const MIN_WORKERS_FOR_UTILIZATION = 2;

export const DEFAULT_AVAILABILITY_DAYS = 6;
export const MAX_AVAILABILITY_DAYS = 30;
