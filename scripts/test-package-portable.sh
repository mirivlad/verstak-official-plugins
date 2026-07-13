#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PACKAGER="$ROOT/scripts/package-portable.sh"

if [[ ! -x "$PACKAGER" ]]; then
  echo "portable plugin packager is missing or not executable: $PACKAGER" >&2
  exit 1
fi

bash -n "$PACKAGER"
grep -Fq 'scripts/build.sh' "$PACKAGER"
grep -Fq 'scripts/build-windows.sh' "$PACKAGER"
grep -Fq 'verstak-official-plugins-linux-amd64-' "$PACKAGER"
grep -Fq 'verstak-official-plugins-windows-amd64-' "$PACKAGER"
grep -Fq 'tar -C' "$PACKAGER"
grep -Fq 'zip -qr' "$PACKAGER"
grep -Fq 'SHA256SUMS' "$PACKAGER"

echo "portable plugin package script contract passed"
