import { HydratedDocument, Model, Schema, Types, model } from 'mongoose';
import { INDIAN_PINCODE_REGEX } from '../constants/validation';
import { DEFAULT_SERVICE_RADIUS_KM } from '../constants/zone';

export type GeoPoint = {
  type: 'Point';
  coordinates: [number, number];
};

export interface IZone {
  name: string;
  workerIds: Types.ObjectId[];
  pincodes: string[];
  location: GeoPoint;
  serviceRadiusKm: number;
  active: boolean;
}

export type IZoneDocument = HydratedDocument<IZone>;

function hasUniqueStrings(values: string[]): boolean {
  return new Set(values).size === values.length;
}

function hasUniqueObjectIds(values: Types.ObjectId[]): boolean {
  return new Set(values.map(String)).size === values.length;
}

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

const zoneSchema = new Schema<IZone>(
  {
    name: {
      type: String,
      required: [true, 'Zone name is required'],
      trim: true,
      maxlength: [100, 'Zone name cannot exceed 100 characters'],
    },
    workerIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Worker',
        },
      ],
      default: [],
      validate: {
        validator: hasUniqueObjectIds,
        message: 'workerIds must be unique within a zone',
      },
    },
    pincodes: {
      type: [
        {
          type: String,
          trim: true,
          validate: {
            validator(value: string): boolean {
              return INDIAN_PINCODE_REGEX.test(value);
            },
            message: 'Pincode must be a valid 6-digit Indian pincode',
          },
        },
      ],
      required: [true, 'Pincodes are required'],
      validate: [
        {
          validator(value: string[]): boolean {
            return value.length >= 1;
          },
          message: 'At least one pincode is required',
        },
        {
          validator: hasUniqueStrings,
          message: 'Pincodes must be unique within a zone',
        },
      ],
    },
    location: {
      type: geoPointSchema,
      required: [true, 'Location is required'],
    },
    serviceRadiusKm: {
      type: Number,
      required: true,
      default: DEFAULT_SERVICE_RADIUS_KM,
      min: [0, 'Service radius cannot be negative'],
    },
    active: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

zoneSchema.index({ location: '2dsphere' });
zoneSchema.index(
  { pincodes: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true },
    name: 'unique_active_pincodes',
  },
);

export const Zone: Model<IZone> = model<IZone>('Zone', zoneSchema);
