import { HydratedDocument, Model, Schema, model } from 'mongoose';
import { INDIAN_PHONE_REGEX } from '../constants/validation';

export interface ICustomer {
  name: string;
  phone: string;
}

export type ICustomerDocument = HydratedDocument<ICustomer>;

const customerSchema = new Schema<ICustomer>(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [100, 'Customer name cannot exceed 100 characters'],
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
  },
  {
    timestamps: true,
  },
);

export const Customer: Model<ICustomer> = model<ICustomer>(
  'Customer',
  customerSchema,
);
