/** Indian mobile: optional +91 / 91, then 10 digits starting with 6–9. */
export const INDIAN_PHONE_REGEX = /^(?:\+91|91)?[6-9]\d{9}$/;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Indian PIN code: 6 digits, first digit 1–9. */
export const INDIAN_PINCODE_REGEX = /^[1-9][0-9]{5}$/;

/** Aadhaar: exactly 12 digits. */
export const AADHAAR_REGEX = /^\d{12}$/;
