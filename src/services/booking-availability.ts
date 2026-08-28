import { ClientSession, Types } from 'mongoose';
import {
  DEFAULT_SLOT_START_TIMES,
  MIN_WORKERS_FOR_UTILIZATION,
  ZONE_CAPACITY_UTILIZATION,
} from '../constants/booking';
import { HTTP_STATUS } from '../constants/http-status';
import { countBookingsPerSlot } from '../repositories/booking.repository';
import { countWorkersByZone } from '../repositories/worker.repository';
import { findZoneById } from '../repositories/zone.repository';
import { SubscriptionOccurrence, ZoneAvailability } from '../types/booking';
import { AppError } from '../utils/app-error';
import {
  addDays,
  addMinutes,
  isSunday,
  parseDateOnly,
  slotEndTime,
  toDateOnly,
  toSlotStart,
} from '../utils/slot-date';
import { parseAvailabilityQuery } from '../validation/booking.schema';

/** Zones have no slot configuration of their own yet, so the default grid applies. */
export function zoneSlotStartTimes(): string[] {
  return [...DEFAULT_SLOT_START_TIMES];
}

export function isSupportedSlotTime(startTime: string): boolean {
  return zoneSlotStartTimes().includes(startTime);
}

/**
 * Small zones book every worker; from two workers upward only 85 percent of the
 * workers may be booked in the same slot, rounded down.
 */
export function allowedCapacity(workerCount: number): number {
  if (workerCount < MIN_WORKERS_FOR_UTILIZATION) {
    return workerCount;
  }

  return Math.floor(workerCount * ZONE_CAPACITY_UTILIZATION);
}

async function loadZoneCapacity(zoneId: Types.ObjectId): Promise<number> {
  const [zone, workerCount] = await Promise.all([
    findZoneById(String(zoneId)),
    countWorkersByZone(zoneId),
  ]);

  if (!zone) {
    throw new AppError('Zone not found', HTTP_STATUS.NOT_FOUND);
  }

  if (!zone.active) {
    throw new AppError('Zone is not available', HTTP_STATUS.BAD_REQUEST);
  }

  return allowedCapacity(workerCount);
}

async function loadBookedCounts(
  zoneId: Types.ObjectId,
  rangeStart: Date,
  rangeEnd: Date,
  session?: ClientSession,
): Promise<Map<number, number>> {
  const rows = await countBookingsPerSlot(zoneId, rangeStart, rangeEnd, session);
  return new Map(rows.map((row) => [new Date(row.startAt).getTime(), row.count]));
}

export async function getZoneAvailability(input: unknown): Promise<ZoneAvailability> {
  const query = parseAvailabilityQuery(input);
  const capacity = await loadZoneCapacity(query.zoneId);

  const startTimes = zoneSlotStartTimes();
  const rangeStart = parseDateOnly(query.startDate);
  const rangeEnd = addDays(rangeStart, query.days);
  const bookedCounts = await loadBookedCounts(query.zoneId, rangeStart, rangeEnd);

  const days = Array.from({ length: query.days }, (_, dayIndex) => {
    const day = addDays(rangeStart, dayIndex);
    const date = toDateOnly(day);
    const closed = isSunday(day);

    return {
      date,
      slots: startTimes.map((startTime) => {
        const bookedCount = bookedCounts.get(toSlotStart(date, startTime).getTime()) ?? 0;

        return {
          startTime,
          endTime: slotEndTime(startTime),
          available: !closed && bookedCount < capacity,
        };
      }),
    };
  });

  return {
    zoneId: String(query.zoneId),
    days,
  };
}

export type RequestedSlot = {
  date: string;
  startTime: string;
  startAt: Date;
};

/**
 * Re-checks availability inside the creation transaction. All requested slots
 * are validated against one query, and occurrences of the same request that
 * share a slot are counted against the capacity together.
 */
export async function assertSlotsAvailable(
  zoneId: Types.ObjectId,
  slots: RequestedSlot[],
  session?: ClientSession,
): Promise<void> {
  if (slots.length === 0) {
    throw new AppError('At least one booking slot is required', HTTP_STATUS.BAD_REQUEST);
  }

  const capacity = await loadZoneCapacity(zoneId);
  const startTimestamps = slots.map((slot) => slot.startAt.getTime());
  const rangeStart = new Date(Math.min(...startTimestamps));
  const rangeEnd = addMinutes(new Date(Math.max(...startTimestamps)), 1);
  const bookedCounts = await loadBookedCounts(zoneId, rangeStart, rangeEnd, session);

  const requestedPerSlot = new Map<number, number>();

  for (const slot of slots) {
    const key = slot.startAt.getTime();
    const requested = (requestedPerSlot.get(key) ?? 0) + 1;
    requestedPerSlot.set(key, requested);

    const bookedCount = (bookedCounts.get(key) ?? 0) + requested - 1;

    if (bookedCount >= capacity) {
      throw new AppError(
        `Slot ${slot.date} ${slot.startTime} is not available`,
        HTTP_STATUS.CONFLICT,
      );
    }
  }
}

export function toRequestedSlots(
  occurrences: SubscriptionOccurrence[],
): RequestedSlot[] {
  return occurrences.map((occurrence) => ({
    date: occurrence.date,
    startTime: occurrence.startTime,
    startAt: occurrence.startAt,
  }));
}
