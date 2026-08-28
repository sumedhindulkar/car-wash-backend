import { Types } from 'mongoose';
import { Customer, ICustomerDocument } from '../models/customer.model';

export type CreateCustomerRecordInput = {
  name: string;
  phone: string;
};

export type UpdateCustomerRecordInput = {
  name?: string;
};

export type CustomerResponse = {
  id: string;
  name: string;
  phone: string;
};

export function toCustomerResponse(customer: ICustomerDocument): CustomerResponse {
  return {
    id: String(customer._id),
    name: customer.name,
    phone: customer.phone,
  };
}

export async function createCustomerRecord(
  input: CreateCustomerRecordInput,
): Promise<ICustomerDocument> {
  return Customer.create(input);
}

export async function findCustomerById(id: string): Promise<ICustomerDocument | null> {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }

  return Customer.findById(id);
}

export async function findCustomerByPhone(
  phone: string,
): Promise<ICustomerDocument | null> {
  return Customer.findOne({ phone });
}

export async function updateCustomerById(
  id: string,
  input: UpdateCustomerRecordInput,
): Promise<ICustomerDocument | null> {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }

  return Customer.findByIdAndUpdate(
    id,
    { $set: input },
    {
      returnDocument: 'after',
      runValidators: true,
      context: 'query',
    },
  );
}
