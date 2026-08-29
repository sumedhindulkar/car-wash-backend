import { Types } from 'mongoose';
import { IUser, IUserDocument, User } from '../models/user.model';

export type CreateUserInput = {
  phoneNumber: string;
  name?: string;
  email?: string;
};

export type UpdateUserInput = {
  name?: string;
  email?: string;
};

export async function createUser(
  input: CreateUserInput,
): Promise<IUserDocument> {
  return User.create(input);
}

export async function findUserById(id: string): Promise<IUserDocument | null> {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }

  return User.findById(id);
}

export async function findUserByPhoneNumber(
  phoneNumber: string,
): Promise<IUserDocument | null> {
  return User.findOne({ phoneNumber });
}

export async function updateUserById(
  id: string,
  input: UpdateUserInput,
): Promise<IUserDocument | null> {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }

  return User.findByIdAndUpdate(
    id,
    { $set: input },
    {
      new: true,
      runValidators: true,
      context: 'query',
    },
  );
}

export async function deleteUserById(
  id: string,
): Promise<IUserDocument | null> {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }

  return User.findByIdAndDelete(id);
}

export type UserResponse = Pick<
  IUser,
  'phoneNumber' | 'name' | 'email' | 'createdAt' | 'updatedAt'
> & {
  id: string;
};

export function toUserResponse(user: IUserDocument): UserResponse {
  return {
    id: String(user._id),
    phoneNumber: user.phoneNumber,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
