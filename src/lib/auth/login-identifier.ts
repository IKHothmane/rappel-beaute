import { localPhoneDigits, PHONE_MAX_DIGITS } from "@/lib/validation/customer";

export function normalizeLoginPhone(value: string): string | null {
  if (value.length > 40 || !/^\+?[\d\s().-]+$/.test(value.trim())) return null;
  const phone = localPhoneDigits(value);
  return phone.length >= 8 && phone.length <= PHONE_MAX_DIGITS ? phone : null;
}

export function normalizeLoginIdentifier(value: string): string {
  return normalizeLoginPhone(value) ?? value.trim().toLowerCase();
}
