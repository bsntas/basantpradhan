# कोल्टे गोलाई — Koltey Golai

Official author website for **Basant Pradhan**, featuring an in-browser reader for the debut Nepali novel *कोल्टे गोलाई (Koltey Golai)*.

---

## Features

- **In-browser PDF reader** — canvas-rendered with page-by-page navigation and a configurable table of contents sidebar
- **Voice narration** — text-to-speech with speed and voice controls
- **Purchase flow** — INR via Razorpay (UPI, cards, net banking); GBP support coming
- **Preview mode** — first 10 pages free for registered users; full access after purchase
- **Google SSO** — sign in with Google or email + password
- **VIP access** — specific emails get complimentary full access automatically
- **Bilingual UI** — Nepali (Devanagari) and English throughout

## Tech stack

- [Next.js 14](https://nextjs.org/) App Router, TypeScript, Tailwind CSS
- [PDF.js](https://mozilla.github.io/pdf.js/) (self-hosted) for PDF rendering
- [Razorpay](https://razorpay.com/) for INR payments
- [Vercel KV](https://vercel.com/docs/storage/vercel-kv) for the user database (JSON file fallback locally)
- [jose](https://github.com/panva/jose) for JWT auth

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local — at minimum set JWT_SECRET

# 3. Run the dev server
npm run dev
# → http://localhost:3000
```

Without Razorpay keys, the INR purchase flow falls back to a mock that grants access immediately — useful for local development.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | Long random string for signing auth cookies |
| `GOOGLE_CLIENT_ID` | For Google SSO | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | For Google SSO | From Google Cloud Console |
| `NEXT_PUBLIC_BASE_URL` | For Google SSO | e.g. `http://localhost:3000` locally |
| `RAZORPAY_KEY_ID` | For live payments | From Razorpay Dashboard |
| `RAZORPAY_KEY_SECRET` | For live payments | From Razorpay Dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | For webhook | Self-chosen; configure the same in Razorpay Dashboard |
| `KV_REST_API_URL` | Production | Auto-added by Vercel when a KV store is linked |
| `KV_REST_API_TOKEN` | Production | Auto-added by Vercel when a KV store is linked |

## Deployment (Vercel)

1. Push to GitHub; import the repo in [Vercel](https://vercel.com)
2. Add the environment variables above in Vercel → Settings → Environment Variables
3. Link a Vercel KV store: `vercel link && vercel env pull`
4. In Google Cloud Console, add your Vercel domain to **Authorised redirect URIs**: `https://your-domain.vercel.app/api/auth/google/callback`
5. In Razorpay Dashboard, add a webhook pointing to `https://your-domain.vercel.app/api/webhooks/razorpay`, event `payment.captured`

## Customisation

| What | Where |
|---|---|
| Prices (INR / GBP) | `lib/config.ts` → `PRICES` |
| VIP / complimentary emails | `lib/config.ts` → `VIP_EMAILS_RAW` |
| Book ID | `lib/config.ts` → `BOOK_ID` |
| Chapter page numbers | `lib/toc.ts` → `TABLE_OF_CONTENTS` |
| Preview page limit | `components/PDFReader.tsx` → `previewLimit` prop (default 10) |

## Project structure

```
app/                    # Next.js App Router pages and API routes
  api/
    auth/               # login, register, logout, me, Google OAuth
    book/               # protected PDF stream
    cover/              # public cover PDF stream
    purchase/           # order creation, payment verification
    webhooks/razorpay/  # Razorpay webhook handler
components/             # React components (BookCover, PDFReader, VoiceControls, Navbar)
lib/                    # Shared utilities (auth, db, config, razorpay, toc)
public/
  pdfjs/                # Self-hosted PDF.js (pdf.min.js + pdf.worker.min.js)
```

---

© Basant Pradhan. All rights reserved. Unauthorised reproduction is prohibited.
