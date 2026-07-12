# Verstak Official Plugins

The first-party plugin set for Verstak Desktop: Files, Trash, Notes, editor and
preview providers, Browser Inbox, Activity, Journal, Todo, Search, Secrets and
Templates. Plugin bundles are built into independent directories that the
desktop host loads from its `plugins/` folder.

> **Alpha software.** Build this repository together with compatible
> `verstak-desktop` and `verstak-sdk` checkouts.

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

## Alpha behaviour

- Browser Inbox archives processed captures and can restore them; permanent
  deletion is a separate action.
- Saving a browser link creates a collision-safe `.url` file. Opening a link is
  handled by Verstak, so it does not depend on a Linux `.url` file association.
- Activity sessions can be scoped to a durable workspace identity or to an
  explicit unassigned scope. Journal creation is always a user action.
- Todo is optional: Overview uses it only when the Todo capability is present.

## Release package

```bash
./scripts/release.sh v0.1.0-alpha.1
```

The command rebuilds all packages and writes
`release/verstak-official-plugins-<version>.tar.gz` plus `SHA256SUMS`.

## License

Copyright © 2026 Verstak contributors. Licensed under
[GNU AGPLv3 or later](LICENSE).
