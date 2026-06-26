# Running CreatorLink locally (VS Code)

A step-by-step guide to run the app on your machine and test it end to end.

## What you need
- **Node 20+** and **pnpm 9** (the repo pins `pnpm@9.0.0`).
- **PostgreSQL** — easiest via Docker. (Or any local Postgres.)
- VS Code (recommended extensions: *Prisma*, *ESLint*, *Tailwind CSS IntelliSense*).

> **Already set up for you:** local env files (`apps/api/.env`, `packages/db/.env`, `apps/web/.env.local`), an API `dev` script, dotenv loading, and a **dev magic-link log** (so you can sign in without a real email provider). The env files use a Docker Postgres at `localhost:5432` and a dev JWT secret.

---

## 1. Open the project
In VS Code: **File → Open Folder →** the `influencers` repo root (the folder with `turbo.json`).

## 2. Enable pnpm + install
In the VS Code integrated terminal (``Ctrl+` ``):
```bash
corepack enable            # makes pnpm available (ships with Node)
pnpm install               # installs all workspaces
```

## 3. Start PostgreSQL
With Docker (matches the env files exactly):
```bash
docker run --name creatorlink-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=creatorlink -p 5432:5432 -d postgres:16
```
*(Already have Postgres? Just make sure `apps/api/.env` and `packages/db/.env` `DATABASE_URL` point at it.)*

## 4. Create the schema + seed data
```bash
pnpm --filter @repo/db db:generate          # generate the Prisma client
pnpm --filter @repo/db db:migrate:deploy    # apply migrations 0001→0005 (incl. indexes)
pnpm --filter @repo/db exec prisma db seed  # seed admin, creators, a brand org
```

Seeded accounts (all log in by magic link):

| Email | Role |
|-------|------|
| `admin@creatorlink.app` | Admin |
| `maria@example.com` · `tomas@example.com` · `luana@example.com` | Creators (published) |
| `brand@example.com` | Owner of org "Cosmética Natural SA" (can search) |

## 5. Run the apps
Two terminals (clearest — the API log shows the magic link):

```bash
# Terminal 1 — API on :3001
pnpm --filter api dev

# Terminal 2 — Web on :3000
pnpm --filter @repo/web dev
```
*(Or run both at once with `pnpm dev` — turbo opens a split TUI; switch panes to see the API log.)*

Open **http://localhost:3000**.

## 6. Log in (local magic link)
1. Click **Iniciá sesión**, enter an email (e.g. `brand@example.com`), submit.
2. Look at the **API terminal** for a line like:
   ```
   [DEV MAGIC LINK] brand@example.com -> http://localhost:3000/auth/verify?token=abc123...
   ```
3. Paste that URL into the browser → you're signed in and routed by role.

> The link is valid for 15 minutes and single-use. Request a new one anytime.

---

## 7. Test the core loop (the "heartbeat")
1. Sign in as **`brand@example.com`** → you land on the dashboard with **Buscar creadores** + **Buscar con IA**.
2. **Search:** open `/search`, filter by nicho/país/seguidores → open a creator card → **Contactar** → write a message + brief → send.
3. Sign in as that creator (e.g. **`maria@example.com`**) → the **🔔 bell** shows an unread count → **Propuestas recibidas** → **Aceptar**.

### Feature spot-checks
- **Media kit:** as a creator, `/dashboard/profile` → add work samples + pitch → open `/c/mariag` → **Compartir** (copy/QR). Paste the link in WhatsApp to see the rich preview unfurl.
- **AI match:** as the brand, `/match` → type a brief (e.g. *"creadores de belleza en México, 50k-200k, buen engagement"*) → review criteria → **Buscar creadores**. *(Rationales need an LLM key — see below; without one it still ranks deterministically.)*
- **Audience:** as a creator, in `/dashboard/profile` expand **Audiencia** under an account → declare top countries/age/gender. As the brand, filter search/match by **"Audiencia en…"**.
- **Admin:** sign in as `admin@creatorlink.app` → `/admin` → seed creators, verify accounts + audiencia, suspend users.

---

## Optional: enable the AI rationales
Edit `apps/api/.env`, uncomment and set:
```
LLM_API_KEY=sk-...
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```
(Any OpenAI-compatible endpoint works.) Restart the API. Without a key, AI match runs in heuristic mode — no rationale text, ranking still works.

---

## Handy commands
```bash
pnpm --filter @repo/db db:studio   # Prisma Studio — browse/edit the DB
pnpm --filter api test             # API unit tests
pnpm build                         # production build of everything (good pre-flight check)
pnpm lint                          # lint all workspaces
```

## Troubleshooting
- **"Can't reach database"** → is the Docker container up? `docker ps`. Restart: `docker start creatorlink-db`.
- **API won't start / JWT error** → confirm `apps/api/.env` exists and has `JWT_SECRET`.
- **No magic link in the log** → make sure you're looking at the **API** terminal and `NODE_ENV=development` (it's set in `apps/api/.env`).
- **Login works but data calls 401** → the API must be on `:3001` and `apps/web/.env.local` `API_URL=http://localhost:3001`.
- **Migration drift / want a clean slate** → `docker rm -f creatorlink-db` then redo steps 3–4.
- **Port already in use** → change `PORT` in `apps/api/.env` (and `API_URL` in `apps/web/.env.local`) or free the port.
