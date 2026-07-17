---
title: Release Procedure
description: Versioning, quality gates, VSIX inspection, and Marketplace/Open VSX publication.
scope:
  - /scripts/**
  - /.github/workflows/**
  - /package.json
  - /apps/vscode/package.json
  - /packages/pi-rpc/package.json
updated: 2026-07-18
---

# Release Procedure

1. Set the product version with `pnpm version:set <version>` and update the root `CHANGELOG.md` only. `apps/vscode/package.json` is the only version source; private workspace manifests must not duplicate it. Packaging copies the root changelog into the extension package for the VSIX; do not maintain a second `apps/vscode/CHANGELOG.md` in git.
2. Confirm supported VS Code and Pi compatibility assumptions.
3. Run `pnpm install --frozen-lockfile`, `pnpm check`, and `node scripts/check-bundle-size.mjs`.
4. Run `pnpm package:vsix` and `pnpm verify:vsix`.
5. Install the versioned VSIX into clean local and remote Extension Development Hosts; exercise prompt, image, command, model, extension UI, stop, restore, diff, and failure paths.
6. Review README, screenshots, privacy, notices, and diagnostics for sensitive content.
7. Publish the exact verified artifact to VS Code Marketplace and Open VSX; do not rebuild between verification and publication.
8. Tag the matching commit and attach the VSIX plus source archive.

Publisher credentials belong in CI secret storage. The repository and extension package never contain tokens.
