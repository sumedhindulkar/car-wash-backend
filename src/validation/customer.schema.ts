import { Types } from 'mongoose';
import { z } from 'zod';
import {
  forbiddenIdFields,
  indianPhoneSchema,
  nonEmptyString,
  parseSchema,
} from './common';

export type CustomerIdentifier =
  | { type: 'id'; value: string }
  | { type: 'phone'; value: string };

function isObjectIdString(value: string): boolean {
  return (
    Types.ObjectId.isValid(value) && String(new Types.ObjectId(value)) === value
  );
}

export const createCustomerSchema = z.object({
  name: nonEmptyString('name is required').max(
    100,
    'Customer name cannot exceed 100 characters',
  ),
  phone: indianPhoneSchema,
});

export const updateCustomerSchema = z.object({
  ...forbiddenIdFields('Customer'),
  phone: z
    .never({
      error: 'Phone number cannot be updated',
    })
    .optional(),
  name: nonEmptyString('name is required').max(
    100,
    'Customer name cannot exceed 100 characters',
  ),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = { name: string };

export function parseCreateCustomerInput(input: unknown): CreateCustomerInput {
  return parseSchema(createCustomerSchema, input);
}

export function parseUpdateCustomerInput(input: unknown): UpdateCustomerInput {
  const parsed = parseSchema(updateCustomerSchema, input);
  return { name: parsed.name };
}

export function parseCustomerIdentifier(input: unknown): CustomerIdentifier {
  const identifier = parseSchema(
    nonEmptyString('Customer identifier is required'),
    input,
  );

  if (isObjectIdString(identifier)) {
    return { type: 'id', value: identifier };
  }

  const phone = parseSchema(indianPhoneSchema, identifier);
  return { type: 'phone', value: phone };
}
