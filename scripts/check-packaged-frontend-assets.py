#!/usr/bin/env python3
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"


def package_path(package: Path, relative: str) -> Path:
    target = (package / relative).resolve()
    package_root = package.resolve()
    if target != package_root and package_root not in target.parents:
        raise ValueError(f"path escapes package: {relative}")
    return target


def main() -> int:
    if not DIST.is_dir():
        print("dist/ is missing; run scripts/build.sh first", file=sys.stderr)
        return 1

    problems: list[str] = []
    checked = 0

    for package in sorted(path for path in DIST.iterdir() if path.is_dir()):
        manifest_path = package / "plugin.json"
        if not manifest_path.is_file():
            problems.append(f"{package.name}: packaged plugin.json is missing")
            continue

        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            problems.append(f"{package.name}: invalid packaged plugin.json: {exc}")
            continue

        frontend = manifest.get("frontend") or {}
        entry = frontend.get("entry")
        style = frontend.get("style")

        for label, relative in (("entry", entry), ("style", style)):
            if not relative:
                continue
            try:
                target = package_path(package, relative)
            except ValueError as exc:
                problems.append(f"{package.name}: frontend.{label} {exc}")
                continue
            if not target.is_file():
                problems.append(
                    f"{package.name}: frontend.{label} does not exist in package: {relative}"
                )

        frontend_dist = package / "frontend" / "dist"
        css_files = []
        if frontend_dist.is_dir():
            css_files = sorted(
                path.relative_to(package).as_posix()
                for path in frontend_dist.rglob("*.css")
                if path.is_file()
            )

        if css_files and not style:
            problems.append(
                f"{package.name}: packaged frontend contains CSS but manifest has no frontend.style: "
                + ", ".join(css_files)
            )

        checked += 1

    if problems:
        for problem in problems:
            print(f"FAIL {problem}")
        return 1

    print(f"OK packaged frontend assets for {checked} plugin(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
