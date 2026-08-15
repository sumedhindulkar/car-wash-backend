export const VEHICLE_TYPES = ['car', 'bike'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const SERVICE_CATEGORIES = ['basic', 'premium'] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const MONTHLY_RULES = ['every_visit', 'multiple', 'once'] as const;
export type MonthlyRule = (typeof MONTHLY_RULES)[number];
