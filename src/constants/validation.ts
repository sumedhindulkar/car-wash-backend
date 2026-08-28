/** Indian mobile: optional +91 / 91, then 10 digits starting with 6–9. */
export const INDIAN_PHONE_REGEX = /^(?:\+91|91)?[6-9]\d{9}$/;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Indian PIN code: 6 digits, first digit 1–9. */
export const INDIAN_PINCODE_REGEX = /^[1-9][0-9]{5}$/;

/** Aadhaar: exactly 12 digits. */
export const AADHAAR_REGEX = /^\d{12}$/;

/** Calendar date without time: YYYY-MM-DD. */
export const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Time of day in 24-hour form: HH:MM. */
export const TIME_OF_DAY_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
