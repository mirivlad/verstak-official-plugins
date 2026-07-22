<div align="center">

# Verstak Official Plugins

### The first-party plugin set — Files, Notes, Editor, Activity, Journal and more.

**English** · [Русский](README.ru.md)

[![Release](https://img.shields.io/github/v/release/mirivlad/verstak-official-plugins?include_prereleases\&label=release)](https://github.com/mirivlad/verstak-official-plugins/releases)
![Status](https://img.shields.io/badge/status-alpha-orange)
[![License](https://img.shields.io/github/license/mirivlad/verstak-official-plugins)](LICENSE)

</div>

> **Alpha software.** Build this repository together with compatible
> `verstak-desktop` and `verstak-sdk` checkouts.

Verstak Official Plugins is the first-party plugin set for Verstak Desktop:
Files, Trash, Notes, Default Editor, File Preview, Browser Inbox, Activity,
Journal, Todo, Search, Secrets, Sync, Import, and Templates. The Import plugin
reviews and converts current DokuWiki or Obsidian content before creating a
separate `Imported` tree. Plugin bundles are built
into independent directories that the desktop host loads from its `plugins/`
folder.

## Build

Requirements: Node.js with npm, Go and Python 3. Keep this repository next to
`verstak-sdk` so manifest validation can use the SDK schema.

```bash
npm --version
go version
./scripts/check.sh
./scripts/build.sh
```

The build creates `dist/<plugin-id>/` packages. To install them into a sibling
desktop checkout:

```bash
cd ../verstak-desktop
./scripts/install-dev-plugins.sh
```

## Portable plugin archives

Build target-specific archives on Linux:

```bash
sudo apt install gcc-mingw-w64-x86-64
./scripts/package-portable.sh v0.1.0-alpha.1
```

The command creates `release/verstak-official-plugins-linux-amd64-<version>.tar.gz`
and `release/verstak-official-plugins-windows-amd64-<version>.zip`, plus
`SHA256SUMS`. Each archive expands directly into the desktop application's
`plugins/` directory. Frontends and manifests are shared; native Go sidecars
are built for the target OS. This is a local package operation and does not
create a GitHub Release.

## Alpha behaviour

- Browser Inbox archives processed captures and can restore them; permanent
  deletion is a separate action.
- Saving a browser link creates a collision-safe `.url` file. Opening a link is
  handled by Verstak, so it does not depend on a Linux `.url` file association.
- Activity sessions can be scoped to a durable Deal identity or to an
  explicit unassigned scope. Journal creation is always a user action.
- Todo is optional: Overview uses it only when the Todo capability is present.

## Publish a GitHub Release

```bash
./scripts/publish-github-release.sh v0.1.0-alpha.1
```

The publisher requires an authenticated [`gh`](https://cli.github.com/) CLI
and a clean, up-to-date `main`. It runs the local release command, creates and
pushes an annotated tag if necessary, then creates or updates the GitHub
Release with the Linux archive, Windows archive and `SHA256SUMS`. Alpha, beta
and release-candidate tags are published as prereleases; stable tags are
marked latest. Re-running it for a tag that points at the current commit
replaces the release assets.

## License

Copyright © 2026 Verstak contributors. Licensed under
[GNU AGPLv3 or later](LICENSE).
