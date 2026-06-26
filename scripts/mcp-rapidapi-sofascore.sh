#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.local"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [[ -z "${VITE_RAPIDAPI_KEY:-}" ]]; then
  echo "VITE_RAPIDAPI_KEY is not set. Add it to $ENV_FILE or run: npm run sync-keys" >&2
  exit 1
fi

source "$(cd "$(dirname "$0")" && pwd)/mcp-rapidapi-common.sh"
refresh_mcp_endpoints "sofascore" "$ROOT"

exec npx -y mcp-remote "https://mcp.rapidapi.com" \
  --header "x-api-host: sofascore6.p.rapidapi.com" \
  --header "x-api-key: ${VITE_RAPIDAPI_KEY}"
