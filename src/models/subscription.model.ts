import { HydratedDocument, Model, Schema, Types, model } from 'mongoose';
import {
  SUBSCRIPTION_STATUSES,
  SubscriptionStatus,
} from '../constants/booking';
import { PLAN_TYPES, PlanType } from '../constants/plan';
import { DATE_ONLY_REGEX, TIME_OF_DAY_REGEX } from '../constants/validation';

export interface ISubscription {
  customerId: Types.ObjectId;
  serviceId: Types.ObjectId;
  zoneId: Types.ObjectId;
  planType: PlanType;
  startDate: string;
  startTime: string;
  selectedFeatures: string[];
  totalPrice: number;
  totalDurationMinutes: number;
  totalWashes: number;
  discountPercent: number;
  status: SubscriptionStatus;
}

export type ISubscriptionDocument = HydratedDocument<ISubscription>;

const subscriptionSchema = new Schema<ISubscription>(
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
    planType: {
      type: String,
      required: [true, 'Plan type is required'],
      enum: {
        values: PLAN_TYPES,
        message: 'Invalid plan type',
      },
    },
    startDate: {
      type: String,
      required: [true, 'Start date is required'],
      match: [DATE_ONLY_REGEX, 'Start date must be in YYYY-MM-DD format'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [TIME_OF_DAY_REGEX, 'Start time must be in HH:MM format'],
    },
    selectedFeatures: {
      type: [String],
      required: true,
      default: [],
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
    totalWashes: {
      type: Number,
      required: [true, 'Total washes is required'],
      min: [1, 'A subscription needs at least one wash'],
    },
    discountPercent: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100 percent'],
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: SUBSCRIPTION_STATUSES,
        message: 'Invalid subscription status',
      },
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  },
);

// Subscriptions are listed per customer, usually filtered by status.
subscriptionSchema.index({ customerId: 1, status: 1 });

export const Subscription: Model<ISubscription> = model<ISubscription>(
  'Subscription',
  subscriptionSchema,
);
