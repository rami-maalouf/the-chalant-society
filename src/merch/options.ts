// shared by the /merch page and api/merch-waitlist.ts, so both use the same lists

// every shirt on the page. add a shirt here and the page, the 3d slider and the api all pick it up.
// the first shirt is the one the page opens on.
// `item` is the option in the notion "Item" column. `sides` are the two words, left then right.
export const SHIRTS = [
  {
    id: "claude-vs-chatgpt",
    item: "claude | chatgpt tee",
    sides: ["claude", "chatgpt"],
    marks: ["claude", "chatgpt"],
    drop: "drop 01",
  },
  {
    id: "chalant-vs-nonchalant",
    item: "chalant | nonchalant tee",
    sides: ["chalant", "nonchalant"],
    drop: "drop 02",
  },
] as const satisfies readonly {
  id: string;
  item: string;
  sides: readonly [string, string];
  // optional marks printed above each word (see logos.ts)
  marks?: readonly ["claude" | "chatgpt", "claude" | "chatgpt"];
  drop: string;
}[];

export type Shirt = (typeof SHIRTS)[number];
export type ShirtId = Shirt["id"];

export function findShirt(id: unknown): Shirt | undefined {
  return SHIRTS.find((shirt) => shirt.id === id);
}

export function isSideOf(shirt: Shirt, value: unknown): value is string {
  return typeof value === "string" && (shirt.sides as readonly string[]).includes(value);
}

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export type Size = (typeof SIZES)[number];

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EMAIL_MAX = 254;
export const SOURCE_MAX = 50;

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
  shirt: ShirtId;
  email: string;
  side: string;
  size: Size;
  source?: string;
  // honeypot: real people never fill it
  company?: string;
};

export type WaitlistResponse =
  | { success: true; alreadyAdded: boolean }
  | { success?: false; error: string };
