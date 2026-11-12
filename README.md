# Keystone CRM

**Status: Functional MVP, ready to run locally.**

Keystone CRM is a focused workspace for real-estate agents to manage incoming leads, keep property context close to the conversation, and prepare AI-assisted replies without giving up final approval.

## Demo

https://github.com/user-attachments/assets/d02d1025-e29e-42c6-8e99-9ca9748a90f0

## What’s included

- Lead pipeline with search, status filtering, referral capture, verification, and deletion workflows
- Property inventory with address, price, status, and listing context
- Conversation timeline across SMS and email
- Lead workspace with private notes and full contact/property context
- AI draft generation for the latest inbound message, with agent review before send
- Gmail OAuth and watch/webhook ingestion infrastructure
- Outlook integration foundations
- SMS and email delivery integrations
- Dashboard metrics, activity feed, and lead-status reporting

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL, Drizzle ORM, Neon-compatible connection |
| AI | OpenAI API |
| Integrations | Gmail, Outlook, Telnyx SMS |

## Run locally

### Prerequisites

- Node.js 22 (the container runtime)
- A Neon database or a database compatible with the Neon serverless HTTP driver
- An OpenAI API key for live AI drafts

### 1. Configure the backend

```bash
cd backend
copy .env.example .env
npm ci
```

Update `backend/.env` with at least `DATABASE_URL`, `JWT_SECRET`, and `PASSWORD_RESET_SECRET`. Set `OPENAI_API_KEY` for live AI replies and add provider credentials for the integrations you intend to test. Existing environment variables take precedence over values in `.env`.

### 2. Start the API

```bash
cd backend
npm run dev
```

The API runs at `http://localhost:8080` by default.

### 3. Start the frontend

In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

## Verify the project

```bash
cd frontend
npm run build
npm run lint
npm test --prefix ../backend
```

The default backend test suite runs deterministic lead-scoring tests. Run environment-backed provider, database, and webhook checks only when the required test data and credentials are configured:

```bash
npm run test:integration --prefix backend
```

## How the AI reply workflow works

1. A lead message enters through a connected inbox or SMS webhook.
2. Keystone stores the conversation with the lead, property, and private-note context.
3. From the lead workspace, select **Generate reply**.
4. The API builds a channel-aware draft from the latest inbound message and relevant context.
5. The agent reviews, edits, or dismisses the draft; nothing is sent automatically from this screen.

## Planned enhancements

- Lead assignment, team permissions, and shared inboxes
- Calendar availability and one-click showing scheduling
- Follow-up sequences with quiet hours and approval rules
- More robust Outlook ingestion and delivery coverage
- Lead-score explanations and configurable scoring rules
- Reporting for response time, conversion, source quality, and pipeline health
- File attachments, property media, and richer listing imports
- Expanded test coverage for provider integrations and end-to-end authenticated flows

## Project structure

```text
frontend/   React application and CRM workspace
backend/    Express API, integrations, AI helpers, and database routes
```

## Deploy to Google Cloud Run

The root Dockerfile builds a single image containing the React app and Express API. The frontend uses the same origin as the API, and Cloud Run supplies `PORT`. `/healthz` reports that the process is running; it does not check the database or external providers.

### Prerequisites

- A Google Cloud project with billing, Cloud Build, Artifact Registry, Cloud Run and Secret Manager enabled, plus a Docker-format Artifact Registry repository.
- A Neon database or another database compatible with the Neon serverless HTTP driver. A generic PostgreSQL or Cloud SQL connection is not sufficient for the current driver without changing the database adapter.
- A database with the schema in `backend/db/schema.js` already provisioned. The existing SQL files in `backend/db/migrations` do not provide a complete initial application migration; do not apply them to an empty database expecting a full schema. Establish and review a baseline migration and backup strategy before using production data.
- Apply `backend/db/migrations/0003_access_requests.sql` and then `0004_access_request_lead_volume.sql` before accepting access requests. Submissions and the selected weekly lead range are stored in the `access_requests` table. Existing exact counts are preserved.
- Apply `backend/db/migrations/0005_authorized_signup_and_zapier.sql` before deploying this version. Approve an email before signup with `INSERT INTO authorized_signup_emails (email) VALUES (lower(trim('agent@example.com'))) ON CONFLICT DO NOTHING;`. Access requests do not automatically grant approval. Existing accounts can still sign in.
- Secret Manager secrets named `keystone-database-url`, `keystone-jwt-secret`, and `keystone-password-reset-secret`. Use independent, long random secrets. Grant the Cloud Run service identity Secret Manager Secret Accessor on them. Do not put secrets in the image or source tree.

### Build and deploy

From the repository root in PowerShell, replace these values with your project, region, and existing repository:

