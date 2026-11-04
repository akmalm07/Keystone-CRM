# Keystone CRM

**Status: feature-complete MVP**

Keystone CRM is a focused workspace for real-estate agents to manage incoming leads, keep property context close to the conversation, and prepare AI-assisted replies without giving up final approval.

## Demo

<video src="output/playwright/keystone-ai-reply-demo.webm" controls muted playsinline width="100%"></video>

[Download or play the lead-to-AI-reply walkthrough](output/playwright/keystone-ai-reply-demo.webm)

The demo follows an incoming Zillow lead from the lead queue into their workspace. It generates a context-aware reply, flags booking intent, and leaves the draft editable before any message is sent. The recording uses representative local data; it does not contact live leads or providers.

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

- Node.js 20+
- A PostgreSQL-compatible database
- An OpenAI API key for live AI drafts

### 1. Configure the backend

```bash
cd backend
copy .env.example .env
npm ci
```

Update `backend/.env` with at least `DATABASE_URL`, `JWT_SECRET`, and `PASSWORD_RESET_SECRET`. Add provider credentials only for the integrations you intend to test.

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
output/     Recorded product walkthroughs
```

## Notes

Keystone is complete as an MVP. Production deployment still requires normal operational setup: a managed database, secure environment variables, verified OAuth/webhook domains, and provider credentials.
