#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILDER="$ROOT/scripts/build-windows.sh"

if [[ ! -x "$BUILDER" ]]; then
  echo "Windows plugin builder is missing or not executable: $BUILDER" >&2
  exit 1
fi

bash -n "$BUILDER"
grep -Fq 'GOOS=windows' "$BUILDER"
grep -Fq 'GOARCH=amd64' "$BUILDER"
grep -Fq 'dist-windows' "$BUILDER"
grep -Fq '.exe' "$BUILDER"
grep -Fq 'x86_64-w64-mingw32-gcc' "$BUILDER"

echo "Windows plugin build script contract passed"
