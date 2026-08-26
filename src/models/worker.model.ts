import { HydratedDocument, Model, Schema, Types, model } from 'mongoose';
import { AADHAAR_REGEX, INDIAN_PHONE_REGEX } from '../constants/validation';
import { GeoPoint } from './zone.model';

export interface IWorker {
  name: string;
  phone: string;
  aadharNumber: string;
  zoneId: Types.ObjectId;
  primaryLocation: GeoPoint;
}

export type IWorkerDocument = HydratedDocument<IWorker>;

function isValidCoordinates(value: number[]): boolean {
  if (value.length !== 2) {
    return false;
  }

  const [longitude, latitude] = value;
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

const geoPointSchema = new Schema<GeoPoint>(
  {
    type: {
      type: String,
      enum: {
        values: ['Point'],
        message: 'Location type must be Point',
      },
      required: [true, 'Location type is required'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: [true, 'Location coordinates are required'],
      validate: {
        validator: isValidCoordinates,
        message: 'Coordinates must be [longitude, latitude] with valid ranges',
      },
    },
  },
  { _id: false },
);

const workerSchema = new Schema<IWorker>(
  {
    name: {
      type: String,
      required: [true, 'Worker name is required'],
      trim: true,
      maxlength: [100, 'Worker name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      validate: {
        validator(value: string): boolean {
          return INDIAN_PHONE_REGEX.test(value);
        },
        message:
          'Phone number must be a valid Indian mobile number (10 digits starting with 6–9, optionally prefixed with +91 or 91)',
      },
    },
    aadharNumber: {
      type: String,
      required: [true, 'Aadhaar number is required'],
      trim: true,
      select: false,
      validate: {
        validator(value: string): boolean {
          return AADHAAR_REGEX.test(value);
        },
        message: 'Aadhaar number must be a valid 12-digit number',
      },
    },
    zoneId: {
      type: Schema.Types.ObjectId,
      ref: 'Zone',
      required: [true, 'Zone is required'],
    },
    primaryLocation: {
      type: geoPointSchema,
      required: [true, 'Primary location is required'],
    },
  },
  {
    timestamps: true,
  },
);

workerSchema.index({ primaryLocation: '2dsphere' });

export const Worker: Model<IWorker> = model<IWorker>('Worker', workerSchema);
