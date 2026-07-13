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

# Each archive expands directly into the desktop application's plugins/
# directory. Frontends and manifests are shared; platform-test's native
# sidecar is built for the target operating system.
tar -C "$ROOT/dist" -czf "$LINUX_ARCHIVE" .
(cd "$ROOT/dist-windows" && zip -qr "$WINDOWS_ARCHIVE" .)
(cd "$RELEASE_ROOT" && sha256sum "$(basename "$LINUX_ARCHIVE")" "$(basename "$WINDOWS_ARCHIVE")" > SHA256SUMS)

echo "Linux plugins:   $LINUX_ARCHIVE"
echo "Windows plugins: $WINDOWS_ARCHIVE"
echo "checksums:       $RELEASE_ROOT/SHA256SUMS"
