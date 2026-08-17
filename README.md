# Steps Leaderboard

A tiny web app where a group of friends log their **daily step counts** and compete
on leaderboards (day / week / month / all-time), with streaks and a personal daily
goal.

Monorepo:

```
backend/   FastAPI + SQLModel + psycopg (v3), managed with uv, on Supabase Postgres
frontend/  Next.js (App Router) + TypeScript + Tailwind CSS
```

## The one architectural idea

A browser **cannot** read Apple Health (HealthKit) or Android Health Connect — those
are on-device stores with no web API. So step data never comes from the frontend's
device APIs. Instead the backend exposes a single authenticated endpoint:

> **`POST /steps`** is the stable contract. Step counts enter through interchangeable
> clients that all call it: (1) the manual web form, (2) an Apple Shortcut, (3) later,
> a native app.

Design everything around that endpoint.

---

## API

| Method | Path                              | Auth              | Purpose                                            |
| ------ | --------------------------------- | ----------------- | -------------------------------------------------- |
| GET    | `/`                               | public            | Health check → `{ "ok": true }`                    |
| POST   | `/steps`                          | `Bearer <token>`  | Upsert `{ date, steps, source? }` for one day      |
| GET    | `/me?days=30`                     | `Bearer <token>`  | Caller's recent entries (default 30 days)          |
| GET    | `/leaderboard?period=day\|week\|month\|all` | public  | Ranked `[{ rank, name, steps }]`                   |
| POST   | `/users`                          | `X-Admin-Key`     | Create a friend, returns their fresh `token`       |

**Behaviors baked in:**

- **Upsert** on `(user_id, date)` — an hourly Shortcut overwrites, never duplicates.
- **Validation** — `date` must be a real `YYYY-MM-DD` day; `steps` in `0..200000`
  (basic anti-cheat sanity cap). Bad payloads → `422`.
- **Timezone** — "today"/"this week"/"this month" are computed in `TIMEZONE`
  (e.g. `Asia/Kolkata`). Week starts Monday. Steps belong to a local calendar day.
- **Connection string normalization** — paste the Supabase URL verbatim; the app
  rewrites `postgresql://` / `postgres://` to `postgresql+psycopg://` at runtime.
- **Postgres only** — `DATABASE_URL` is required; startup fails fast with a clear
  error if it's missing. No SQLite fallback.
- **Tables** — created on startup via SQLModel `create_all`. _Later upgrade:_ swap in
  **Alembic** migrations once the schema starts evolving.

---

## Local development

### Prerequisites

