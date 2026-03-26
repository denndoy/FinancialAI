# AI Personal Finance Tracker (Receipt Scanner)

Production-oriented Next.js 14 (App Router) app: auth, manual transactions, receipt upload with **Tesseract.js OCR on the Node.js runtime** (not Edge), Azure Blob storage, PostgreSQL via Prisma with pooling-friendly config, keyword-based `classifyTransaction` (swappable for ML later), Recharts dashboard, and CSV export.

## Prerequisites

- Node.js 20+ (LTS recommended for Vercel parity)
- PostgreSQL (e.g. DigitalOcean Managed Database)
- Azure Storage account + blob container

## Environment variables

Copy `.env.example` to `.env` and set:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string. For **DigitalOcean + PgBouncer**, append `?sslmode=require&pgbouncer=true&connection_limit=1` (adjust query params per DO docs). |
| `NEXTAUTH_SECRET` | Random secret, e.g. `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Local: `http://localhost:3000` — Production: your Vercel URL |
| `AZURE_STORAGE_CONNECTION_STRING` | From Azure Portal → Storage Account → Access keys |
| `AZURE_CONTAINER_NAME` | Container name (app creates it with **public blob** read if missing) |

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure `.env` (see above).

3. Apply database schema:

   ```bash
   npx prisma migrate deploy
   ```

   Or during development: `npm run db:migrate` (interactive).

4. Run the dev server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000), register, then use **Dashboard**, **Scan receipt**, and **Add transaction**.

## Project layout (core)

- `app/` — routes: `/login`, `/register`, `/dashboard`, `/upload-receipt`, `/add-transaction`, API routes under `app/api/`
- `components/` — UI (nav, charts, transaction table, theme)
- `lib/` — `db.ts`, `azure.ts`, `ocr.ts`, `parser.ts`, `ai.ts`, `auth.ts`, `insights.ts`
- `prisma/schema.prisma` — `User`, `Transaction`

## API (all expect session cookie except register)

- `POST /api/register` — body: `{ email, password }`
- `POST /api/transactions` — create transaction
- `GET /api/transactions` — optional `?month=YYYY-MM&=q=`
- `PUT /api/transactions/:id` — update
- `DELETE /api/transactions/:id` — delete
- `GET /api/dashboard` — optional `?month=YYYY-MM`
- `POST /api/upload-receipt` — `multipart/form-data` field `file` (Node runtime, OCR + Azure)
- `GET /api/export/csv` — optional `?month=YYYY-MM`

## Production notes

- **OCR**: Implemented in `app/api/upload-receipt/route.ts` with `export const runtime = "nodejs"`. On Vercel, increase **max duration** if needed (Pro); Tesseract downloads language data on first run (cold start).
- **Images**: Client compresses with `browser-image-compression`; server recompresses with `sharp` if still over ~1 MB.
- **Prisma**: Singleton in `lib/db.ts` for serverless; use pooled `DATABASE_URL` for many concurrent lambdas.

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Set the same env vars as in `.env.example` (use production `NEXTAUTH_URL` and real DB/Azure secrets).
4. Build command: `prisma generate && next build` (already in `package.json` `build` script).
5. Run migrations against production DB from CI or locally:

   ```bash
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   ```

6. Smoke-test: register, add transaction, upload receipt (Azure + OCR).

## Stack

Next.js 14, Tailwind CSS, Prisma 5, PostgreSQL, NextAuth (credentials), Azure Blob Storage, Tesseract.js, Recharts, Sharp, Zod.
