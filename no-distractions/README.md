# NoDistractions prototype

An intentionally small group-chat prototype based on the supplied architecture.

## What is implemented

- Username/password registration with salted PBKDF2 password hashes and bearer-token sessions.
- Authenticated group creation with a unique, name-derived slug and creator membership.
- A prototype group-entry requirement: one invite code (`entry_details_config.invite_code`). A successful entry creates membership.
- Authorized, cursor-paginated chat history (50 newest on the first page, 100 older messages thereafter).
- Authorized message sending.
- A plain TypeScript single-page client for registering, creating/entering groups, and chatting.
- Neon Lakebase Postgres persistence, with a versioned SQL migration and a pooled runtime connection.

Google login, account TOTP, real-time updates, subdomain routing, and configurable entry-detail types remain intentionally out of scope because the supplied specification marks them TBD.

## Run it

First link a Neon project and pull its connection strings after authenticating with the Neon CLI:

```powershell
npx neon@latest auth
npx neon@latest link
npx neon@latest env pull --file .env.local
```

Apply the migration with Neon's **direct** connection string, then start the API with its **pooled** connection string:

```powershell
go run ./cmd/migrate
go run ./cmd/server
```

In another terminal:

```powershell
go run ./cmd/server
```

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`). The development server proxies `/api` to the Go server on port 8080. `.env.local` is ignored by Git; see [.env.example](.env.example) for the expected variables.

`DATABASE_URL` must be Neon's pooled URL (the hostname includes `-pooler`) for the running API. `DATABASE_URL_UNPOOLED` must be the direct URL used only by `cmd/migrate`.

## API

All API routes are prefixed with `/api` and use JSON. Protected routes require `Authorization: Bearer <token>`.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/register` | Create an account and return a session token |
| POST | `/api/create-group` | Create a group with an invite code |
| POST | `/api/get-group` | Verify an invite code and join/return a group |
| POST | `/api/get-chats` | Return a cursor page of authorized messages |
| POST | `/api/send-chats` | Send an authorized group message |

Run the API checks with Bruno after starting the server:

```powershell
cd bruno
npx @usebruno/cli run . --env local
```

The collection generates unique usernames and group names, so it can be run repeatedly against the in-memory server.