- [uv](https://docs.astral.sh/uv/) (Python packaging — installs its own Python)
- Node.js 18.18+ (or 20+/22)
- A Supabase project + its connection string (see Deploy step 1)

### Backend

```bash
cd backend
cp .env.example .env          # then edit DATABASE_URL, ADMIN_KEY, TIMEZONE
uv sync --frozen              # creates .venv from the committed uv.lock
uv run uvicorn app.main:app --reload
# → http://localhost:8000  (health: curl localhost:8000/)
```

> **Password gotcha:** if your DB password contains URL-special characters
> (`@ : / ? # &`), percent-encode them in `DATABASE_URL`. `@` → `%40`, `:` → `%3A`.
> e.g. a password `Gabbar@14` becomes `...:Gabbar%4014@db.<ref>.supabase.co...`.

Smoke-test everything (creates a throwaway user, exercises upsert + validation):

```bash
cd backend
BASE_URL=http://localhost:8000 ADMIN_KEY=your-admin-key ./test_api.sh
```

### Frontend

```bash
cd frontend
cp .env.example .env.local    # set NEXT_PUBLIC_API_URL=https://step-tracker-101.onrender.com
npm install
npm run dev                   # → http://localhost:3000
```

On first use the app asks for your **token** (from `POST /users`); it's stored in
`localStorage` and sent as the bearer token. No login system — deliberately simple
for a friend group. _Later upgrade:_ Supabase Auth.

---

## Deploy

### 1. Supabase (database)

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → Database → Connection string → Session pooler.** Copy that
   string into `DATABASE_URL`. (The Session pooler is IPv4-friendly and the right
   choice for Render; the "Direct connection" `db.<ref>.supabase.co` host is often
   IPv6-only and may not reach from every host.)
3. Percent-encode special characters in the password (see the gotcha above).
4. **Free-tier caveat:** projects **pause after 7 days of inactivity** and take
   ~30 s to wake. Use the heartbeat below to keep it alive.

The app creates its tables (`users`, `step_entries`) automatically on first startup.

### 2. Render (backend)

New **Web Service** from this repo:

- **Root directory:** `backend`
- **Build command:** `pip install uv && uv sync --frozen`
- **Start command:** `uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Environment variables:** `DATABASE_URL`, `FRONTEND_ORIGIN` (your Vercel URL,
  comma-separated with `http://localhost:3000` if you like), `ADMIN_KEY`, `TIMEZONE`.

> Free Render web services **spin down after ~15 min idle** (cold start on next hit).
> The heartbeat below also keeps this warm.

_Alternative — Docker:_ base an image on `ghcr.io/astral-sh/uv:python3.12-bookworm-slim`,
`COPY` the project, `RUN uv sync --frozen`, and use the same start command. Railway
works too with the same build/start commands.

### 3. Vercel (frontend)

1. Import this repo, set **Root Directory** to `frontend`.
2. Set env var **`NEXT_PUBLIC_API_URL`** to your Render URL (e.g.
   `https://steps-backend.onrender.com`).
3. Deploy. Add the Vercel domain to the backend's `FRONTEND_ORIGIN` so CORS allows it.

### 4. Seed friends

Create one user per friend and hand out each token (shown once):

```bash
curl -X POST https://steps-backend.onrender.com/users \
  -H "X-Admin-Key: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Manish"}'
# → {"id":1,"name":"Manish","token":"3Qн...","created_at":"..."}
```

### Heartbeat (keep Supabase awake + Render warm)

A GitHub Actions cron in [`.github/workflows/heartbeat.yml`](.github/workflows/heartbeat.yml)
hits `GET /` once a day. Set a repo secret **`BACKEND_URL`** to your Render URL. (A
Render Cron Job hitting the same URL works equally well.)

---

## Ingestion clients

### Manual web form

The **Submit** tab in the frontend. That's it.

### Apple Shortcut (iOS) — the good one

Don't build an app. Build this Shortcut once, then wrap it in a daily automation.

1. **Find Health Samples** → Steps, where Date is Today.
2. **Calculate Statistics** → Sum, of Health Sample Values from step 1.
3. **Format Date** → the current date, format `yyyy-MM-dd`.
4. **Get Contents of URL**:
   - **URL:** `https://steps-backend.onrender.com/steps`
   - **Method:** `POST`
   - **Headers:** `Authorization` = `Bearer YOUR_TOKEN`
   - **Request Body:** JSON:
     ```json
     { "date": "FORMATTED_DATE", "steps": SUM, "source": "shortcut" }
     ```
     (Insert the step-3 date into `date` and the step-2 sum into `steps`.)

Then **Automation → Create Personal Automation → Time of Day** (e.g. 11:30 PM daily),
run this Shortcut, **Run Immediately** / turn off "Ask Before Running". Because
`POST /steps` upserts, running it hourly is safe too — the day's row just updates.

### Android

Install **HTTP Request Shortcuts** (or **Tasker** with a Health Connect read step) and
schedule a daily `POST` of the same JSON payload to `/steps` with the same
`Authorization` header, using `"source": "android"`. The manual web form is always the
fallback.

---

## Roadmap (intentionally not built yet)

Hooks are left in the code (see `frontend/lib/roadmap.ts`):

- Teams / head-to-head.
- Reactions / trash-talk feed.
- Daily recap notifications.
- **Normalized scoring** — rank by % of personal goal so casual walkers can compete
  with power-walkers.

Plus the two backend upgrades noted above: **Alembic** migrations and **Supabase Auth**.
