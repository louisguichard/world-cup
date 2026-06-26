# Shared helpers for RapidAPI MCP launcher scripts.

refresh_mcp_endpoints() {
  local api_id="$1"
  local root="$2"
  if command -v node >/dev/null 2>&1; then
    node "$root/scripts/mcp-endpoint-config.mjs" show "$api_id" >/dev/null 2>&1 || true
  fi
  export MCP_ENDPOINTS_MANIFEST="$root/.cursor/mcp-endpoints.active.json"
}
