# syntax=docker/dockerfile:1

# --- 1. Build the SPA ------------------------------------------------------------
FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
# pnpm in the version of "packageManager" in package.json (the one place it is set).
RUN npm install -g "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1]")"
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm run build

# --- 2. ffmpeg for video stills, only what that needs -------------------------------
# Debian's ffmpeg package pulls in ~440 MB (Mesa, LLVM, codecs for encoding). This builds
# Debian's own ffmpeg source (signed, with its security patches; rebuild to pick up new
# ones; Trivy can't see this binary) with nothing but: reading the containers and video codecs uploads may have, scaling
# and turning frames upright, writing one PNG. No network, no devices, no GPL parts (LGPL).
# AV1 through Debian's libdav1d. Keep the formats in step with VIDEO_FORMATS in
# backend/apps/pickups/services/thumbnails.py.
FROM python:3.14-slim-trixie@sha256:9aaa474097d094040649f2162a627c0049b408f52138d980916788d80f04802f AS ffmpeg
WORKDIR /src
RUN sed -i 's/^Types: deb$/Types: deb deb-src/' /etc/apt/sources.list.d/debian.sources \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
      build-essential dpkg-dev nasm pkg-config libdav1d-dev zlib1g-dev \
 && apt-get source ffmpeg \
 && rm -rf /var/lib/apt/lists/*
RUN cd ffmpeg-*/ \
 && ./configure --prefix=/opt/ffmpeg \
      --disable-everything --disable-autodetect --disable-network --disable-doc \
      --disable-debug --disable-ffplay --disable-ffprobe --disable-avdevice \
      --enable-zlib --enable-libdav1d \
      --enable-protocol=file,pipe \
      --enable-demuxer=mov,matroska,avi,asf,flv \
      --enable-parser=h264,hevc,vp8,vp9,av1,mpeg4video,mpegvideo,h263,mjpeg,vc1 \
      --enable-decoder=h264,hevc,vp8,vp9,libdav1d,mpeg4,h263,flv,mpeg1video,mpeg2video,mjpeg \
      --enable-decoder=msmpeg4v1,msmpeg4v2,msmpeg4v3,wmv1,wmv2,wmv3,vc1,prores \
      --enable-filter=scale,transpose,hflip,vflip,rotate,format,null \
      --enable-encoder=png --enable-muxer=image2pipe \
 && make -j"$(nproc)" \
 && make install \
 && strip /opt/ffmpeg/bin/ffmpeg \
 && /opt/ffmpeg/bin/ffmpeg -hide_banner -L | grep -q "GNU Lesser General Public"

# --- 3. Runtime: supervisord → nginx + gunicorn/Django -----------------------------
FROM python:3.14-slim-trixie@sha256:9aaa474097d094040649f2162a627c0049b408f52138d980916788d80f04802f AS runtime
COPY --from=ghcr.io/astral-sh/uv:0.13.9@sha256:d3b601f0c7b118bc1753febf7c41cc80981df678445e0254284eecf84db79a7d /uv /usr/local/bin/uv

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    DATA_DIR=/data

RUN apt-get update \
 # libdav1d7: AV1 decoder for the ffmpeg built above.
 && apt-get install -y --no-install-recommends nginx gettext-base libdav1d7 \
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
# collectstatic needs settings to import; throwaway keys are enough at build time.
# DATA_DIR elsewhere: settings create directories in it, which would otherwise land
# root-owned in the image's /data and from there in the volume.
RUN SECRET_KEY="build-only-$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')" \
    EMAIL_HASH_KEY="build-only-$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')" \
    DATA_DIR=/tmp/build-data python manage.py collectstatic --noinput

COPY --from=frontend /frontend/dist /srv/spa
# Video stills (services/thumbnails.py), run as its own program.
COPY --from=ffmpeg /opt/ffmpeg/bin/ffmpeg /usr/local/bin/ffmpeg
COPY docker/nginx.conf docker/django_proxy.conf docker/security_headers.conf /etc/nginx/
COPY docker/app.conf.template /etc/nginx/app.conf.template
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/start docker/start-nginx docker/exit-on-fatal docker/healthcheck /usr/local/bin/

# Everything above is owned by root and read-only for "app"; only /data and /tmp are written.
USER app
EXPOSE 8080
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD ["python", "/usr/local/bin/healthcheck"]
# Migrations, deploy checks and the first admin, then supervisord (docker/start).
CMD ["start"]
