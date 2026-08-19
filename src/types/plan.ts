import { PlanType } from '../constants/plan';

export type WashModification = {
  week: number;
  washNumber: number;
  addFeatures: string[];
};

export type GeneratePlanInput = {
  serviceId: string;
  planType: PlanType;
  selectedFeatures: string[];
  washModifications: WashModification[];
};

export type PlanItem = {
  slug: string;
  title: string;
  price: number;
  durationMinutes: number;
};

export type PlanWash = {
  washNumber: number;
  items: PlanItem[];
  totalPrice: number;
  totalDurationMinutes: number;
};

export type PlanWeek = {
  week: number;
  washes: PlanWash[];
  totalPrice: number;
  totalDurationMinutes: number;
};

export type GeneratedPlan = {
  serviceId: string;
  planType: PlanType;
  selectedFeatures: string[];
  washModifications?: WashModification[];
  weeks: PlanWeek[];
  totalPrice: number;
  totalDurationMinutes: number;
  totalWashes: number;
};

export type PlanScheduleWash = {
  washNumber: number;
  itemSlugs: string[];
};

export type PlanScheduleWeek = {
  week: number;
  washes: PlanScheduleWash[];
};

export type PlanSchedule = {
  weeks: PlanScheduleWeek[];
};

export type VerifyPlanResult = {
  valid: boolean;
  priceValid: boolean;
  calculatedTotal: number;
  submittedTotal: number;
  errors?: string[];
};
