import { HydratedDocument, Model, Schema, Types, model } from 'mongoose';
import {
  BOOKING_STATUSES,
  BOOKING_TYPES,
  BookingStatus,
  BookingType,
} from '../constants/booking';
import { DATE_ONLY_REGEX, TIME_OF_DAY_REGEX } from '../constants/validation';

export interface IBookingItem {
  slug: string;
  title: string;
  price: number;
  durationMinutes: number;
}

export interface IBooking {
  customerId: Types.ObjectId;
  serviceId: Types.ObjectId;
  zoneId: Types.ObjectId;
  subscriptionId: Types.ObjectId | null;
  bookingType: BookingType;
  date: string;
  startTime: string;
  startAt: Date;
  endAt: Date;
  workerId: Types.ObjectId | null;
  status: BookingStatus;
  items: IBookingItem[];
  totalPrice: number;
  totalDurationMinutes: number;
}

export type IBookingDocument = HydratedDocument<IBooking>;

const bookingItemSchema = new Schema<IBookingItem>(
  {
    slug: {
      type: String,
      required: [true, 'Item slug is required'],
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Item title is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Item price is required'],
      min: [0, 'Item price cannot be negative'],
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Item duration is required'],
      min: [0, 'Item duration cannot be negative'],
    },
  },
  { _id: false },
);

const bookingSchema = new Schema<IBooking>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service is required'],
    },
    zoneId: {
      type: Schema.Types.ObjectId,
      ref: 'Zone',
      required: [true, 'Zone is required'],
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
    },
    bookingType: {
      type: String,
      required: [true, 'Booking type is required'],
      enum: {
        values: BOOKING_TYPES,
        message: 'Invalid booking type',
      },
    },
    date: {
      type: String,
      required: [true, 'Booking date is required'],
      match: [DATE_ONLY_REGEX, 'Booking date must be in YYYY-MM-DD format'],
    },
    startTime: {
      type: String,
      required: [true, 'Slot start time is required'],
      match: [TIME_OF_DAY_REGEX, 'Slot start time must be in HH:MM format'],
    },
    startAt: {
      type: Date,
      required: [true, 'Booking start is required'],
    },
    endAt: {
      type: Date,
      required: [true, 'Booking end is required'],
    },
    workerId: {
      type: Schema.Types.ObjectId,
      ref: 'Worker',
      default: null,
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: BOOKING_STATUSES,
        message: 'Invalid booking status',
      },
      default: 'UNASSIGNED',
    },
    items: {
      type: [bookingItemSchema],
      required: true,
      validate: {
        validator(value: IBookingItem[]): boolean {
          return value.length > 0;
        },
        message: 'A booking needs at least one item',
      },
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Total price cannot be negative'],
    },
    totalDurationMinutes: {
      type: Number,
      required: [true, 'Total duration is required'],
      min: [0, 'Total duration cannot be negative'],
    },
  },
  {
    timestamps: true,
  },
);

// Slot availability counts bookings per zone, per capacity-blocking status,
// inside a start-time range.
bookingSchema.index({ zoneId: 1, status: 1, startAt: 1 });

// Bookings of a subscription are read and updated together.
bookingSchema.index({ subscriptionId: 1 });

export const Booking: Model<IBooking> = model<IBooking>('Booking', bookingSchema);
