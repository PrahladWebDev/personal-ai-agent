# Personal AI Knowledge Agent

A production-ready AI agent that knows and answers questions about **one developer** —
their skills, experience, projects, education, achievements, and GitHub activity.
It is not a portfolio website. The product is the chat agent; the admin dashboard
is where you manage the knowledge it draws from.

## 1. Architecture

```
USER → Chat UI (Next.js) → Node/Express API → RAG retrieval
                                                    │
                                    PostgreSQL + pgvector (source of truth)
                                                    │
                                              Relevant context
                                                    │
                                            Groq API (Qwen / GPT-OSS)
                                                    │
                                              Final answer + sources
```

- **PostgreSQL is the source of truth.** The LLM never invents facts — it only
  rephrases what retrieval hands it, and refuses when nothing relevant is found.
- **Embeddings run locally** (`@xenova/transformers`, `all-MiniLM-L6-v2`, 384-dim)
  on the VPS CPU — no external embedding API, no per-embedding cost.
- **Groq** handles chat generation only, via an `AIProvider` abstraction
  (`backend/src/ai/AIProvider.ts`) so another provider (OpenAI, Gemini, Ollama)
  can be swapped in later without touching the RAG pipeline or controllers.
- **Visibility is enforced server-side, always.** Every piece of knowledge
  (skills, experience, projects, documents, GitHub repos) has a `public` or
  `private` flag. The public chat endpoint only ever retrieves `public` rows —
  this is not a client-supplied parameter, it's hardcoded in `rag/retrieval.ts`.

## 2. Tech Stack

| Layer      | Choice |
|------------|--------|
| Frontend   | Next.js 14, TypeScript, Tailwind CSS |
| Backend    | Node.js, TypeScript, Express |
| Database   | PostgreSQL + pgvector |
| AI (chat)  | Groq API (model configurable via `GROQ_MODEL`) |
| Embeddings | Local, via transformers.js |
| Deployment | Docker Compose + Nginx + Let's Encrypt |

## 3. Project Structure

```
personal-ai-agent/
├── frontend/            Next.js chat UI + admin dashboard
├── backend/             Express API, RAG pipeline, AI provider
├── database/
│   ├── migrations/      Numbered, idempotent .sql files
│   └── seed/            Placeholder seed data
├── nginx/                nginx.conf (reverse proxy + SSE + TLS)
├── scripts/backup-db.sh
├── docker-compose.yml
└── .env.example
```

## 4. Prerequisite

