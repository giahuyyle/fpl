#!/bin/sh

set -eu

checksum_file="node_modules/.package-lock.sha256"
current_checksum="$(sha256sum package-lock.json)"

if [ ! -x node_modules/.bin/vite ] || [ ! -f "$checksum_file" ] || [ "$(cat "$checksum_file" 2>/dev/null || true)" != "$current_checksum" ]; then
  echo "Frontend dependencies changed; syncing node_modules..."
  npm ci
  printf '%s\n' "$current_checksum" > "$checksum_file"
fi

exec npm run dev -- --host 0.0.0.0
