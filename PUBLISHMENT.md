## Publish a package to npm (monorepo)

This guide describes how to publish `packages/vs3` to npm, and how to automate
the process in this monorepo.

### 1) Prerequisites

- npm account (with 2FA if required for your org)
- access to the `vs3` package name on npm
- a valid npm auth token (for CI automation)
- `pnpm` available via Corepack (repo uses `pnpm@10.28.1`)

### 2) Pre-publish checklist (local)

- Ensure `packages/vs3` builds to `dist` and exports match emitted types
- Confirm package metadata (`name`, `version`, `license`, `repository`) is correct
- Validate the package contents with `npm pack`
- Run tests and typechecks for the package

Example commands:

```
pnpm -w install
pnpm -w run test:ci
pnpm -w run typecheck
pnpm -w run build:ci
pnpm -C packages/vs3 run build
pnpm -C packages/vs3 pack
```

### 3) Versioning

- Bump `packages/vs3` version before publishing
- Use semver rules (`major.minor.patch`)
- Keep `CHANGELOG.md` in sync with public changes

Example:

```
pnpm -C packages/vs3 version patch
```

### 4) Publish (manual)

```
pnpm -C packages/vs3 publish --access public
```

Notes:
- If 2FA is enabled, npm will prompt for an OTP
- Prefer publishing from a clean working tree
- Use `--tag next` for pre-releases, then move to `latest` later

### 5) Post-publish verification

- Confirm `npm view vs3` shows the new version
- Validate install and imports in a scratch project
- Smoke-test common imports:
  - `import { createStorage } from "vs3"`
  - `import { useUpload } from "vs3/react"`

## Automation in this monorepo

Yes, you can automate publishing. Two common options:

### Option A) GitHub Actions with npm token

- Create an npm automation token with publish scope
- Add it to repo secrets as `NPM_TOKEN`
- Use a CI workflow that:
  - installs dependencies
  - runs tests/typecheck/build
  - publishes `packages/vs3` when a release tag is pushed

This keeps publish credentials out of local machines and ensures consistent
builds.

### Option B) Changesets (recommended for monorepos)

- Changesets manages version bumps and changelogs
- A release workflow publishes only packages that changed
- Works well with pnpm workspaces and Turbo

This is best if you plan to add more packages later.

## Repository-specific TODOs

Base publish requirements:
- [x] Add a package-level `README.md` under `packages/vs3`.
- [x] Fix `exports` type paths to match emitted declarations (avoid missing `.d.cts`).
- [x] Add a publish lifecycle hook (`prepack` or `prepublishOnly`) to build `dist`.

Optimizations beyond base requirements:
- [x] Expose `./package.json` in `exports` for strict ESM tooling.
- [x] Add per-adapter subpath exports (e.g. `./adapters/aws-s3`) to tighten import surface.
- [x] Add a `typesVersions` map for improved subpath typing support in older TS setups.
- [x] Add CI checks for bundle size and accidental dependency bundling.
- [x] Add ESM/CJS fixture tests to verify `exports` resolution.
