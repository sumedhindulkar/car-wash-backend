export type SlotAvailability = {
  startTime: string;
  endTime: string;
  available: boolean;
};

export type DayAvailability = {
  date: string;
  slots: SlotAvailability[];
};

export type ZoneAvailability = {
  zoneId: string;
  days: DayAvailability[];
};

export type SubscriptionOccurrence = {
  week: number;
  washNumber: number;
  date: string;
  startTime: string;
  startAt: Date;
};
