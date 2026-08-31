# CLAUDE.md — Basant Pradhan Author Site

## Project overview

Next.js 14 (App Router) author website for **Basant Pradhan** featuring an in-browser Nepali PDF book reader, dual-currency purchase flow (INR via Razorpay, GBP mock), Google OAuth, and VIP complimentary access.

## Essential commands

```bash
npm run dev      # start dev server (http://localhost:3000)
npm run build    # production build
npm run lint     # ESLint
```

## Architecture

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Styling | Tailwind CSS + custom design tokens |
| Auth | JWT (jose) in httpOnly cookie `bp_auth`, Google OAuth 2.0 |
| Database | Vercel KV in production; JSON file (`data/users.json`) locally |
| PDF rendering | PDF.js 3.11.174, self-hosted at `public/pdfjs/` |
| INR payments | Razorpay Standard Checkout |
| GBP payments | Stub (Stripe planned) |

## Key files

```
lib/
  config.ts        # prices, BOOK_ID, VIP email list — change prices here
  auth.ts          # JWT issue/verify, getUserFromRequest, getServerUser
  db.ts            # User CRUD; KV in prod, JSON file locally
  razorpay.ts      # lazy Razorpay client, HMAC-SHA256 signature verification
  toc.ts           # manual TOC — fill in real page numbers here

app/
  page.tsx                          # home page (server component)
  purchase/page.tsx                 # purchase page with currency selector
  reader/page.tsx                   # reader page (requires auth)
  api/auth/login/                   # POST email+password login
  api/auth/register/                # POST register
  api/auth/me/                      # GET current user (VIP injection here)
  api/auth/google/                  # GET → redirect to Google OAuth
  api/auth/google/callback/         # GET ← Google redirect, issues JWT
  api/auth/logout/                  # POST clear cookie
  api/book/                         # GET streams protected PDF (auth + purchase check)
  api/cover/                        # GET streams cover PDF (public)
  api/purchase/                     # POST mock/legacy grant (no payment)
  api/purchase/create-order/        # POST create Razorpay order → {orderId, keyId}
  api/purchase/verify/              # POST verify Razorpay HMAC → addPurchase
  api/webhooks/razorpay/            # POST payment.captured webhook

components/
  BookCover.tsx    # 3-D book cover; crops right half of two-up PDF spread
  PDFReader.tsx    # canvas PDF reader with TOC sidebar, preview lock
  VoiceControls.tsx
  Navbar.tsx
```

## Configuration: prices, VIP access, book ID

All in `lib/config.ts`:

```typescript
export const PRICES = {
  INR: { amount: 51,   display: '₹51'   },
  GBP: { amount: 9.99, display: '£9.99' },
};
export const BOOK_ID = 'koltey-golai';
const VIP_EMAILS_RAW = [
  'basantanickal@gmail.com',
  'basantsai26@gmail.com',
  // add more here — full access, no purchase required
];
```

## TOC page numbers

`lib/toc.ts` contains a placeholder TOC. Replace the `page:` values with the real PDF page numbers:

```typescript
export const TABLE_OF_CONTENTS: TocEntry[] = [
  { title: 'भूमिका', titleEn: 'Preface', page: 3 },
  ...
];
```

## Environment variables

Copy `.env.example` to `.env.local` for local dev:

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Signs auth cookies — generate with `openssl rand -base64 32` |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Vercel KV; leave empty to use JSON file locally |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `NEXT_PUBLIC_BASE_URL` | Public base URL (no trailing slash) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay API keys |
| `RAZORPAY_WEBHOOK_SECRET` | Matches the secret in Razorpay Dashboard → Webhooks |

## Razorpay setup checklist

1. Get test keys from razorpay.com → Settings → API Keys (`rzp_test_...`)
2. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` in `.env.local`
3. For webhooks: set `RAZORPAY_WEBHOOK_SECRET` to any long random string; configure the same in Razorpay Dashboard pointing to `https://your-domain.com/api/webhooks/razorpay`, event `payment.captured`
4. If env vars are absent the purchase page falls back to mock (grants access immediately)

## PDF assets

- Book PDF: served from `/api/book` (authenticated, purchase-gated)
- Cover PDF: served from `/api/cover` (public)
- The cover is a two-up landscape spread; `BookCover.tsx` crops the right half

## Auth flow

- Email/password: bcrypt-hashed passwords, null for OAuth users
- Google OAuth: `/api/auth/google` → Google → `/api/auth/google/callback` → JWT cookie
- VIP emails bypass purchase check at the API level (no DB write); injected in `/api/auth/me`

## DB schema

```typescript
interface User {
  id: string;
  email: string;
  password: string | null;  // null for Google OAuth users
  name: string;
  purchases: string[];      // array of bookId strings
  createdAt: string;
}
```

## PDF.js note

PDF.js is self-hosted at `public/pdfjs/` (copied from `node_modules/pdfjs-dist/build/`). Do not switch to a CDN URL — the dev proxy blocks external CDNs. If upgrading pdfjs-dist, re-copy both `pdf.min.js` and `pdf.worker.min.js`.

## Branch / PR workflow

- `main` is the default protected branch
- All changes go through a feature branch + PR
- Suggested naming: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`
