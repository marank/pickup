# Pickup — conventions for contributors and coding agents

Photo/video sharing without accounts. Django backend (`backend/`, API via Django REST framework), Vue 3 + TypeScript SPA (`frontend/`), one hardened Docker image. Read this before changing structure; `README.md` has setup and commands.

## Commands

VS Code tasks (`.vscode/tasks.json`) hold the everyday commands; the README lists the plain equivalents.
- `dev` task: Django :8000 + Vite :5173 → http://localhost:5173.
- `check` task runs everything CI runs. It must pass before a commit is pushed. If you change a check, change it in both `tasks.json` and `.gitea/workflows/build.yaml`.
- `api: types` after any API change (schema → `frontend/openapi.json` → `frontend/src/api/schema.d.ts`); commit both files. CI fails if either is stale.
- `django: makemigrations` after model changes; commit the migrations.
- Frontend package manager is **pnpm** only. Backend dependencies via `uv add` / `uv add --dev`.
- `uv tool run pre-commit install` once per clone (ruff, prettier, oxlint on commit).

## Domain rules (access control)

Members have no accounts. Keep these properties; tests in `apps/pickups/tests/` cover them.
- A member's personal link carries `Member.access_key`; `POST /api/pickups/{id}/session/` trades it for a Django session (`services/members.py`). Member ids are never credentials and never appear in API responses or URLs. `access_key` is returned only to that member (when creating or joining) and in the email.
- The pickup id is the share link, so `Pickup` keeps a random UUIDv4 (not the time-ordered UUIDv7 of `UUIDModel`).
- Every unsafe request is CSRF-checked, also for anonymous members (`apps.core.api.authentication.CsrfSessionAuthentication`).
- Who may do what lives in `services/access.py`; use it instead of ad-hoc checks. Seeing a pickup's folders, media and files needs `can_view` (a member, or `visibility == "link"`); outsiders of a private pickup get only its title and how to join (counts are 0). Joining follows `Pickup.join_policy` (`open` | `invite` | `closed`, `services/members.py`); a new participant must pick a name nobody in the pickup has (case-insensitive), so nobody can pose as someone else. The creator may delete any subfolder or file (moderation) and remove members (with their folder), never a top-level folder through the folder API.
- Viewsets expose only the actions the SPA uses; changes to a folder or its media require `member.owns(folder)`, which checks the folder's top-level folder (`Folder.root`), so subfolders belong to the member who owns the top-level folder.
- Folders nest: `Folder.parent` is the containing folder, `Folder.root` the member's top-level folder (both empty for top-level folders). A member's top-level folder can be renamed but not deleted. Names are unique per parent (case-insensitive) and may not contain `/` (the address bar's separator). Subfolder logic lives in `services/folders.py`.
- Email addresses (`services/identity.py`): always store `Member.email_hash` (HMAC with `EMAIL_HASH_KEY`, which must never change); the plain `Member.email` only while the pickup's `email_privacy` is off. Mails go out at the moment an address is entered (`services/mail.py`, sender "<name> via Pickup", reply-to only with a plain address), so nothing needs the plain address later. Endpoints that send mail must not reveal whether an address is known (`link-request` always answers 202), respect `Member.link_sent_at` (cooldown) and stay in nginx's `mail` rate limit.
- Files are never served publicly: the API returns `/api/files/{id}/`, which checks `can_view` and then hands the file to nginx via `X-Accel-Redirect` (`MEDIA_ACCEL_REDIRECT`; natively Django streams it). Don't add a public `/media/` location.
- Uploads: images and videos only, no SVG; stored under random names below `DATA_DIR`. Files above 20 MB go through the chunked upload API (5 MB chunks), because nginx limits request bodies to 25 MB.

## Backend rules

- Apps live in `backend/apps/<name>/` (`name = "apps.<name>"`, `label = "<name>"`), registered in `INSTALLED_APPS`. Domain app: `apps/pickups`.
- **No monolithic modules.** `models/`, `admin/`, `api/`, `serializers/`, `services/`, `tests/` are packages with one file per model/resource; `__init__.py` re-exports explicitly. Relations use string references (`"pickups.Folder"`).
- **Every model inherits `apps.core.models.UUIDModel` or `TimeStampedModel`** (UUID primary key). `manage.py check` fails (`core.E001`) otherwise. Order queries explicitly.
- Business logic goes in `services/`, not in API views or models' `save()`.
- API: under `/api/`, paths end in `/` (DRF router default; keep it consistent), session auth + CSRF, UUIDs in paths. `/api/health` stays unauthenticated and exactly at that path. Annotate views with `extend_schema` so the OpenAPI schema stays warning-free (CI runs `spectacular --fail-on-warn`).
- Configuration only via environment variables read through `config/env.py`; every new variable gets a commented entry in `.env.example`.
- mypy runs in strict mode; type all new code. Coverage must stay ≥ 90 %.
- No GPL/AGPL/SSPL dependencies (CI license check).

## Frontend rules

- Feature folders: `src/features/<feature>/{components,composables,views}` (`home`, `pickups`, `explorer`), routes in `src/router/routes/<feature>.ts`.
- The pickup page is a file explorer (`features/explorer`). `provideExplorer()` in `ExplorerView` creates one shared state (tree, current folder, items, selection, view preferences, uploads, dialogs); components read it with `useExplorer()` instead of passing props down. Pure logic lives in `explorer/lib` (`tree.ts`, `items.ts`, `actions.ts`) and is unit-tested; item actions are defined once in `lib/actions.ts` for the context menu and the "⋮" menu.
- The creator's pages (`/pickup/{id}/settings`, `/people`) are explorer "pages": linked at the bottom of the folder tree, shown in the content pane (`PagePane`) with their own address-bar segment. Prefer such pages over modal dialogs for anything bigger than a short form.
- Interaction rules: mouse click selects (Ctrl/Shift for more), double-click opens, dragging on empty space draws a selection rectangle (`useMarquee`); touch tap opens. Keyboard: Enter, F2, Delete, Backspace, Ctrl+A, Escape, Ctrl+L. Everything must stay usable on a 375 px wide screen.
- Design tokens are CSS variables in `src/assets/main.css` (paper, ink, tomato, butter, sage, owner colours); use the Tailwind names (`bg-pane`, `bg-selection`, `text-tomato`, …) instead of raw colours. The colour scheme (system/light/dark) is a stored setting in `lib/theme.ts`, offered in the header's account menu.
- Server state via TanStack Query composables around the typed `api` client (`src/api/client.ts`); wrap calls in `unwrap()` so errors become `ApiError`. Query keys of a pickup start with `['pickup', id]` (`features/pickups/queryKeys.ts`); invalidate that prefix after changes. There is no Pinia: the app has no client-only state. Add it only if that changes.
- Files go as multipart via `formBody()`; uploads run through `useUploadQueue`.
- UI components from shadcn-vue (`pnpm dlx shadcn-vue@latest add <component>`) in `src/components/ui/` — vendored, edit freely. The CLI is not a dependency; `src/assets/shadcn.css` holds the CSS it would import. `add` re-inserts a Google Fonts `@import` into `main.css`; remove it (a test fails otherwise).
- Tailwind for styling. No inline `<script>`, no remote scripts, fonts or styles: the CSP only allows our own origin (fonts are self-hosted via `@fontsource-variable`).
- Tests: Vitest + @vue/test-utils; `src/test/fakeApi.ts` replaces `fetch` with a route table. Coverage ≥ 90 % over `src/` (without `components/ui`).
- Never edit `src/api/schema.d.ts` by hand.

## Docker / runtime

- The app container runs read-only, without capabilities, as an unprivileged user. Only `/data` (`DATA_DIR`, uploads) and `/tmp` are writable — new features must write there, not loosen the hardening.
- supervisord runs gunicorn and nginx; nginx serves the SPA, delivers uploaded files from the internal `/protected-media/` location after Django's check, and proxies `/api` and `/admin`.
- `/admin` is closed in Docker unless `ADMIN_ENABLED=true`.
- Backups (`docker/backup.sh`): nightly database dump plus hard-linked media snapshot. Anything new under `/data` that must survive belongs in that script too.
