---
title: Release Procedure
description: Versioning, quality gates, VSIX inspection, and Marketplace/Open VSX publication.
scope:
  - /scripts/**
  - /.github/workflows/**
  - /apps/vscode/package.json
updated: 2026-07-16
---

# Release Procedure

1. Update version in root/app/package metadata and `CHANGELOG.md`.
2. Confirm supported VS Code and Pi compatibility assumptions.
3. Run `pnpm install --frozen-lockfile`, `pnpm check`, and `node scripts/check-bundle-size.mjs`.
4. Run `pnpm package:vsix` and `pnpm verify:vsix`.
5. Install the versioned VSIX into clean local and remote Extension Development Hosts; exercise prompt, image, command, model, extension UI, stop, restore, diff, and failure paths.
6. Review README, screenshots, privacy, notices, and diagnostics for sensitive content.
7. Publish the exact verified artifact to VS Code Marketplace and Open VSX; do not rebuild between verification and publication.
8. Tag the matching commit and attach the VSIX plus source archive.

Publisher credentials belong in CI secret storage. The repository and extension package never contain tokens.
