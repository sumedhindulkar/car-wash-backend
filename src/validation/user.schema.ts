import { z } from 'zod';
import {
  emailSchema,
  forbiddenIdFields,
  indianPhoneSchema,
  parseSchema,
} from './common';

export const createUserSchema = z.object({
  phoneNumber: indianPhoneSchema,
  name: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z
      .string()
      .trim()
      .max(100, 'Name cannot exceed 100 characters')
      .optional(),
  ),
  email: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    emailSchema.optional(),
  ),
});

export const updateUserSchema = z
  .object({
    ...forbiddenIdFields('User'),
    phoneNumber: z.never({
      error: 'Phone number cannot be updated',
    }).optional(),
    name: z.preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
      z
        .string()
        .trim()
        .max(100, 'Name cannot exceed 100 characters')
        .optional(),
    ),
    email: z.preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
      emailSchema.optional(),
    ),
  })
  .refine(
    (value) => value.name !== undefined || value.email !== undefined,
    {
      message: 'Provide at least one field to update: name or email',
    },
  );

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = {
  name?: string;
  email?: string;
};

export function parseCreateUserInput(input: unknown): CreateUserInput {
  return parseSchema(createUserSchema, input);
}

export function parseUpdateUserInput(input: unknown): UpdateUserInput {
  const parsed = parseSchema(updateUserSchema, input);
  return {
    ...(parsed.name !== undefined ? { name: parsed.name } : {}),
    ...(parsed.email !== undefined ? { email: parsed.email } : {}),
  };
}