```powershell
$ProjectId = 'YOUR_PROJECT_ID'
$Region = 'us-central1'
$Repository = 'YOUR_DOCKER_REPOSITORY'
$Service = 'keystone-crm'
$Image = "${Region}-docker.pkg.dev/${ProjectId}/${Repository}/${Service}:v1"

gcloud builds submit --project $ProjectId --tag $Image .
gcloud run deploy $Service --project $ProjectId --region $Region --image $Image --allow-unauthenticated --set-env-vars 'JWT_EXPIRATION=7d,TEMP_TOKEN_EXPIRATION=15m' --set-secrets 'DATABASE_URL=keystone-database-url:latest,JWT_SECRET=keystone-jwt-secret:latest,PASSWORD_RESET_SECRET=keystone-password-reset-secret:latest'
```

Cloud Run prints the service URL. Set the application URLs to that exact HTTPS origin and deploy a new revision:

```powershell
$Url = 'https://YOUR-CLOUD-RUN-URL'
gcloud run services update $Service --project $ProjectId --region $Region --update-env-vars "FRONTEND_URL=$Url,APP_BASE_URL=$Url,BASE_URL=$Url"
```

`--allow-unauthenticated` exposes the service publicly, including signup and webhooks. Restrict Cloud Run access for a private preview instead. Check `https://YOUR-CLOUD-RUN-URL/healthz`, then test signup, login, and a page refresh on a nested route. Configure DNS and TLS separately if using a custom domain, and update the URLs when the origin changes.

### Optional integrations

For Zapier, set `ZAPIER_LEAD_OWNER_EMAIL` to the existing Keystone account that will own imports. Store a separate random key of at least 32 characters for each source in `ZAPIER_ZILLOW_WEBHOOK_KEY` and `ZAPIER_STREETEASY_WEBHOOK_KEY`. These keys authenticate the POST into Keystone. Connect the source account in Zapier.

1. Zillow uses [Zillow Tech Connect](https://zapier.com/apps/zillow/integrations) as the trigger. StreetEasy uses its [Lead CC Email setup](https://support.streeteasy.com/hc/en-us/articles/33704177154708-CRM-Email-Parsing-Integration) with [Email Parser by Zapier](https://zapier.com/apps/email-parser/integrations/webhook). Configure forwarding for the expected StreetEasy lead email and map the parsed contact and listing details.
2. Set the Webhooks by Zapier action to POST JSON to `https://YOUR-SERVICE/webhook/zapier/zillow` or `https://YOUR-SERVICE/webhook/zapier/streeteasy`. Set `X-Keystone-Key` to the key for that route.
3. Map `deliveryId` to a stable source event or message ID as a string. Map `email` or an E.164 `phone` such as `+12125550123`. Optional fields are `name`, `address` (street line), and `message`.
4. Test the Zap with a test lead. Keystone returns 201 for a new import or 200 for a repeated delivery ID. The lead is marked unverified with AI sending disabled. A matching street address attaches the lead to an existing property in the same account.

The service can start without provider credentials, but the associated features will not work until configured. Add credentials with Secret Manager and non-secret values as Cloud Run environment variables; do not commit them. Use `--update-secrets` and `--update-env-vars` to avoid replacing the existing configuration.

- AI drafts and the interactive demo: `OPENAI_API_KEY`. The public demo sends the sample buyer message and fictional listing notes to OpenAI. It uses a per-instance request cap and never delivers a real email or books a real appointment.
- Google sign-in/Gmail: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_SCOPES`, `GOOGLE_REDIRECT_URI` (the service URL followed by `/auth/google/callback`), and, for Gmail watch, `GMAIL_TOPIC`. Configure the matching OAuth consent screen and redirect URI in Google Cloud. Gmail push additionally uses `PUB_SUB_AUDIENCE` and `GOOGLE_PUB_SUB_AUTH_SERVICE_ACCOUNT`; scheduler endpoints use `SCHEDULER_URL` and `SCHEDULER_AUTH_SERVICE_ACCOUNT`. Configure the corresponding authenticated Pub/Sub and scheduler resources before enabling them.
- SMS: outbound delivery uses `TELNYX_API_KEY` and `TELNYX_PHONE_NUMBER`; the inbound `/webhook/sms` handler validates Twilio signatures using `TWILIO_AUTH_TOKEN` and `BASE_URL`. These are different providers, so configure and test the intended inbound and outbound paths explicitly. The inbound handler can automatically send AI replies when enabled.
- Password reset email uses `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_EMAIL` with the configured email service.
- Outlook sign-in is currently disabled in the server; do not advertise it as available.

Before serving real customers, validate authenticated flows, provider callbacks and message delivery with test accounts; review automatic outreach, tenant isolation, rate limits, monitoring, backups, and the baseline database migration. The image configuration alone does not establish production readiness.
