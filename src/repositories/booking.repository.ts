import { ClientSession, Types } from 'mongoose';
import { CAPACITY_BLOCKING_BOOKING_STATUSES } from '../constants/booking';
import { Booking, IBooking, IBookingDocument } from '../models/booking.model';

export type CreateBookingRecordInput = Omit<IBooking, 'status' | 'workerId'>;

export type BookingResponse = {
  id: string;
  customerId: string;
  serviceId: string;
  zoneId: string;
  subscriptionId: string | null;
  bookingType: IBooking['bookingType'];
  date: string;
  startTime: string;
  startAt: Date;
  endAt: Date;
  workerId: string | null;
  status: IBooking['status'];
  items: IBooking['items'];
  totalPrice: number;
  totalDurationMinutes: number;
};

export type SlotBookedCount = {
  startAt: Date;
  count: number;
};

export function toBookingResponse(booking: IBookingDocument): BookingResponse {
  return {
    id: String(booking._id),
    customerId: String(booking.customerId),
    serviceId: String(booking.serviceId),
    zoneId: String(booking.zoneId),
    subscriptionId: booking.subscriptionId ? String(booking.subscriptionId) : null,
    bookingType: booking.bookingType,
    date: booking.date,
    startTime: booking.startTime,
    startAt: booking.startAt,
    endAt: booking.endAt,
    workerId: booking.workerId ? String(booking.workerId) : null,
    status: booking.status,
    items: booking.items.map((item) => ({
      slug: item.slug,
      title: item.title,
      price: item.price,
      durationMinutes: item.durationMinutes,
    })),
    totalPrice: booking.totalPrice,
    totalDurationMinutes: booking.totalDurationMinutes,
  };
}

export async function createBookingRecords(
  inputs: CreateBookingRecordInput[],
  session?: ClientSession,
): Promise<IBookingDocument[]> {
  return Booking.create(inputs, { session, ordered: true });
}

/**
 * One aggregation returns the booked count of every occupied slot in the range,
 * so the availability grid can be built in memory instead of querying per slot.
 */
export async function countBookingsPerSlot(
  zoneId: Types.ObjectId,
  rangeStart: Date,
  rangeEnd: Date,
  session?: ClientSession,
): Promise<SlotBookedCount[]> {
  const rows = await Booking.aggregate<{ _id: Date; count: number }>(
    [
      {
        $match: {
          zoneId,
          status: { $in: CAPACITY_BLOCKING_BOOKING_STATUSES },
          startAt: { $gte: rangeStart, $lt: rangeEnd },
        },
      },
      {
        $group: {
          _id: '$startAt',
          count: { $sum: 1 },
        },
      },
    ],
    { session },
  );

  return rows.map((row) => ({ startAt: row._id, count: row.count }));
}
