# The project's commands — the one place they live. CI (.github/workflows/build.yaml) and the
# VS Code tasks (.vscode/tasks.json) call these recipes, so a check is changed here and
# nowhere else. `just` lists them. Needs just >= 1.38 (working-directory attribute).

set windows-shell := ["powershell.exe", "-NoLogo", "-NoProfile", "-Command"]

# List the recipes
default:
    @just --list

# --- Setup --------------------------------------------------------------------------

# Install all dependencies
setup: setup-backend setup-frontend

[working-directory: 'backend']
setup-backend:
    uv sync

[working-directory: 'frontend']
setup-frontend:
    pnpm install

# --- Development ----------------------------------------------------------------------

# Django on :8000 (SQLite in backend/data; jobs run right away)
[working-directory: 'backend']
dev-backend:
    uv run python manage.py runserver

# Vite on :5173, proxying /api and /admin to Django
[working-directory: 'frontend']
dev-frontend:
    pnpm dev

# Background jobs; needs DB_TYPE=postgres in .env (with SQLite jobs run right away)
[working-directory: 'backend']
worker:
    uv run python manage.py procrastinate worker

# Optional PostgreSQL for native development (compose.dev.yml); then DB_TYPE=postgres and DB_HOST=localhost in .env
db-up:
    docker compose -f compose.dev.yml up -d

# Apply migrations
[working-directory: 'backend']
migrate:
    uv run python manage.py migrate

# After model changes; commit the migrations
[working-directory: 'backend']
migrations:
    uv run python manage.py makemigrations

# After API changes: schema -> frontend/openapi.json -> src/api/schema.d.ts; commit both
[working-directory: 'frontend']
api-types: api-schema
    pnpm api:types

[working-directory: 'backend']
api-schema:
    uv run python manage.py spectacular --validate --fail-on-warn --format openapi-json --file ../frontend/openapi.json

# After changing server texts: collect them in locale/de/django.po (translate the empty ones), compile django.mo
[working-directory: 'backend']
messages:
    uv run python manage.py makemessages -l de --ignore=.venv --ignore=*/tests/* --no-obsolete --no-location
    uv run python manage.py compilemessages -l de --ignore=.venv

# --- Checks (= CI) --------------------------------------------------------------------

# Everything CI checks; must pass before a push
check: check-backend check-deploy check-frontend check-workflows

# Before a commit: only what the changed files can break (see scripts/check_changed.py)
check-changed:
    uv run --no-project --python ">=3.11" scripts/check_changed.py

# ruff, mypy, cognitive complexity, deptry, import layers, licenses, migrations, Django checks, translations, OpenAPI, tests
[working-directory: 'backend']
check-backend:
    uv sync --locked
    uv run ruff check --output-format=concise .
    uv run ruff format --check .
    uv run mypy .
    uv run complexipy apps config
    uv run deptry .
    uv run lint-imports
    uv run python scripts/check_licenses.py
    uv run python manage.py makemigrations --check --dry-run
    uv run python manage.py check --fail-level WARNING
    uv run python scripts/check_messages.py
    uv run python scripts/check_openapi.py
    uv run pytest -q --cov

# Django's deploy checks with production-like settings (deploy-check.env)
[working-directory: 'backend']
check-deploy:
    uv run --env-file deploy-check.env python manage.py check --deploy --fail-level WARNING

# prettier, oxlint, eslint, knip, types, tests, copied code, API types, build, bundle size, licenses, audit
[working-directory: 'frontend']
check-frontend:
    pnpm install --frozen-lockfile
    pnpm check
    pnpm api:types
    git diff --exit-code -- src/api/schema.d.ts
    pnpm build-only
    pnpm size
    pnpm check:licenses
    pnpm audit --prod --audit-level high

# Python, Debian, Node.js, PostgreSQL, Django: fails 180 days before their support ends.
# Not in `check`: it needs the network and its result changes with the date (weekly in CI).
[working-directory: 'backend']
check-eol:
    uv run --no-project python scripts/check_eol.py

# GitHub workflows: syntax (actionlint) and security (zizmor)
check-workflows:
    uvx --from actionlint-py==1.7.12.25 actionlint
    uvx zizmor@1.32.0 .github/

# --- Docker ----------------------------------------------------------------------------

# Build the image locally and start the production-like stack (http://localhost:8080)
docker-up:
    docker compose up -d --build

docker-logs:
    docker compose logs -f

docker-down:
    docker compose down
