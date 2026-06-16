#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAILED=0
BUILT=0
SKIPPED=0
FAILED_PLUGINS=""

report() {
  if [ "$2" -eq 0 ]; then
    echo "  ✅ $1"
  else
    echo "  ❌ $1"
    FAILED=1
  fi
}

ensure_npm_deps() {
  local dir="$1"
  if [ ! -f "$dir/package.json" ]; then
    return 1
  fi
  if [ ! -d "$dir/node_modules" ]; then
    if [ -f "$dir/package-lock.json" ]; then
      (cd "$dir" && npm ci --no-audit --no-fund)
    else
      (cd "$dir" && npm install --no-audit --no-fund)
    fi
    report "npm install in $(basename "$dir")" $?
  fi
  return 0
}

echo "=== verstak-official-plugins build ==="

# ── Dependency checks ──
echo "[deps]"
HAS_DEPS=1
if ! command -v node &>/dev/null; then echo "  ❌ node: not found"; HAS_DEPS=0; else echo "  ✅ node $(node --version)"; fi
if ! command -v npm &>/dev/null; then echo "  ❌ npm: not found"; HAS_DEPS=0; fi
if ! command -v go &>/dev/null; then echo "  ❌ go: not found"; HAS_DEPS=0; else echo "  ✅ go $(go version | grep -oP 'go\S+')"; fi
if [ "$HAS_DEPS" -eq 0 ]; then
  echo "  ⚠️  some deps missing — will skip matching plugin parts"
fi

for plugin_dir in "$ROOT"/plugins/*/; do
  [ -d "$plugin_dir" ] || continue
  plugin_name="$(basename "$plugin_dir")"
  echo ""
  echo "--- [$plugin_name] ---"

  # Validate plugin.json
  if [ ! -f "$plugin_dir/plugin.json" ]; then
    echo "  ❌ plugin.json not found"
    FAILED=1
    FAILED_PLUGINS="$FAILED_PLUGINS $plugin_name"
    continue
  fi
  if command -v python3 &>/dev/null; then
    if python3 -c "import json; json.load(open('$plugin_dir/plugin.json'))" 2>/dev/null; then
      echo "  ✅ plugin.json: valid JSON"
    else
      echo "  ❌ plugin.json: invalid JSON"
      FAILED=1
      FAILED_PLUGINS="$FAILED_PLUGINS $plugin_name"
      continue
    fi
  else
    echo "  ℹ️  python3 not available — skipping JSON validation"
  fi

  # Frontend build
  if [ -f "$plugin_dir/frontend/package.json" ]; then
    echo "  → frontend"
    if command -v npm &>/dev/null; then
      ensure_npm_deps "$plugin_dir/frontend"
      (cd "$plugin_dir/frontend" && npm run build)
      report "frontend build" $?
      BUILT=1
    else
      echo "  ⚠️  npm not available — skipping frontend"
    fi
  else
    echo "  ℹ️  no frontend/package.json — skipping frontend"
  fi

  # Backend build (Go)
  if [ -f "$plugin_dir/backend/go.mod" ] || [ -f "$plugin_dir/backend/main.go" ]; then
    echo "  → backend"
    if command -v go &>/dev/null; then
      (cd "$plugin_dir/backend" && go mod download 2>/dev/null || true)
      (cd "$plugin_dir/backend" && go build ./...)
      report "backend go build" $?
      BUILT=1
    else
      echo "  ⚠️  go not available — skipping backend"
    fi
  else
    echo "  ℹ️  no backend/ — skipping backend"
  fi
done

echo ""
echo "=== summary ==="
echo "  plugins found: $(ls -d "$ROOT"/plugins/*/ 2>/dev/null | wc -l)"
if [ -n "$FAILED_PLUGINS" ]; then
  echo "  failed: $FAILED_PLUGINS"
fi
if [ "$FAILED" -eq 0 ]; then
  echo "✅ build passed"
else
  echo "❌ build failed"
fi
exit "$FAILED"
