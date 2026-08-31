// ── Book pricing ─────────────────────────────────────────────
// Update these values to change displayed / charged prices.
export const PRICES = {
  INR: { amount: 51,   symbol: '₹',  display: '₹51',    currency: 'INR' },
  GBP: { amount: 9.99, symbol: '£',  display: '£9.99',  currency: 'GBP' },
} as const;

export type CurrencyCode = keyof typeof PRICES;
export const DEFAULT_CURRENCY: CurrencyCode = 'INR';

// ── Book identifier ──────────────────────────────────────────
export const BOOK_ID = 'koltey-golai';

// ── VIP / complimentary access ───────────────────────────────
// Emails listed here get full access automatically when logged in —
// no purchase required. Add more emails as needed.
const VIP_EMAILS_RAW = [
  'basantanickal@gmail.com',
  'basantsai26@gmail.com',
];

const VIP_SET = new Set(VIP_EMAILS_RAW.map(e => e.toLowerCase().trim()));

export function isVipEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return VIP_SET.has(email.toLowerCase().trim());
}
