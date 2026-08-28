import { SLOT_DURATION_MINUTES } from '../constants/booking';
import { DATE_ONLY_REGEX } from '../constants/validation';

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const SUNDAY = 0;

/**
 * Booking days and slots are business-calendar values, so every conversion here
 * is done in UTC. A date string always maps to the same instant regardless of
 * the server timezone.
 */
export function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY_REGEX.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && toDateOnly(parsed) === value;
}

export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE_MS);
}

export function isSunday(date: Date): boolean {
  return date.getUTCDay() === SUNDAY;
}

/** Sunday is a holiday, so a date landing on Sunday moves to the next day. */
export function skipSunday(date: Date): Date {
  return isSunday(date) ? addDays(date, 1) : date;
}

export function toSlotStart(dateOnly: string, startTime: string): Date {
  return new Date(`${dateOnly}T${startTime}:00.000Z`);
}

export function slotEndTime(startTime: string): string {
  const end = addMinutes(toSlotStart('1970-01-01', startTime), SLOT_DURATION_MINUTES);
  return end.toISOString().slice(11, 16);
}
