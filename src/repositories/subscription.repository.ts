import { ClientSession } from 'mongoose';
import {
  ISubscription,
  ISubscriptionDocument,
  Subscription,
} from '../models/subscription.model';

export type CreateSubscriptionRecordInput = Omit<ISubscription, 'status'>;

export type SubscriptionResponse = {
  id: string;
  customerId: string;
  serviceId: string;
  zoneId: string;
  planType: ISubscription['planType'];
  startDate: string;
  startTime: string;
  selectedFeatures: string[];
  totalPrice: number;
  totalDurationMinutes: number;
  totalWashes: number;
  discountPercent: number;
  status: ISubscription['status'];
};

export function toSubscriptionResponse(
  subscription: ISubscriptionDocument,
): SubscriptionResponse {
  return {
    id: String(subscription._id),
    customerId: String(subscription.customerId),
    serviceId: String(subscription.serviceId),
    zoneId: String(subscription.zoneId),
    planType: subscription.planType,
    startDate: subscription.startDate,
    startTime: subscription.startTime,
    selectedFeatures: [...subscription.selectedFeatures],
    totalPrice: subscription.totalPrice,
    totalDurationMinutes: subscription.totalDurationMinutes,
    totalWashes: subscription.totalWashes,
    discountPercent: subscription.discountPercent,
    status: subscription.status,
  };
}

export async function createSubscriptionRecord(
  input: CreateSubscriptionRecordInput,
  session?: ClientSession,
): Promise<ISubscriptionDocument> {
  const [subscription] = await Subscription.create([input], { session });
  return subscription;
}
