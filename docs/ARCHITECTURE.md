# Architecture

This is the plan the app was built from: the data model, the auth flow, and the API.

## Layout

```
admin-dashboard/
├── client/                 React 19 + TypeScript + Vite + Recharts
│   └── src/
│       ├── components/     AppShell, charts, KPI tiles, filter bar, dialogs, states
│       ├── pages/          Login, Dashboard, Users, AccessDenied, NotFound
│       └── lib/            API client, auth context, URL-backed filters, formatting
├── server/                 Node + Express 5 + Prisma (SQLite)
│   ├── prisma/             schema, seed generator, demo DB builder
│   ├── src/
│   │   ├── routes/         auth, metrics, users
│   │   ├── middleware/     requireAuth, requireRole
│   │   └── lib/            session tokens, config, dates, Prisma client
│   └── test/               Vitest + Supertest
└── netlify/functions/      The Express app wrapped as one Netlify Function
```

## Data model

```
User            dashboard staff accounts
  id, email (unique), name, passwordHash (bcrypt),
  role ("ADMIN" | "VIEWER"), active, sessionVersion, lastLoginAt

Plan            Starter $19 · Pro $49 · Business $129 · Enterprise $399/seat
  id, name, priceCents, sortOrder

Customer        a sign-up to the SaaS product
  id, company, email, region, planId → Plan,
  signedUpAt, lastActiveAt, churnedAt?

Payment         a paid monthly invoice
  id, customerId → Customer, planId → Plan, amountCents, paidAt
```

`Payment.planId` is stored on each invoice so revenue by plan reflects what the customer
was on when they were billed, even after an upgrade. Indexes cover every date column the
dashboard filters on.

SQLite has no enum type, so `role` is a string validated with Zod at the API boundary.

### Metric definitions

| Metric | Definition |
|---|---|
| Sign-ups per month | Customers whose `signedUpAt` falls in each month of the range |
| Revenue by plan | Sum of `Payment.amountCents` with `paidAt` in the range, grouped by plan |
| Active users by region | Customers active at the end of the range: signed up before it, not churned by then, and seen in the 30 days before it |
| Avg. revenue per account | Revenue ÷ number of invoices (average monthly bill) |
| Trend deltas | Same figures for the preceding period of equal length; omitted when the data doesn't reach back that far |

The plan filter applies to every series.

## Auth flow

```
Browser                       API                                DB
   │ POST /api/auth/login        │                                 │
   │ {email, password} ────────▶ │ find user by email ───────────▶ │
   │                             │ bcrypt.compare (dummy hash when │
   │                             │   the email is unknown)         │
   │                             │ reject if inactive (403)        │
   │ ◀── Set-Cookie: sid=…       │ sign {uid, ver, exp} with HMAC  │
   │     HttpOnly; SameSite=Lax; │                                 │
   │     Secure (in production)  │                                 │
   │                             │                                 │
   │ GET /api/metrics/… (cookie) │ verify HMAC + expiry            │
   │ ──────────────────────────▶ │ load user; require active and   │
   │                             │ sessionVersion == token.ver ──▶ │
   │                             │ role from DB, not the cookie    │
```

- **Passwords** are hashed with bcrypt (cost 10, `bcryptjs` so there's no native build step).
- **Sessions** are stateless signed tokens in an HTTP-only cookie, valid for 7 days. Being
  stateless means they keep working across serverless instances. The cookie only proves
  identity: role and active status are read from the database on every request, so a role
  change applies on the user's next request.
- **Revocation**: deactivating a user bumps `sessionVersion`, which invalidates every cookie
  they hold.
- **Brute force**: login is rate-limited to 20 attempts per 15 minutes per IP, and wrong
  email and wrong password return the same error.
- **CSRF**: the cookie is `SameSite=Lax`, so other sites can't send it on cross-site
  POST/PATCH requests, and the API only accepts JSON bodies.

### Roles

| | Admin | Viewer |
|---|---|---|
| Dashboard and filters | ✅ | ✅ |
| User management page | ✅ | Access-denied screen |
| `GET /api/users`, `PATCH /api/users/:id` | ✅ | 403 |

Guard rails: an admin can't demote or deactivate themselves, and the last active admin
can't be removed.

## API

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | public | `{email, password}` → user and session cookie |
| POST | `/api/auth/logout` | public | Clears the cookie |
| GET | `/api/auth/me` | signed in | Current user |
| GET | `/api/metrics/meta` | signed in | Plans, regions, and the date span of the data |
| GET | `/api/metrics/dashboard?from=&to=&plan=` | signed in | KPIs plus all three chart series. `from`/`to` are inclusive `YYYY-MM-DD`; `plan` is a plan id or `all`. Defaults to the last 12 months |
| GET | `/api/users` | admin | All staff users (never includes password hashes) |
| PATCH | `/api/users/:id` | admin | `{role?, active?}` |

Errors are JSON: `{ "error": "message" }` with 400/401/403/404 as appropriate.

## Deployment on Netlify

- `npm run build` generates the Prisma client (including the `rhel-openssl-3.0.x` engine
  Lambda needs), builds and seeds `server/prisma/demo.db`, and builds the React app into
  `client/dist`.
- `netlify/functions/api.ts` wraps the Express app with `serverless-http`. `/api/*` is
  rewritten to it, and every other path falls back to `index.html` for client-side routing.
- On a cold start the function copies the seeded database to `/tmp` and uses it there. UI
  changes (roles, deactivations) persist only for that function instance, which is fine
  for a demo. For durable data, set `DATABASE_URL` to a hosted database. Prisma supports
  Turso/libSQL for SQLite, or switch the provider to Postgres.
