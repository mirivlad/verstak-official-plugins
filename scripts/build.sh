#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAILED=0

report() {
  if [ "$2" -eq 0 ]; then
    echo "  ✅ $1"
  else
    echo "  ❌ $1"
    FAILED=1
  fi
}

echo "=== verstak-official-plugins build ==="

BUILT=0
SKIPPED=0
FAILED_PLUGINS=""

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
    echo "  → frontend: npm ci + build"
    (cd "$plugin_dir/frontend" && npm ci --no-audit --no-fund)
    report "npm ci" $?
    (cd "$plugin_dir/frontend" && npm run build)
    report "frontend build" $?
    BUILT=1
  else
    echo "  ℹ️  no frontend/package.json — skipping frontend"
  fi

  # Backend build (Go)
  if [ -f "$plugin_dir/backend/go.mod" ] || [ -f "$plugin_dir/backend/main.go" ]; then
    echo "  → backend: go build"
    if [ -d "$plugin_dir/backend" ]; then
      (cd "$plugin_dir/backend" && go build ./...)
      report "backend go build" $?
      BUILT=1
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
