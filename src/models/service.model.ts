import { HydratedDocument, Model, Schema, model } from 'mongoose';
import {
  MONTHLY_RULES,
  MonthlyRule,
  SERVICE_CATEGORIES,
  ServiceCategory,
  VEHICLE_TYPES,
  VehicleType,
} from '../constants/service';

export interface IServiceItemPricing {
  oneTime: number;
  monthly: number | null;
}

export interface IServiceItem {
  slug: string;
  title: string;
  description: string;
  image: string;
  bannerImage?: string;
  pricing: IServiceItemPricing;
  durationMinutes: number;
  mandatory: boolean;
  selected: boolean;
  active: boolean;
  monthlyRule: MonthlyRule;
}

export interface IService {
  title: string;
  vehicleType: VehicleType;
  category: ServiceCategory;
  description: string;
  bannerImage: string;
  active: boolean;
  items: IServiceItem[];
  createdAt: Date;
  updatedAt: Date;
}

export type IServiceDocument = HydratedDocument<IService>;

const serviceItemPricingSchema = new Schema<IServiceItemPricing>(
  {
    oneTime: {
      type: Number,
      required: [true, 'One-time price is required'],
      min: [0, 'One-time price cannot be negative'],
    },
    monthly: {
      type: Number,
      default: null,
      min: [0, 'Monthly price cannot be negative'],
    },
  },
  { _id: false },
);

const serviceItemSchema = new Schema<IServiceItem>(
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
    description: {
      type: String,
      required: [true, 'Item description is required'],
      trim: true,
    },
    image: {
      type: String,
      required: [true, 'Item image is required'],
      trim: true,
    },
    bannerImage: {
      type: String,
      trim: true,
    },
    pricing: {
      type: serviceItemPricingSchema,
      required: [true, 'Item pricing is required'],
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Item duration is required'],
      min: [0, 'Duration cannot be negative'],
    },
    mandatory: {
      type: Boolean,
      required: true,
      default: false,
    },
    selected: {
      type: Boolean,
      required: true,
      default: false,
    },
    active: {
      type: Boolean,
      required: true,
      default: true,
    },
    monthlyRule: {
      type: String,
      required: [true, 'Monthly rule is required'],
      enum: {
        values: MONTHLY_RULES,
        message: 'Invalid monthly rule',
      },
    },
  },
  { _id: false },
);

const serviceSchema = new Schema<IService>(
  {
    title: {
      type: String,
      required: [true, 'Service title is required'],
      trim: true,
    },
    vehicleType: {
      type: String,
      required: [true, 'Vehicle type is required'],
      enum: {
        values: VEHICLE_TYPES,
        message: 'Vehicle type must be car or bike',
      },
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: SERVICE_CATEGORIES,
        message: 'Category must be basic or premium',
      },
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    bannerImage: {
      type: String,
      required: [true, 'Banner image is required'],
      trim: true,
    },
    active: {
      type: Boolean,
      required: true,
      default: true,
    },
    items: {
      type: [serviceItemSchema],
      required: true,
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export const Service: Model<IService> = model<IService>('Service', serviceSchema);
