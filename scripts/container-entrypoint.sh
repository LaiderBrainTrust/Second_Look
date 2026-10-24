#!/bin/sh
set -eu
umask 077
# Railway mounts volumes as root. Prepare only this app's fixed data paths,
# then drop privileges for the application and its background worker.
if [ "$(id -u)" = 0 ]; then
  mkdir -p /data /app/.local
  chown node:node /data /app/.local
  for file in /data/second-look.sqlite /data/second-look.sqlite-wal /data/second-look.sqlite-shm; do
    if [ -f "$file" ]; then chown node:node "$file"; fi
  done
  exec gosu node "$@"
fi
exec "$@"
