import { ClientSession, Types } from 'mongoose';
import { HTTP_STATUS } from '../constants/http-status';
import { MONTHLY_PLAN_DISCOUNT_PERCENT } from '../constants/plan';
import { IService } from '../models/service.model';
import {
  BookingResponse,
  CreateBookingRecordInput,
  createBookingRecords,
  toBookingResponse,
} from '../repositories/booking.repository';
import { findCustomerById } from '../repositories/customer.repository';
import { findServiceById } from '../repositories/service.repository';
import {
  SubscriptionResponse,
  createSubscriptionRecord,
  toSubscriptionResponse,
} from '../repositories/subscription.repository';
import { findZoneById } from '../repositories/zone.repository';
import { SubscriptionOccurrence } from '../types/booking';
import { GeneratedPlan, PlanWash } from '../types/plan';
import { AppError } from '../utils/app-error';
import { addMinutes, isSunday, parseDateOnly, toSlotStart } from '../utils/slot-date';
import { runInTransaction } from '../utils/transaction';
import {
  CreateOneTimeBookingInput,
  CreateSubscriptionInput,
  parseCreateBookingInput,
} from '../validation/booking.schema';
import {
  assertSlotsAvailable,
  isSupportedSlotTime,
  toRequestedSlots,
} from './booking-availability';
import { buildOneTimeWash, compareOneTimePricing } from './booking-pricing';
import { comparePlans } from './plan-verifier';
import { generatePlan } from './plan.service';
import { generateOccurrences } from './subscription-schedule';

export type CreateBookingResult = {
  subscription: SubscriptionResponse | null;
  bookings: BookingResponse[];
};

function pricingError(errors: string[]): AppError {
  return new AppError(
    `Pricing validation failed: ${errors.join('; ')}`,
    HTTP_STATUS.UNPROCESSABLE_ENTITY,
  );
}

