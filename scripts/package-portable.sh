#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${1:-}"

if [[ -z "$VERSION" || ! "$VERSION" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]; then
  echo "usage: $0 <version>" >&2
  echo "example: $0 v0.1.0-alpha.1" >&2
  exit 2
fi

if ! command -v zip >/dev/null; then
  echo "zip is required to create the Windows plugin archive" >&2
  exit 1
fi

echo "=== verstak official portable plugin packages $VERSION ==="
"$ROOT/scripts/build.sh"
"$ROOT/scripts/build-windows.sh"

RELEASE_ROOT="$ROOT/release"
LINUX_ARCHIVE="$RELEASE_ROOT/verstak-official-plugins-linux-amd64-$VERSION.tar.gz"
WINDOWS_ARCHIVE="$RELEASE_ROOT/verstak-official-plugins-windows-amd64-$VERSION.zip"
rm -rf "$RELEASE_ROOT"
mkdir -p "$RELEASE_ROOT"

# Plugins whose manifest sets "development": true are built and installed for
# local development but must not reach users: platform-test, for instance,
# appears in the sidebar as "Platform Test" and reports its own results in the
# status bar. Staging directories are used so dist/ stays complete for
# install-dev-plugins.sh.
stage_release_tree() {
  local source="$1"
  local staged="$2"
  rm -rf "$staged"
  cp -a "$source" "$staged"
  for manifest in "$staged"/*/plugin.json; do
    [ -f "$manifest" ] || continue
    if python3 -c "import json,sys; sys.exit(0 if json.load(open(sys.argv[1])).get('development') else 1)" "$manifest"; then
      echo "  ⊘ excluding development plugin: $(basename "$(dirname "$manifest")")"
      rm -rf "$(dirname "$manifest")"
    fi
  done
}

STAGE_LINUX="$ROOT/.release-stage/linux"
STAGE_WINDOWS="$ROOT/.release-stage/windows"
trap 'rm -rf "$ROOT/.release-stage"' EXIT
mkdir -p "$ROOT/.release-stage"
stage_release_tree "$ROOT/dist" "$STAGE_LINUX"
stage_release_tree "$ROOT/dist-windows" "$STAGE_WINDOWS"

# Each archive expands directly into the desktop application's plugins/
# directory. Frontends and manifests are shared; native sidecars are built for
# the target operating system.
tar -C "$STAGE_LINUX" -czf "$LINUX_ARCHIVE" .
(cd "$STAGE_WINDOWS" && zip -qr "$WINDOWS_ARCHIVE" .)
(cd "$RELEASE_ROOT" && sha256sum "$(basename "$LINUX_ARCHIVE")" "$(basename "$WINDOWS_ARCHIVE")" > SHA256SUMS)

echo "Linux plugins:   $LINUX_ARCHIVE"
echo "Windows plugins: $WINDOWS_ARCHIVE"
echo "checksums:       $RELEASE_ROOT/SHA256SUMS"
