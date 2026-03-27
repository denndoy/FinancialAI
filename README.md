# AI Personal Finance Tracker (Receipt Scanner)

Next.js 14 (App Router) application for personal finance tracking with receipt ingestion, OCR extraction, transaction classification, and analytics dashboard. Recommended hosting is Vercel, with Azure services for storage and OCR.

## Target architecture

- Hosting: Vercel
- Database: Azure Database for PostgreSQL
- Storage: Azure Blob Storage
- OCR: Azure Computer Vision Read API
- Framework: Next.js 14 + NextAuth + Prisma

## Environment variables

Copy `.env.example` to `.env` and set:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Azure PostgreSQL connection string (`sslmode=require`). Use pooled URL params for serverless/app-service workloads. |
| `NEXTAUTH_SECRET` | Random secret, e.g. `openssl rand -base64 32` |
| `NEXTAUTH_URL` | App base URL (local: `http://localhost:3000`, production: your App Service URL or custom domain) |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Storage account connection string |
| `AZURE_CONTAINER_NAME` | Blob container for receipt images |
| `AZURE_VISION_ENDPOINT` | Azure Vision endpoint, e.g. `https://<resource-name>.cognitiveservices.azure.com` |
| `AZURE_VISION_KEY` | Azure Vision API key |

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure `.env`.

3. Apply DB schema:

   ```bash
   npm run db:deploy
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

## Receipt pipeline

Current flow:

1. Browser compresses image before upload.
2. API uploads image to Azure Blob Storage.
3. API calls Azure Vision Read API (URL mode, then binary fallback).
4. OCR text is parsed for merchant/date/amount.
5. Category is classified through modular logic in `lib/ai.ts`.
6. User can review/edit fields, then save to PostgreSQL.

If OCR fails, the API returns fallback metadata so manual entry remains available.

## API summary

- `POST /api/register`
- `POST /api/transactions`
- `GET /api/transactions?month=YYYY-MM&q=...`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `GET /api/dashboard?month=YYYY-MM`
- `POST /api/upload-receipt`
- `GET /api/export/csv?month=YYYY-MM`
- `GET /api/export/pdf?month=YYYY-MM`

## Vercel deployment guide (recommended)

1. Push code to GitHub and ensure latest Prisma migration is committed.

2. Import repository in Vercel:
   - New Project -> Import Git Repository
   - Framework preset: Next.js (auto)
   - Build command: `npm run build`
   - Install command: `npm install`

3. Set production environment variables in Vercel Project Settings:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (your production domain)
   - `AZURE_STORAGE_CONNECTION_STRING`
   - `AZURE_CONTAINER_NAME`
   - `AZURE_VISION_ENDPOINT`
   - `AZURE_VISION_KEY`
   - `ADMIN_USERNAME` (optional)

4. Run Prisma migration against production database (outside Vercel build):

   ```bash
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   ```

5. Deploy to production from Vercel dashboard or git push.

6. Verify end-to-end:
   - Register/login works
   - Upload receipt works (Blob + OCR)
   - Save transaction works
   - Dashboard + chart + search work
   - CSV/PDF export work

7. After go-live:
   - Add monitoring/alerts in Vercel and Azure
   - Rotate credentials periodically
   - Keep running `prisma migrate deploy` for each release with new migrations

## Auto migrate production DB (GitHub Actions)

To avoid manual migration runs on every schema change, this repo includes workflow:

- `.github/workflows/prisma-migrate-deploy.yml`

How to enable:

1. Open GitHub repo -> Settings -> Secrets and variables -> Actions.
2. Add secret: `PRODUCTION_DATABASE_URL` (your production PostgreSQL URL).
3. Push migration files (`prisma/migrations/**`) to `main`.
4. Workflow will run `npx prisma migrate deploy` automatically.

You can also run it manually from GitHub Actions using `workflow_dispatch`.

## Azure App Service deployment guide (alternative)

1. Create Azure resources:
   - Resource Group
   - Azure Database for PostgreSQL (Flexible Server)
   - Azure Storage Account + Blob container
   - Azure AI Vision resource
   - Azure App Service Plan + Web App (Linux, Node 20)

2. Configure PostgreSQL:
   - Create DB and user.
   - Open firewall/network rules for App Service outbound access.
   - Set `DATABASE_URL` using SSL (`sslmode=require`) and pooling params.

3. Configure App Service settings:
   - Add all env vars from `.env.example` in App Service Configuration.
   - Set `WEBSITE_NODE_DEFAULT_VERSION` to `~20` if needed.

4. Run Prisma migrations for production DB:

   ```bash
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   ```

5. Deploy from GitHub:
   - Push repository to GitHub.
   - In Azure Portal: Web App -> Deployment Center.
   - Select GitHub provider, authorize, choose repo and branch.
   - Build provider: App Service build service (Oryx).
   - Ensure build command runs `npm install` and `npm run build`.

6. Post-deploy checks:
   - Register/login flow works.
   - Upload receipt completes with OCR or manual fallback.
   - Transactions save to DB.
   - Dashboard totals and charts are accurate.
   - CSV/PDF exports download correctly.

## Production hardening checklist

- Keep secrets only in App Service configuration.
- Enable HTTPS only and configure custom domain + TLS certificate.
- Add Azure Monitor / Application Insights.
- Configure backup/retention for PostgreSQL.
- Restrict storage account networking where possible.

## Stack

Next.js 14, Tailwind CSS, Prisma 5, PostgreSQL (Azure), NextAuth, Azure Blob Storage, Azure Vision Read API, Recharts, Sharp, Zod.