function assertBookableSlot(date: string, startTime: string): void {
  if (!isSupportedSlotTime(startTime)) {
    throw new AppError(
      `Slot start time is not available: ${startTime}`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  if (isSunday(parseDateOnly(date))) {
    throw new AppError('Sunday is a holiday', HTTP_STATUS.BAD_REQUEST);
  }

  if (toSlotStart(date, startTime).getTime() < Date.now()) {
    throw new AppError('Booking slot is in the past', HTTP_STATUS.BAD_REQUEST);
  }
}

async function assertCustomerAndZone(
  customerId: Types.ObjectId,
  zoneId: Types.ObjectId,
): Promise<void> {
  const [customer, zone] = await Promise.all([
    findCustomerById(String(customerId)),
    findZoneById(String(zoneId)),
  ]);

  if (!customer) {
    throw new AppError('Customer not found', HTTP_STATUS.NOT_FOUND);
  }

  if (!zone) {
    throw new AppError('Zone not found', HTTP_STATUS.NOT_FOUND);
  }

  if (!zone.active) {
    throw new AppError('Zone is not available', HTTP_STATUS.BAD_REQUEST);
  }
}

async function loadActiveService(serviceId: string): Promise<IService> {
  const service = await findServiceById(serviceId);

  if (!service) {
    throw new AppError('Service not found', HTTP_STATUS.NOT_FOUND);
  }

  if (!service.active) {
    throw new AppError('Service is not available', HTTP_STATUS.BAD_REQUEST);
  }

  return service;
}

function toBookingRecord(params: {
  input: { customerId: Types.ObjectId; serviceId: string; zoneId: Types.ObjectId };
  bookingType: CreateBookingRecordInput['bookingType'];
  subscriptionId: Types.ObjectId | null;
  date: string;
  startTime: string;
  wash: PlanWash;
}): CreateBookingRecordInput {
  const startAt = toSlotStart(params.date, params.startTime);

  return {
    customerId: params.input.customerId,
    serviceId: new Types.ObjectId(params.input.serviceId),
    zoneId: params.input.zoneId,
    subscriptionId: params.subscriptionId,
    bookingType: params.bookingType,
    date: params.date,
    startTime: params.startTime,
    startAt,
    endAt: addMinutes(startAt, params.wash.totalDurationMinutes),
    items: params.wash.items.map((item) => ({
      slug: item.slug,
      title: item.title,
      price: item.price,
      durationMinutes: item.durationMinutes,
    })),
    totalPrice: params.wash.totalPrice,
    totalDurationMinutes: params.wash.totalDurationMinutes,
  };
}

function findCalculatedWash(
  plan: GeneratedPlan,
  occurrence: SubscriptionOccurrence,
): PlanWash {
  const wash = plan.weeks
    .find((week) => week.week === occurrence.week)
    ?.washes.find((candidate) => candidate.washNumber === occurrence.washNumber);

  if (!wash) {
    throw new AppError(
      `Plan has no wash ${occurrence.washNumber} in week ${occurrence.week}`,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    );
  }

  return wash;
}

async function createOneTimeBooking(
  input: CreateOneTimeBookingInput,
): Promise<CreateBookingResult> {
  assertBookableSlot(input.date, input.startTime);

  const [service] = await Promise.all([
    loadActiveService(input.serviceId),
    assertCustomerAndZone(input.customerId, input.zoneId),
  ]);

  const wash = buildOneTimeWash(service.items ?? [], input.selectedFeatures);
  const errors = compareOneTimePricing(wash, input);

  if (errors.length > 0) {
    throw pricingError(errors);
  }

  const record = toBookingRecord({
    input,
    bookingType: 'ONE_TIME',
    subscriptionId: null,
    date: input.date,
    startTime: input.startTime,
    wash,
  });

  const bookings = await runInTransaction(async (session: ClientSession) => {
    await assertSlotsAvailable(
      input.zoneId,
      [{ date: record.date, startTime: record.startTime, startAt: record.startAt }],
      session,
    );

    return createBookingRecords([record], session);
  });

  return {
    subscription: null,
    bookings: bookings.map(toBookingResponse),
  };
}

async function createSubscription(
  input: CreateSubscriptionInput,
): Promise<CreateBookingResult> {
  assertBookableSlot(input.date, input.startTime);
  await assertCustomerAndZone(input.customerId, input.zoneId);

  const plan = await generatePlan({
    serviceId: input.serviceId,
    planType: input.planType,
    selectedFeatures: input.selectedFeatures,
    washModifications: input.washModifications,
  });

  const submitted: GeneratedPlan = {
    serviceId: input.serviceId,
    planType: input.planType,
    selectedFeatures: input.selectedFeatures,
    discountPercent: input.discountPercent,
    weeks: input.weeks,
    totalPrice: input.totalPrice,
    totalDurationMinutes: input.totalDurationMinutes,
    totalWashes: input.totalWashes,
  };

  const comparison = comparePlans(plan, submitted);
  if (!comparison.valid) {
    throw pricingError(comparison.errors ?? ['Submitted plan does not match']);
  }

  const occurrences = generateOccurrencesForPlan(input);
  const records = occurrences.map((occurrence) =>
    toBookingRecord({
      input,
      bookingType: 'MONTHLY_SUBSCRIPTION',
      subscriptionId: null,
      date: occurrence.date,
      startTime: occurrence.startTime,
      wash: findCalculatedWash(plan, occurrence),
    }),
  );

  const created = await runInTransaction(async (session: ClientSession) => {
    await assertSlotsAvailable(input.zoneId, toRequestedSlots(occurrences), session);

    const subscription = await createSubscriptionRecord(
      {
        customerId: input.customerId,
        serviceId: new Types.ObjectId(input.serviceId),
        zoneId: input.zoneId,
        planType: input.planType,
        startDate: input.date,
        startTime: input.startTime,
        selectedFeatures: input.selectedFeatures,
        totalPrice: plan.totalPrice,
        totalDurationMinutes: plan.totalDurationMinutes,
        totalWashes: plan.totalWashes,
        discountPercent: MONTHLY_PLAN_DISCOUNT_PERCENT,
      },
      session,
    );

    const bookings = await createBookingRecords(
      records.map((record) => ({ ...record, subscriptionId: subscription._id })),
      session,
    );

    return { subscription, bookings };
  });

  return {
    subscription: toSubscriptionResponse(created.subscription),
    bookings: created.bookings.map(toBookingResponse),
  };
}

function generateOccurrencesForPlan(
  input: CreateSubscriptionInput,
): SubscriptionOccurrence[] {
  const occurrences = generateOccurrences(input.planType, input.date, input.startTime);

  if (occurrences.length !== input.totalWashes) {
    throw pricingError([
      `totalWashes must be ${occurrences.length} for ${input.planType} but ${input.totalWashes} was submitted`,
    ]);
  }

  return occurrences;
}

export async function createBooking(input: unknown): Promise<CreateBookingResult> {
  const parsed = parseCreateBookingInput(input);

  return parsed.bookingType === 'ONE_TIME'
    ? createOneTimeBooking(parsed)
    : createSubscription(parsed);
}
