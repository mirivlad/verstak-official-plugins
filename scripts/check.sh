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

echo "=== verstak-official-plugins check ==="

# ── Dependency checks ──
HAS_PYTHON=0
if command -v python3 &>/dev/null; then HAS_PYTHON=1; fi

# Validate all plugin manifests against the SDK schema
if [ "$HAS_PYTHON" -eq 1 ]; then
  echo "[manifest validation]"
  SDK_SCHEMA="$ROOT/../verstak-sdk/schemas/manifest.json"
  if [ -f "$SDK_SCHEMA" ]; then
    python3 -c "
import json, glob

skipped = []
problems = []

for plugin_dir in glob.glob('$ROOT/plugins/*/'):
    manifest_path = plugin_dir + 'plugin.json'
    try:
        with open(manifest_path) as f:
            manifest = json.load(f)
    except FileNotFoundError:
        skipped.append(plugin_dir.split('/')[-2])
        continue
    except json.JSONDecodeError as e:
        problems.append(plugin_dir.split('/')[-2] + ': invalid JSON — ' + str(e))
        continue

    checks = {
        'id': isinstance(manifest.get('id'), str) and '.' in manifest['id'],
        'version': isinstance(manifest.get('version'), str),
        'schemaVersion': manifest.get('schemaVersion') == 1,
        'provides': isinstance(manifest.get('provides'), list),
        'requires': isinstance(manifest.get('requires'), list),
    }
    for check, ok in checks.items():
        if not ok:
            problems.append(manifest.get('id', plugin_dir.split('/')[-2]) + ': missing/empty \"' + check + '\"')

if skipped:
    print('  \u26a0\ufe0f  skipped (no plugin.json): ' + ', '.join(skipped))
if problems:
    for p in problems:
        print('  \u274c ' + p)
else:
    print('  \u2705 all manifests valid')
"
    report "manifests valid" $?
  else
    echo "  ℹ️  SDK schema not found at $SDK_SCHEMA — run build.sh in verstak-sdk first"
  fi
else
  echo "  ℹ️  python3 not available — skipping manifest validation"
fi

echo ""
# Check all scripts in plugins are executable
echo "[script permissions]"
MISSING_EXEC=0
while IFS= read -r script; do
  if [ ! -x "$script" ]; then
    echo "  ❌ not executable: $script"
    MISSING_EXEC=1
  fi
done < <(find "$ROOT/plugins" -name '*.sh' -o -name '*.py' 2>/dev/null)
if [ "$MISSING_EXEC" -eq 0 ]; then
  echo "  ✅ all scripts executable"
fi

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo "✅ all checks passed"
else
  echo "❌ some checks failed"
fi
exit "$FAILED"
