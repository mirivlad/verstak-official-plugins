#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAILED=0
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

# ── Packaging function ─────────────────────────────────────
# Creates dist/<plugin-id>/ from a built plugin directory.
package_plugin() {
  local plugin_dir="$1"
  local plugin_name="$2"
  local dist_dir="$ROOT/dist/$plugin_name"

  echo "  → packaging dist/$plugin_name"
  rm -rf "$dist_dir"
  mkdir -p "$dist_dir"

  # 1. plugin.json
  if [ -f "$plugin_dir/plugin.json" ]; then
    cp "$plugin_dir/plugin.json" "$dist_dir/"
  fi

  # 2. frontend/dist/
  if [ -d "$plugin_dir/frontend/dist" ]; then
    mkdir -p "$dist_dir/frontend/dist"
    cp -r "$plugin_dir/frontend/dist/." "$dist_dir/frontend/dist/"
    echo "    └─ frontend/dist ($(find "$dist_dir/frontend/dist" -type f | wc -l) file(s))"
  elif [ -f "$plugin_dir/frontend/src/index.js" ]; then
    mkdir -p "$dist_dir/frontend/dist"
    cp "$plugin_dir/frontend/src/index.js" "$dist_dir/frontend/dist/index.js"
    echo "    └─ frontend/dist/index.js (from frontend/src/index.js)"
  fi

  # 3. backend binary
  if [ -d "$plugin_dir/backend" ]; then
    # Find the compiled binary (same name as plugin directory)
    local bin_name="$plugin_name"
    if [ -f "$plugin_dir/backend/$bin_name" ]; then
      mkdir -p "$dist_dir/backend"
      cp "$plugin_dir/backend/$bin_name" "$dist_dir/backend/"
      chmod +x "$dist_dir/backend/$bin_name"
      echo "    └─ backend/$bin_name ($(du -h "$dist_dir/backend/$bin_name" | cut -f1))"
    fi
  fi

  # 4. Verify dist package has at least plugin.json
  if [ ! -f "$dist_dir/plugin.json" ]; then
    echo "    ❌ dist package missing plugin.json"
    return 1
  fi

  local file_count
  file_count=$(find "$dist_dir" -type f | wc -l)
  echo "    └─ dist package: $file_count file(s)"
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
      (cd "$plugin_dir/backend" && go build -o "$plugin_name" .)
      report "backend go build" $?
    else
      echo "  ⚠️  go not available — skipping backend"
    fi
  else
    echo "  ℹ️  no backend/ — skipping backend"
  fi

  # Package dist/
  package_plugin "$plugin_dir" "$plugin_name"
  report "dist package" $?
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
