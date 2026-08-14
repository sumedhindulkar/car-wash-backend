import { Document, Model, Schema, model } from 'mongoose';
import { EMAIL_REGEX, INDIAN_PHONE_REGEX } from '../constants/validation';

export interface IUser {
  phoneNumber: string;
  name?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {}

const userSchema = new Schema<IUserDocument>(
  {
    phoneNumber: {
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
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      set(value: string | undefined | null): string | undefined {
        if (value == null || value.trim() === '') {
          return undefined;
        }
        return value;
      },
      validate: {
        validator(value: string | undefined | null): boolean {
          if (value == null || value === '') {
            return true;
          }
          return EMAIL_REGEX.test(value);
        },
        message: 'Please provide a valid email address',
      },
    },
  },
  {
    timestamps: true,
  },
);

export const User: Model<IUserDocument> = model<IUserDocument>('User', userSchema);
