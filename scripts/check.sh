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
    set +e
    python3 -c "
import json, glob, os, sys
from jsonschema import Draft202012Validator

skipped = []
problems = []

with open('$SDK_SCHEMA') as f:
    schema = json.load(f)

validator = Draft202012Validator(schema)

for plugin_dir in glob.glob('$ROOT/plugins/*/'):
    manifest_path = plugin_dir + 'plugin.json'
    plugin_name = os.path.basename(os.path.dirname(manifest_path))
    try:
        with open(manifest_path) as f:
            manifest = json.load(f)
    except FileNotFoundError:
        skipped.append(plugin_name)
        continue
    except json.JSONDecodeError as e:
        problems.append(plugin_name + ': invalid JSON - ' + str(e))
        continue

    for err in sorted(validator.iter_errors(manifest), key=lambda e: list(e.path)):
        where = '.'.join(str(part) for part in err.path) or '<root>'
        problems.append(manifest.get('id', plugin_name) + ': ' + where + ': ' + err.message)
    for field in ('requires', 'optionalRequires'):
        if 'verstak/core/notes/v1' in manifest.get(field, []):
            problems.append(manifest.get('id', plugin_name) + ': ' + field + ': core notes capability is not part of v2 platform contract')

if skipped:
    print('  warning: skipped (no plugin.json): ' + ', '.join(skipped))
if problems:
    for p in problems:
        print('  FAIL ' + p)
    sys.exit(1)
else:
    print('  OK all manifests valid')
"
    STATUS=$?
    set -e
    report "manifests valid" "$STATUS"
  else
    echo "  ℹ️  SDK schema not found at $SDK_SCHEMA — run build.sh in verstak-sdk first"
  fi
else
  echo "  ℹ️  python3 not available — skipping manifest validation"
fi

echo ""
# Guard official plugins against bypassing the v2 plugin API for note features.
echo "[frontend API boundary]"
if [ "$HAS_PYTHON" -eq 1 ]; then
  set +e
  python3 -c "
import os, re, sys

root = '$ROOT/plugins'
forbidden = re.compile(r\"api\\.backend\\.call|api\\.request\\.open|window(?:\\.go|\\[['\\\"]go['\\\"]\\])|Notes/Overview\\.md\")
problems = []

for dirpath, _, filenames in os.walk(root):
    normalized_dir = dirpath.replace(os.sep, '/')
    if '/node_modules' in normalized_dir or '/frontend/dist' in normalized_dir:
        continue
    for filename in filenames:
        if not filename.endswith(('.js', '.svelte', '.ts')):
            continue
        path = os.path.join(dirpath, filename)
        with open(path, encoding='utf-8') as f:
            for lineno, line in enumerate(f, 1):
                if forbidden.search(line):
                    problems.append(f'{os.path.relpath(path, \"$ROOT\")}:{lineno}: {line.strip()}')

if problems:
    for p in problems:
        print('  FAIL ' + p)
    sys.exit(1)
print('  OK official plugins use public VerstakPluginAPI only')
"
  STATUS=$?
  set -e
  report "frontend API boundary" "$STATUS"
else
  echo "  ⚠️  python3 not available — skipping frontend API boundary"
fi

echo ""
# Keep Files plugin as a raw file explorer; note workflows belong to Notes.
echo "[files plugin note boundaries]"
if [ "$HAS_PYTHON" -eq 1 ]; then
  set +e
  python3 -c "
import os, re, sys

path = '$ROOT/plugins/files/frontend/src/index.js'
forbidden = re.compile(r'createNoteInFolder|ensureOverviewInFolder|Create Note|Open Overview')
problems = []

with open(path, encoding='utf-8') as f:
    for lineno, line in enumerate(f, 1):
        if forbidden.search(line):
            problems.append(f'{os.path.relpath(path, \"$ROOT\")}:{lineno}: {line.strip()}')

if problems:
    for p in problems:
        print('  FAIL ' + p)
    sys.exit(1)
print('  OK files plugin has no note creation or overview actions')
"
  STATUS=$?
  set -e
  report "files plugin note boundaries" "$STATUS"
else
  echo "  ⚠️  python3 not available — skipping files plugin note boundaries"
fi

echo ""
# Ensure source manifests do not require ignored dist files for plain JS plugins.
echo "[frontend entry source contract]"
if [ "$HAS_PYTHON" -eq 1 ]; then
  set +e
  python3 -c "
import json, os, sys

root = '$ROOT/plugins'
problems = []

for plugin_name in sorted(os.listdir(root)):
    plugin_dir = os.path.join(root, plugin_name)
    manifest_path = os.path.join(plugin_dir, 'plugin.json')
    if not os.path.isfile(manifest_path):
        continue
    with open(manifest_path, encoding='utf-8') as f:
        manifest = json.load(f)
    frontend = manifest.get('frontend') or {}
    entry = frontend.get('entry')
    if not entry:
        continue
    entry_path = os.path.join(plugin_dir, entry)
    has_build_step = os.path.isfile(os.path.join(plugin_dir, 'frontend', 'package.json'))
    has_plain_source = os.path.isfile(os.path.join(plugin_dir, 'frontend', 'src', 'index.js'))
    if has_build_step:
        if entry != 'frontend/dist/index.js':
            problems.append(f'{plugin_name}: build frontend entry must be frontend/dist/index.js, got {entry}')
        continue
    if has_plain_source and entry != 'frontend/src/index.js':
        problems.append(f'{plugin_name}: plain JS frontend entry must be frontend/src/index.js, got {entry}')
        continue
    if not os.path.isfile(entry_path):
        problems.append(f'{plugin_name}: frontend entry does not exist: {entry}')

if problems:
    for p in problems:
        print('  FAIL ' + p)
    sys.exit(1)
print('  OK source manifests reference tracked frontend entries')
"
  STATUS=$?
  set -e
  report "frontend entry source contract" "$STATUS"
else
  echo "  ⚠️  python3 not available — skipping frontend entry source contract"
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
  node "$ROOT/scripts/smoke-notes-plugin.js"
  report "notes frontend behavior" $?
  node "$ROOT/scripts/smoke-file-preview-plugin.js"
  report "file-preview frontend behavior" $?
  node "$ROOT/scripts/smoke-files-plugin.js"
  report "files frontend behavior" $?
  node "$ROOT/scripts/smoke-activity-plugin.js"
  report "activity frontend behavior" $?
  node "$ROOT/scripts/smoke-browser-inbox-plugin.js"
  report "browser inbox frontend behavior" $?
  node "$ROOT/scripts/smoke-search-plugin.js"
  report "search frontend behavior" $?
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
      if [ -f "$plugin_dir/frontend/package.json" ]; then
        echo "  ⚠️  $plugin_id: bundle not built at $entry — run scripts/build.sh for packaged frontend smoke"
        continue
      fi
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
