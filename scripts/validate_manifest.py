#!/usr/bin/env python3
import json
import sys
from pathlib import Path

KNOWN_CONTRIBUTIONS = {
    "views",
    "commands",
    "settingsPanels",
    "sidebarItems",
    "fileActions",
    "noteActions",
    "contextMenuEntries",
    "searchProviders",
    "activityProviders",
    "worklogProviders",
    "overviewProviders",
    "statusBarItems",
    "openProviders",
    "workspaceItems",
}


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: validate_manifest.py <plugin.json>", file=sys.stderr)
        return 2

    path = Path(sys.argv[1])
    try:
        manifest = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"{path}: invalid JSON: {exc}", file=sys.stderr)
        return 1

    contributes = manifest.get("contributes", {})
    if contributes is None:
        contributes = {}
    if not isinstance(contributes, dict):
        print(f"{path}: contributes must be an object", file=sys.stderr)
        return 1

    unknown = sorted(set(contributes) - KNOWN_CONTRIBUTIONS)
    if unknown:
        print(
            f"{path}: unknown contribution point(s): {', '.join(unknown)}",
            file=sys.stderr,
        )
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
