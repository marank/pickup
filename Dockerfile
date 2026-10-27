# syntax=docker/dockerfile:1

# --- 1. Build the SPA ------------------------------------------------------------
FROM node:24-alpine AS frontend
# pnpm pinned to the version in package.json "packageManager".
RUN npm install -g pnpm@12.15.0
WORKDIR /frontend
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm run build

# --- 2. Runtime: supervisord → nginx + gunicorn/Django -----------------------------
FROM python:3.14-slim AS runtime
COPY --from=ghcr.io/astral-sh/uv:0.12.20 /uv /usr/local/bin/uv

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    DATA_DIR=/data

RUN apt-get update \
 && apt-get install -y --no-install-recommends nginx gettext-base \
 && rm -rf /var/lib/apt/lists/* /etc/nginx/sites-enabled /etc/nginx/conf.d \
 # supervisord lives outside the app's venv; it's infrastructure, not an app dependency.
 # pip itself is removed afterwards: not needed at runtime, and it vendors its own
 # certifi/urllib3 that would otherwise age in the image.
 && pip install --no-cache-dir --root-user-action=ignore supervisor \
 && pip uninstall --yes --root-user-action=ignore pip \
 && groupadd --system --gid 10001 app \
 && useradd --system --uid 10001 --gid app --home-dir /app --no-create-home app \
 && mkdir -p /data && chown app:app /data

WORKDIR /app
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY backend/ ./
# collectstatic needs settings to import; a throwaway key is enough at build time.
# DATA_DIR elsewhere: settings create directories in it, which would otherwise land
# root-owned in the image's /data and from there in the volume.
RUN SECRET_KEY="build-only-$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')" \
    DATA_DIR=/tmp/build-data python manage.py collectstatic --noinput

COPY --from=frontend /frontend/dist /srv/spa
COPY docker/nginx.conf docker/django_proxy.conf docker/security_headers.conf /etc/nginx/
COPY docker/app.conf.template /etc/nginx/app.conf.template
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/start-nginx docker/exit-on-fatal docker/healthcheck /usr/local/bin/

# Everything above is owned by root and read-only for "app"; only /data and /tmp are written.
USER app
EXPOSE 8080
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD ["python", "/usr/local/bin/healthcheck"]
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
