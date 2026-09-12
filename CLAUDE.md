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
  VoiceControls.tsx  # TTS readout; plays pre-recorded MP3 first, falls back to Web Speech API
  Navbar.tsx

scripts/
  generate-audio.py  # generates public/audio/page-{N}.mp3 via edge-tts (run locally)

public/
  audio/           # pre-recorded per-page Nepali MP3s (commit after generation)
  pdfjs/           # self-hosted PDF.js worker
```

## Configuration: prices, VIP access, book ID, version

All in `lib/config.ts`:

```typescript
export const PRICES = {
  INR: { amount: 51,   display: '₹51'   },
  GBP: { amount: 9.99, display: '£9.99' },
};
export const BOOK_ID = 'koltey-golai';
export const BOOK_VERSION = '1';  // bump when replacing the PDF to bust browser cache
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

## Vercel deployment

The site deploys automatically when you push to `main` (if connected to Vercel). All env vars below must be set in **Vercel Dashboard → Project → Settings → Environment Variables** for production.

### Step 1 — Core env vars (required)

| Variable | How to get it |
|---|---|
| `JWT_SECRET` | Run `openssl rand -base64 32` in your terminal |
| `NEXT_PUBLIC_BASE_URL` | Your Vercel URL, e.g. `https://your-site.vercel.app` (no trailing slash) |

### Step 2 — Vercel KV (user database)

Option A — **Vercel KV** (recommended for production):
1. In Vercel Dashboard → Storage → Create Database → KV
2. Link it to your project → the `KV_REST_API_URL` and `KV_REST_API_TOKEN` env vars are added automatically

Option B — **Local JSON file** (dev only):  
Leave KV vars empty; `data/users.json` is created automatically on first login.

### Step 3 — Razorpay (INR payments)

**Get API keys:**
1. Log in at [razorpay.com](https://razorpay.com) → Settings → API Keys
2. Generate a key pair — use **Test Mode** keys (`rzp_test_...`) until you're ready to go live
3. Set in Vercel and in `.env.local`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_key_secret
   ```

**Set up the webhook (required for reliable payment confirmation):**
1. Generate a webhook secret: `openssl rand -base64 32`
2. Set it as `RAZORPAY_WEBHOOK_SECRET` in Vercel and in `.env.local`
3. In Razorpay Dashboard → Settings → Webhooks → Add New Webhook:
   - **URL**: `https://your-site.vercel.app/api/webhooks/razorpay`
   - **Secret**: same value as `RAZORPAY_WEBHOOK_SECRET`
   - **Events**: tick `payment.captured` only
4. Click Save

**How payments work end-to-end:**
1. `/api/purchase/create-order` — creates a Razorpay order server-side (tamper-proof amount)
2. Razorpay Checkout — user pays in their browser
3. `/api/purchase/verify` — verifies HMAC-SHA256 signature (cryptographic proof of payment)
4. `/api/webhooks/razorpay` — backup confirmation via `payment.captured` webhook

> If `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are not set, the purchase page falls back to **mock mode** (grants access immediately without payment — for testing only).

**Switch to live mode:**
1. In Razorpay Dashboard → switch to Live Mode → generate Live keys
2. Replace `rzp_test_...` keys with `rzp_live_...` in Vercel env vars
3. Update the webhook URL if your domain changed
4. Re-deploy

### Step 4 — Google OAuth (optional)

1. [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth 2.0 Client ID
2. Application type: **Web application**
3. Authorised redirect URI: `https://your-site.vercel.app/api/auth/google/callback`
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel

### Step 5 — PDF assets

Place your PDF files at these paths and commit them (they are **not** gitignored):

```
private/
  book.pdf    # the full book — served only to authenticated, paying users
  cover.pdf   # two-up landscape spread — public, used for the 3-D cover
```

`next.config.js` uses `outputFileTracingIncludes` to bundle these into the serverless functions on Vercel.

## PDF assets

- Book PDF: served from `/api/book?v={BOOK_VERSION}` (authenticated, purchase-gated)
- Cover PDF: served from `/api/cover` (public)
- The cover is a two-up landscape spread; `BookCover.tsx` crops the right half
- PDF is cached `private, max-age=31536000, immutable` in the browser (1 year); bump `BOOK_VERSION` in `lib/config.ts` to invalidate

## Voice / audio readout

`VoiceControls` reads the current page aloud in two modes, tried in order:

1. **Pre-recorded MP3** — if `public/audio/page-{N}.mp3` exists (detected via HEAD request), it plays via HTML5 Audio. Voice/rate controls are hidden; a "★ Recorded" badge shows instead.
2. **Web Speech API fallback** — if no MP3 is available, browser TTS is used with `lang=ne-NP` and a Chrome keep-alive fix (pause+resume every 14 s to work around Chrome's 15-second TTS cutout bug). Only Devanagari-capable voices are offered.

### Generating pre-recorded audio

Run **locally** (the production container blocks `speech.platform.bing.com`):

```bash
pip install edge-tts
python scripts/generate-audio.py                        # female voice (HemkalaNeural), all pages
python scripts/generate-audio.py --voice male           # SagarNeural
python scripts/generate-audio.py --pages 7,13,15        # specific pages
python scripts/generate-audio.py --rate -10%            # slower speech
python scripts/generate-audio.py --overwrite            # regenerate existing files
```

Output: `public/audio/page-{N}.mp3` (~40–80 KB each, ~8–12 MB total).
Commit `public/audio/` and deploy — Vercel serves the files as static assets.

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