- Docker + Docker Compose v2 (`docker compose`, not `docker-compose`)
- A domain pointed at your VPS (A record)
- A [Groq API key](https://console.groq.com)
- (Optional) a GitHub personal access token, for higher API rate limits when syncing repos
- A VPS with at least 4GB RAM (this stack is tuned for that; see memory limits in `docker-compose.yml`)

## 5. Local Development

```bash
cp .env.example .env
# Edit .env: set JWT_SECRET, GROQ_API_KEY, and Postgres credentials at minimum.

# Start Postgres only, for local dev against it:
docker compose up -d postgres

cd backend
npm install
npm run migrate          # applies database/migrations in order (idempotent)
npm run create-admin -- you@example.com "SomeStrongPassword123!"
npm run dev               # http://localhost:4000

# in a second terminal
cd frontend
npm install
npm run dev               # http://localhost:3000
```

Set `NEXT_PUBLIC_API_URL=http://localhost:4000/api` in `frontend/.env.local` for
local dev (in production this is `/api`, proxied by nginx).

## 6. Environment Variables

See `.env.example` for the full list. The important ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Long random string signing admin session cookies |
| `GROQ_API_KEY` / `GROQ_MODEL` | Chat generation. Use a currently-supported model — check https://console.groq.com/docs/models rather than hardcoding one that may be deprecated. |
| `EMBEDDING_MODEL` | Local embedding model (default: `Xenova/all-MiniLM-L6-v2`) |
| `GITHUB_TOKEN` | Optional, raises GitHub API rate limits during sync |
| `CHAT_RATE_LIMIT_PER_MIN` | Public chat rate limiting |
| `MAX_UPLOAD_MB` | Document upload size cap |

Never commit `.env` — it's already in `.gitignore`.

## 7. Database Setup / pgvector

The `postgres` service in `docker-compose.yml` uses the `ankane/pgvector` image,
which ships PostgreSQL with the `vector` extension pre-installed. Migrations
(`database/migrations/*.sql`) create the extension and every table, including
the `document_chunks` table with an `ivfflat` cosine-distance index for
similarity search. Migrations run automatically on backend container start
(idempotent — tracked in a `schema_migrations` table).

## 8. Groq Setup

1. Create an API key at https://console.groq.com.
2. Set `GROQ_API_KEY` in `.env`.
3. Set `GROQ_MODEL` to a currently-supported Qwen or GPT-OSS model slug from
   Groq's model list — this is intentionally not hardcoded anywhere in the
   codebase beyond the env var, so it's simple to update as Groq's lineup changes.

## 9. GitHub Setup

1. (Optional but recommended) create a GitHub personal access token with
   `public_repo` read access and set `GITHUB_TOKEN`.
2. In the admin dashboard, go to **GitHub**, enter your username, and click
   **Sync GitHub**. This pulls public, non-fork repos (name, description,
   README, languages, topics, stars, forks, URLs).
3. Nothing is exposed to the public agent automatically. Toggle **Include in
   AI knowledge** per repository to opt it in — this is what indexes it into
   `document_chunks` as `public`.

## 10. Docker Deployment

```bash
cp .env.example .env   # fill in real values
docker compose up -d --build
```

This builds and starts `postgres`, `backend`, `frontend`, and `nginx`.
The backend runs migrations automatically before starting. Create your first
admin user once the backend is healthy:

```bash
docker compose exec backend node dist/database/createAdmin.js you@example.com "SomeStrongPassword123!"
```

Then log in at `https://yourdomain.com/admin`.

Seed placeholder data (optional, safe to skip if you'd rather start from the
admin dashboard with a blank slate):

```bash
docker compose exec backend sh -c "cd .. && node -e \"require('ts-node/register'); require('./database/seed/seed.ts')\""
```

(Simplest in practice: just fill in Profile / Skills / Experience / Projects
directly from `/admin` — the seed script only exists to avoid a totally empty
first-run screen.)

## 11. Nginx + Domain + HTTPS

1. Point your domain's A record at the VPS.
2. Get a certificate (recommended: certbot in standalone/webroot mode, or
   swap in an nginx-proxy + acme-companion setup if you prefer automation).
   The provided `nginx/nginx.conf` expects certs mounted at
   `/etc/nginx/certs/live/yourdomain.com/{fullchain,privkey}.pem` — update the
   `server_name` and cert paths to match your domain.
3. `docker compose restart nginx` after certificates are in place.
4. The `/api/ai/chat` location has buffering disabled specifically because
   the chat response streams via Server-Sent Events — don't remove that or
   streaming will appear to hang until the full response is ready.

PostgreSQL is never exposed on a host port — only `nginx` binds 80/443.

## 12. Rate Limiting & Security

- `/api/ai/chat`: rate-limited per IP (`CHAT_RATE_LIMIT_PER_MIN`), question
  length capped (`MAX_QUESTION_LENGTH`), conversation history capped
  (`MAX_CONVERSATION_HISTORY`), retrieved context capped (`MAX_CONTEXT_CHUNKS`).
- All other `/api/*` routes: a general rate limiter.
- `helmet` security headers, CORS locked to `FRONTEND_URL`, httpOnly+secure
  session cookies, bcrypt password hashing, server-side validation on every
  admin write (visibility/user/role are never trusted from the client).
- A prompt-injection guard (`backend/src/security/promptInjection.ts`) flags
  common jailbreak/exfiltration attempts before they reach the model, in
  addition to the system prompt's own refusal rules.
- File uploads are restricted by MIME/extension and size (`MAX_UPLOAD_MB`).

## 13. Testing

```bash
cd backend
npm test
```

Runs dependency-free unit tests (chunking, prompt building, prompt-injection
detection). See `backend/tests/INTEGRATION.md` for the integration test plan
that requires a live Postgres+pgvector instance — most importantly, the
privacy test that proves a `private`-visibility item can never appear in a
public chat answer.

## 14. Backups

```bash
./scripts/backup-db.sh
```

Writes a gzip'd `pg_dump` to `./backups/`. Restore with:

```bash
gunzip -c backups/backup-<timestamp>.sql.gz | docker compose exec -T postgres psql -U <user> -d <db>
```

## 15. Definition of Done Checklist

- [x] `docker compose up -d --build` starts the full stack
- [x] Admin login via `/admin` (JWT + httpOnly cookie)
- [x] Manage profile, skills, experience, education, projects, achievements, social links
- [x] Upload and index documents (PDF/DOCX/TXT/MD) with live status
- [x] Sync GitHub, review repos, opt individual repos into public knowledge
- [x] Ask the public agent questions and get answers grounded in the DB
- [x] Source cards shown per answer
- [x] Private knowledge never reaches the public agent (server-enforced)
- [x] Unknown questions get an honest "not enough information" refusal
- [x] Prompt-injection attempts are refused
- [x] Public chat is rate-limited
- [x] Nginx + HTTPS + domain
- [x] Database backup script

## 16. Design Principle

This agent is not a general chatbot. If asked something unrelated to its
owner ("explain quantum physics"), it says so and redirects — see the system
prompt in `backend/src/rag/promptBuilder.ts`. It may give a brief general
technical explanation only when it helps explain one of the developer's own
projects, and always separates that from facts about the developer.

## 17. Known Simplifications

Both items previously listed here have been resolved:

- **Skill categories**: `GET /api/skills/categories` (admin-only) now exists
  (`backend/src/controllers/skillsController.ts`), and the admin Skills form
  (`frontend/app/admin/skills/page.tsx`) has a Category dropdown populated
  from it via a new generic `optionsEndpoint` capability on
  `ResourceManager`'s field config — reusable for any future
  admin-managed lookup table, not just skills. The Skills table also now
  shows each skill's category.
- **Conversation history in the chat UI**: `ChatWindow.tsx` now persists
  `conversationId` and the message list to `localStorage`
  (`personalAiAgent.chat`) on every change, and rehydrates on mount, so a
  page refresh resumes the same conversation instead of starting a new one.
  This is client-side only — the backend doesn't expose a "fetch conversation
  by id" endpoint, so history relies on the browser's storage. Any message
  left mid-stream at the moment of a hard refresh is dropped on reload,
  since it has no way to complete. "Clear chat" wipes the stored copy too.

Everything in the Definition of Done checklist above is implemented.
