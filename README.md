# Pickup - Image and Video Sharing Platform

A web application for sharing images and videos without user accounts. Users create or join "Pickups" (shared spaces), upload media to their personal folder and see what everyone else uploaded.

## Features

- 🚀 **No Account Required** - Start sharing immediately
- 📁 **Personal Folders** - Each participant gets their own folder with any number of subfolders; only they can change it
- 🗂️ **File explorer** - Folder tree, address bar you can type into, details/content/small/large views, sorting, search, keyboard shortcuts, right-click menus; works on the phone too
- 🔗 **Easy Sharing** - One share link per pickup, one personal link per participant
- 📧 **Email Reminders** - Optional email with the personal link
- 📦 **Large Files** - Files above 20 MB are uploaded in resumable 5 MB chunks
- 📱 **Responsive Design** - Works on all devices

## Tech Stack

- **Backend:** Python 3.14, Django 6.1, Django REST Framework, drf-spectacular (OpenAPI), PostgreSQL in production (SQLite for development), managed with [uv](https://docs.astral.sh/uv/)
- **Frontend:** Vue 3, TypeScript, Vue Router, TanStack Query, openapi-fetch (types generated from the API schema), Tailwind CSS, shadcn-vue, Vite, managed with pnpm
- **Runtime:** one hardened container (supervisord → nginx + gunicorn), Postgres, nightly backups
- **CI:** Gitea Actions, Renovate

## Project Structure

```
pickup/
├── backend/                  Django (uv)
│   ├── config/               settings, env helpers (env.py), URL roots
│   ├── apps/
│   │   ├── core/             UUID base models, system checks, /api/health, /api/csrf, commands
│   │   ├── accounts/         custom User (admin login)
│   │   └── pickups/          models/, serializers/, api/, services/, admin/, tests/
│   ├── scripts/              license check
│   └── data/                 runtime data: uploaded media (DATA_DIR, not in git)
├── frontend/                 Vue 3 + Vite (pnpm)
│   ├── src/
│   │   ├── api/              typed client (openapi-fetch + CSRF), generated schema.d.ts
│   │   ├── features/         home/, pickups/ (join), explorer/ (the pickup page) — components/, composables/, views/
│   │   ├── components/       shared components; ui/ = shadcn-vue (vendored)
│   │   ├── router/           routes per feature
│   │   └── test/             fake API and helpers for the Vitest component tests
│   ├── openapi.json          API schema (generated, checked by CI)
│   └── scripts/              license check
├── docker/                   nginx, supervisord, healthcheck, backup script
├── Dockerfile, compose.yml   production-like stack; compose.dev.yml: Postgres for development
├── .gitea/workflows/         CI (build.yaml) and Renovate (renovate.yaml)
├── .vscode/tasks.json        dev servers, checks (same as CI), migrations, Docker
└── .env.example              all configuration, documented
```

## Getting Started (native development)

### Prerequisites
- [uv](https://docs.astral.sh/uv/) (installs Python 3.14 itself)
- Node.js 24 (LTS) and pnpm (`npm install -g pnpm`; the version in `package.json` is picked automatically)
- Docker, for the production-like stack and for Postgres in development (optional)

### First setup

All settings come from one `.env` in the repository root; every variable is explained in `.env.example`.

```bash
cp .env.example .env
cd backend
uv sync
uv run python manage.py migrate
uv run python manage.py ensure_admin      # admin user from ADMIN_* in .env
cd ../frontend
pnpm install
```

### Daily commands

In VS Code, run the task **dev** (Terminal → Run Task). Without VS Code:

| What | Command |
|---|---|
| Backend dev server (:8000) | `cd backend && uv run python manage.py runserver` |
| Frontend dev server (:5173) | `cd frontend && pnpm dev` |
| All checks CI runs | VS Code task **check** (runs `check: backend`, `check: deploy settings`, `check: frontend`) |
| Backend checks only | `cd backend && uv run ruff check . && uv run mypy . && uv run pytest` |
| Frontend checks only | `cd frontend && pnpm check` |
| After model changes | `uv run python manage.py makemigrations` (task **django: makemigrations**) |
| After API changes | task **api: types** (`frontend/openapi.json` → `src/api/schema.d.ts`; commit both, CI compares them) |
| Postgres instead of SQLite | task **db: start dev postgres**, then `DB_TYPE=postgres`, `DB_HOST=localhost` in `.env` |

Open http://localhost:5173. Vite proxies `/api`, `/admin`, `/django-static` and `/media` to Django, so both share one origin (no CORS). The admin is at http://localhost:5173/admin/.

Pre-commit hooks (ruff, Prettier, oxlint and basic file checks) once per clone: `uv tool run pre-commit install`.

Conventions for contributors and coding agents (structure, access-control rules, frontend patterns) are in [AGENTS.md](AGENTS.md).

End-to-end tests use Cypress, whose binary is not downloaded on install: run `pnpm exec cypress install` once, then `pnpm test:e2e`.

## Docker (production-like)

```bash
cp .env.example .env    # then set SECRET_KEY, DB_PASSWORD, ADMIN_PASSWORD, APP_URLS
docker compose up -d --build
```

The app runs at http://localhost:8080 (`APP_PORT`). Compose starts three services:

- **db** - PostgreSQL 18, data in the `db-data` volume.
- **app** - nginx serves the SPA, `/media/` and static files, and proxies `/api` to gunicorn/Django. Migrations and the first admin user run on every start. The container is hardened: read-only root filesystem, no capabilities, unprivileged user; only `/data` (volume `app-data`, uploaded media) and `/tmp` are writable.
- **backup** - nightly backup, see below.

`/admin` is closed in Docker unless `ADMIN_ENABLED=true`. Change the admin password with `docker compose exec app python manage.py set_password admin`.

Behind a TLS reverse proxy: set `APP_URLS=https://your.domain` and `TRUSTED_PROXIES` to the proxy's address. Django then uses secure cookies, redirects to HTTPS and sends HSTS.

Upload limits: nginx accepts request bodies up to 25 MB. The SPA sends files up to 20 MB in one request and larger files in 5 MB chunks, so files of many GB work. Finalizing a chunked upload copies the file once; `GUNICORN_TIMEOUT` (default 300 s) must cover that.

## Backups

The **backup** service writes into the `backups` volume every night at `BACKUP_TIME` and keeps `BACKUP_KEEP_DAYS` days:

- `db/pickup-<time>.dump` - PostgreSQL dump (custom format)
- `media/<time>/` - snapshot of all uploaded media. Uploaded files never change, so unchanged files are hard links to the previous snapshot: every snapshot is complete, but only new files take space.

Backup now: `docker compose exec backup sh /backup.sh now`

**Copy backups off the host** - a backup on the same disk does not protect against losing the host:

```bash
docker compose cp backup:/var/lib/postgresql/backups ./backups
```

(`docker compose cp` copies hard-linked snapshots as separate files. For large media, point your host backup at the `pickup_backups` volume instead, e.g. with `rsync -aH`.)

**Restore** (stop the app first: `docker compose stop app`):

```bash
# Database, into the running db service
docker compose exec -T backup sh -c 'pg_restore --clean --if-exists -d "$PGDATABASE"' < backups/db/pickup-<time>.dump

# Media, from a snapshot inside the backups volume
docker compose run --rm --no-deps --user 10001:10001 --entrypoint sh \
  -v pickup_app-data:/restore backup -c \
  'mkdir -p /restore/media && cp -R /var/lib/postgresql/backups/media/<time>/. /restore/media/'

docker compose start app
```

## Usage

### Creating a Pickup
1. Visit the home page and click "Create New Pickup".
2. Keep the **creator link** for yourself; it logs you back in as the creator.
3. Send the **share link** to others.

### Joining a Pickup
1. Open the share link.
2. Enter your name and a folder name; optionally an email address for your personal link.
3. Upload media. Your browser stays logged in; the personal link logs you in from another browser.

### Uploading and organising
1. Open your folder (tree on the left, or the folder button on the phone).
2. Drag and drop photos and videos onto the folder, or use **Upload** (JPG, PNG, GIF, WebP, BMP, MP4, MOV, AVI, WMV, FLV, WebM, MKV; no SVG). Uploads keep running while you browse.
3. **New folder** creates subfolders; rename with F2, delete with Del, add captions in the details pane or the viewer.
4. Switch views (Details, Content, Small/Large icons) and sorting in the toolbar; the choice is remembered.

## API Endpoints

The full schema is `frontend/openapi.json`; with `DEBUG=true` there is a browsable version at `/api/docs/`.

Membership is a session: the personal link's access key is exchanged once (`POST .../session/`), after that the session cookie identifies the member. Every unsafe request needs the CSRF token (cookie from `GET /api/csrf`, sent as `X-CSRFToken`).

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/csrf` | Sets the CSRF cookie |
| POST | `/api/pickups/` | Create a pickup (returns the creator's personal link) |
| GET | `/api/pickups/{id}/` | Pickup details |
| POST / DELETE | `/api/pickups/{id}/session/` | Log in with `{access_key}` / leave |
| POST | `/api/pickups/{id}/join/` | Join: create folder and member, log in |
| GET | `/api/pickups/{id}/folders/` | All folders (flat; `parent` builds the tree) |
| GET | `/api/pickups/{id}/media/` | All media |
| PATCH | `/api/pickups/{id}/` | Rename the pickup (creator) |
| GET | `/api/pickups/{id}/folders/{folder_id}/` | Folder details |
| PATCH / DELETE | `/api/pickups/{id}/folders/{folder_id}/` | Rename a folder / delete a subfolder with its contents (owner) |
| POST | `/api/pickups/{id}/folders/{folder_id}/subfolders/` | Create a subfolder (owner) |
| GET / POST | `/api/pickups/{id}/folders/{folder_id}/media/` | Folder media / upload (owner) |
| DELETE | `/api/pickups/{id}/folders/{folder_id}/clear/` | Delete all media of a folder (owner) |
| GET / DELETE | `/api/pickups/{id}/folders/{folder_id}/media/{media_id}/` | Media / delete (owner) |
| PATCH | `/api/pickups/{id}/folders/{folder_id}/media/{media_id}/caption/` | Edit caption (owner) |
| POST | `/api/pickups/{id}/folders/{folder_id}/upload-sessions/` | Start a chunked upload (owner) |
| GET | `/api/upload-sessions/{session_id}/` | Upload progress, missing chunks (owner) |
| POST | `/api/upload-sessions/{session_id}/chunks/` | Upload one chunk (owner) |
| POST | `/api/upload-sessions/{session_id}/finalize/` | Assemble the file (owner) |

## Security

- Personal links carry a secret access key that is exchanged for a session; member ids are never credentials. Pickup ids (the share link) are random UUIDv4.
- CSRF protection on every unsafe request, also for anonymous members.
- Uploads are restricted to image and video types (no SVG), stored under random names, and served with a sandboxing Content-Security-Policy and `nosniff`.
- nginx sets CSP and security headers for the SPA and rate-limits the admin login.
- The container runs read-only, unprivileged and without capabilities.

## Gitea Setup

1. **Branch protection on `main` with required status checks** `backend`, `frontend`, `repository` and `image` (workflow `build`). Do this first: Renovate merges minor and patch updates once checks pass, and without required checks Gitea would merge them right away.
2. Enable Actions for the repository; the runner needs Docker (the image job runs `docker build` / `docker run`).
3. Repository secrets:
   - `REGISTRY_USER`, `REGISTRY_TOKEN` (scope `write:package`) - push the image to this Gitea's container registry.
   - `RENOVATE_TOKEN` - token of the user that opens Renovate PRs (`write:repository`, `write:issue`, `read:organization`, `read:user`, `read:package`).
   - `GH_COM_TOKEN` (optional) - read-only github.com token for release notes and higher rate limits.

CI (`.gitea/workflows/build.yaml`) runs the backend checks (ruff, mypy strict, deptry, licenses, migrations, Django and deploy checks, OpenAPI schema, pytest with ≥ 90 % coverage), the frontend checks (prettier, oxlint, ESLint, knip, type-check, Vitest with coverage, build, bundle size, licenses, audit) and a Trivy scan of the repository; then it builds the image, smoke-tests it hardened against Postgres, scans it and pushes it on `main` and on version tags (`v1.2.3`). The VS Code task **check** runs the same checks locally.
