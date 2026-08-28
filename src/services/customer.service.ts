import { HTTP_STATUS } from '../constants/http-status';
import { ICustomerDocument } from '../models/customer.model';
import {
  CustomerResponse,
  createCustomerRecord,
  findCustomerById,
  findCustomerByPhone,
  toCustomerResponse,
  updateCustomerById,
} from '../repositories/customer.repository';
import { AppError } from '../utils/app-error';
import {
  parseCreateCustomerInput,
  parseCustomerIdentifier,
  parseUpdateCustomerInput,
} from '../validation/customer.schema';

async function findCustomerByIdentifier(
  identifierInput: unknown,
): Promise<ICustomerDocument> {
  const identifier = parseCustomerIdentifier(identifierInput);

  const customer =
    identifier.type === 'id'
      ? await findCustomerById(identifier.value)
      : await findCustomerByPhone(identifier.value);

  if (!customer) {
    throw new AppError('Customer not found', HTTP_STATUS.NOT_FOUND);
  }

  return customer;
}

export async function createCustomer(input: unknown): Promise<CustomerResponse> {
  const parsed = parseCreateCustomerInput(input);
  const customer = await createCustomerRecord(parsed);

  return toCustomerResponse(customer);
}

export async function getCustomer(identifierInput: unknown): Promise<CustomerResponse> {
  const customer = await findCustomerByIdentifier(identifierInput);
  return toCustomerResponse(customer);
}

export async function updateCustomer(
  identifierInput: unknown,
  input: unknown,
): Promise<CustomerResponse> {
  const existing = await findCustomerByIdentifier(identifierInput);
  const parsed = parseUpdateCustomerInput(input);

  const customer = await updateCustomerById(String(existing._id), parsed);
  if (!customer) {
    throw new AppError('Customer not found', HTTP_STATUS.NOT_FOUND);
  }

  return toCustomerResponse(customer);
}
