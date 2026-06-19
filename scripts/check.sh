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
echo "[frontend smoke]"
if command -v node &>/dev/null; then
  node "$ROOT/scripts/smoke-platform-frontend.js"
  report "platform-test frontend components mount" $?
else
  echo "  ⚠️  node not available — skipping frontend smoke"
fi

echo ""
echo "[frontend bundle execution]"
if command -v node &>/dev/null; then
  BUNDLE_FAILED=0
  for plugin_dir in "$ROOT"/plugins/*/; do
    plugin_id=$(basename "$plugin_dir")
    manifest="$plugin_dir/plugin.json"
    if [ ! -f "$manifest" ]; then continue; fi
    # Check if plugin has frontend entry
    entry=$(node -e "const m=require('$manifest');console.log(m.frontend&&m.frontend.entry||'')" 2>/dev/null)
    if [ -z "$entry" ]; then continue; fi
    bundle="$plugin_dir$entry"
    if [ ! -f "$bundle" ]; then
      echo "  ❌ $plugin_id: bundle not found at $entry"
      BUNDLE_FAILED=1
      continue
    fi
    # Execute bundle via new Function() and verify registration
    node -e "
      const fs = require('fs');
      const content = fs.readFileSync('$bundle', 'utf8');
      // Provide minimal globals
      global.window = { VerstakPluginRegister: function(id, def) { global.__registered = id; } };
      global.document = { getElementById: function() { return null; }, createElement: function() { return { style: {}, setAttribute: function(){}, appendChild: function(){} }; }, head: { appendChild: function(){} } };
      try {
        new Function(content)();
        if (!global.__registered) {
          console.log('ERROR: plugin did not call VerstakPluginRegister');
          process.exit(1);
        }
        console.log('OK: ' + global.__registered);
      } catch(e) {
        console.log('ERROR: ' + e.message);
        process.exit(1);
      }
    " 2>&1 | while read -r line; do
      if [[ "$line" == ERROR:* ]]; then
        echo "  ❌ $plugin_id: ${line#ERROR: }"
        BUNDLE_FAILED=1
      elif [[ "$line" == OK:* ]]; then
        echo "  ✅ $plugin_id: ${line#OK: }"
      fi
    done
  done
  if [ "$BUNDLE_FAILED" -ne 0 ]; then
    FAILED=1
  fi
else
  echo "  ⚠️  node not available — skipping bundle execution"
fi

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo "✅ all checks passed"
else
  echo "❌ some checks failed"
fi
exit "$FAILED"
