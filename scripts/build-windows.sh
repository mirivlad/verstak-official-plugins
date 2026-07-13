#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WINDOWS_DIST="${VERSTAK_WINDOWS_PLUGIN_DIST:-$ROOT/dist-windows}"
WINDOWS_CC="${VERSTAK_WINDOWS_CC:-x86_64-w64-mingw32-gcc}"
GO_BIN="${GO_BIN:-go}"

if ! command -v "$WINDOWS_CC" >/dev/null; then
  echo "Windows cross-compiler not found: $WINDOWS_CC" >&2
  echo "Install x86_64-w64-mingw32-gcc (for example: sudo apt install gcc-mingw-w64-x86-64)." >&2
  exit 1
fi
if ! command -v "$GO_BIN" >/dev/null; then
  echo "go is required to build Windows plugin backends" >&2
  exit 1
fi

cd "$ROOT"
echo "=== verstak official plugins Windows amd64 build ==="

# Reuse the canonical frontend and manifest packager, then replace every Go
# sidecar with its Windows executable in a separate dist-windows tree.
./scripts/build.sh
rm -rf "$WINDOWS_DIST"
mkdir -p "$WINDOWS_DIST"
cp -R "$ROOT/dist/." "$WINDOWS_DIST/"

backend_count=0
for plugin_dir in "$ROOT"/plugins/*/; do
  [[ -d "$plugin_dir" ]] || continue
  plugin_name="$(basename "$plugin_dir")"
  backend_dir="$plugin_dir/backend"
  [[ -d "$backend_dir" ]] || continue
  if [[ ! -f "$backend_dir/go.mod" && ! -f "$backend_dir/main.go" ]]; then
    continue
  fi

  package_backend="$WINDOWS_DIST/$plugin_name/backend"
  rm -rf "$package_backend"
  mkdir -p "$package_backend"
  echo "  → Windows backend: $plugin_name.exe"
  (
    cd "$backend_dir"
    GOOS=windows GOARCH=amd64 CGO_ENABLED=1 CC="$WINDOWS_CC" \
      "$GO_BIN" build -o "$package_backend/$plugin_name.exe" .
  )
  backend_count=$((backend_count + 1))
done

echo "Windows plugin packages: $WINDOWS_DIST"
echo "Windows backends built: $backend_count"
