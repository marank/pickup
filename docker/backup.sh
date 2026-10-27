#!/bin/sh
# Nightly backup, run by the "backup" service in compose.yml, into the "backups" volume:
#
#   /var/lib/postgresql/backups/db/<db>-<time>.dump   pg_dump, custom format (pg_restore)
#   /var/lib/postgresql/backups/media/<time>/          snapshot of the uploaded media
#
# Media files are never changed once written (random names; only added or deleted),
# so a snapshot hard-links every file the previous snapshot already has and copies
# only new ones: each snapshot is a complete tree, but costs only the new files.
# Snapshots and dumps older than BACKUP_KEEP_DAYS are deleted.
set -eu

root=/var/lib/postgresql/backups
media_src=/appdata/media
time="${BACKUP_TIME:-02:30}"
keep="${BACKUP_KEEP_DAYS:-14}"
mkdir -p "$root/db" "$root/media"

dump_db() {
  file="$root/db/${PGDATABASE}-$1.dump"
  echo "backup: writing $file"
  # Write to a temp name first, so a failed dump never looks like a valid one.
  pg_dump --format=custom --file="$file.partial"
  mv "$file.partial" "$file"
}

snapshot_media() {
  target="$root/media/$1"
  previous="$(find "$root/media" -mindepth 1 -maxdepth 1 -type d ! -name '*.partial' | sort | tail -n 1)"
  echo "backup: media snapshot $target${previous:+ (unchanged files linked to $previous)}"
  rm -rf "$target.partial"
  mkdir -p "$target.partial"
  if [ -d "$media_src" ]; then
    copied=0
    linked=0
    # upload_chunks holds unfinished chunked uploads, not media. Stored names are
    # generated (no spaces), so word splitting the find output is safe.
    cd "$media_src"
    for f in $(find . -type f ! -path './upload_chunks/*'); do
      mkdir -p "$target.partial/$(dirname "$f")"
      if [ -n "$previous" ] && [ -f "$previous/$f" ] \
        && [ "$(stat -c %s "$previous/$f")" = "$(stat -c %s "$f")" ]; then
        ln "$previous/$f" "$target.partial/$f"
        linked=$((linked + 1))
      else
        cp "$f" "$target.partial/$f"
        copied=$((copied + 1))
      fi
    done
    cd /
    echo "backup: media: $copied copied, $linked unchanged"
  else
    echo "backup: no media directory at $media_src yet"
  fi
  mv "$target.partial" "$target"
}

prune() {
  find "$root/db" -name "*.dump" -mtime +"$keep" -print -delete
  find "$root/db" -name "*.partial" -mmin +60 -delete
  # Snapshot directories are named by time; mtime of the directory is the snapshot time.
  find "$root/media" -mindepth 1 -maxdepth 1 -type d -mtime +"$keep" -print -exec rm -rf {} +
}

backup() {
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  # Database first: files referenced by the dump are then in the snapshot taken after it.
  dump_db "$stamp"
  snapshot_media "$stamp"
  prune
}

if [ "${1:-}" = "now" ]; then
  backup
  exit 0
fi

echo "backup: daily at $time (container time zone), keeping $keep days"
last=""
while :; do
  now="$(date +%H:%M)"
  today="$(date +%F)"
  if [ "$now" = "$time" ] && [ "$last" != "$today" ]; then
    if backup; then last="$today"; else echo "backup: FAILED" >&2; fi
  fi
  sleep 30
done
