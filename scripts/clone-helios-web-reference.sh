#!/usr/bin/env bash
set -euo pipefail

DEST="${1:-/tmp/helios-web-reference}"
REMOTE="${HELIOS_WEB_REMOTE:-https://github.com/filipinascimento/helios-web.git}"
BRANCH="${HELIOS_WEB_BRANCH:-main}"

if [ -d "$DEST/.git" ]; then
  git -C "$DEST" fetch origin "$BRANCH"
  git -C "$DEST" checkout "$BRANCH"
  git -C "$DEST" pull --ff-only origin "$BRANCH"
else
  git clone --branch "$BRANCH" --depth 1 "$REMOTE" "$DEST"
fi

printf '%s\n' "$DEST"
