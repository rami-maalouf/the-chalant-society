// shared by the /merch page and api/merch-waitlist.ts, so both use the same lists

export const ITEM = "chalant | nonchalant tee";

export const SIDES = ["chalant", "nonchalant"] as const;
export type Side = (typeof SIDES)[number];

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export type Size = (typeof SIZES)[number];

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EMAIL_MAX = 254;
export const SOURCE_MAX = 50;

export function isSide(value: unknown): value is Side {
  return typeof value === "string" && (SIDES as readonly string[]).includes(value);
}

export function isSize(value: unknown): value is Size {
  return typeof value === "string" && (SIZES as readonly string[]).includes(value);
}

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidEmail(email: string): boolean {
  return email.length <= EMAIL_MAX && EMAIL_RE.test(email);
}

export type WaitlistRequest = {
  email: string;
  side: Side;
  size: Size;
  source?: string;
  // honeypot: real people never fill it
  company?: string;
};

export type WaitlistResponse =
  | { success: true; alreadyAdded: boolean }
  | { success?: false; error: string };
