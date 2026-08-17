from pathlib import Path

path = Path("scripts/build.sh")
text = path.read_text()
old = """    if python3 -c \"import json; json.load(open('$plugin_dir/plugin.json'))\" 2>/dev/null; then
      echo \"  ✅ plugin.json: valid JSON\"
    else
      echo \"  ❌ plugin.json: invalid JSON\"
      FAILED=1
      FAILED_PLUGINS=\"$FAILED_PLUGINS $plugin_name\"
      continue
    fi
"""
new = """    if python3 -c \"import json; json.load(open('$plugin_dir/plugin.json'))\" 2>/dev/null; then
      echo \"  ✅ plugin.json: valid JSON\"
    else
      echo \"  ❌ plugin.json: invalid JSON\"
      FAILED=1
      FAILED_PLUGINS=\"$FAILED_PLUGINS $plugin_name\"
      continue
    fi
    if python3 \"$ROOT/scripts/validate_manifest.py\" \"$plugin_dir/plugin.json\"; then
      echo \"  ✅ plugin.json: supported contributions\"
    else
      echo \"  ❌ plugin.json: unsupported contribution contract\"
      FAILED=1
      FAILED_PLUGINS=\"$FAILED_PLUGINS $plugin_name\"
      continue
    fi
"""
if text.count(old) != 1:
    raise SystemExit(f"build manifest validation anchor count: {text.count(old)}")
path.write_text(text.replace(old, new, 1))
