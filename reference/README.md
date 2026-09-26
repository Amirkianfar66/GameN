# Existing Canvas source snapshot

`design-canvas/` preserves the existing Mothership Design Canvas and facilitator prototype source from clean commit `6930829f42d185751d21434bb3564d38b141f08f`. The existing published Site was observed at version 10. This transfer neither republishes that Site nor changes its database.

The snapshot is reference material for the new production game. It contains React, TypeScript, Vinext, React Flow and Cloudflare D1 code. Do not describe this as an implemented Firebase multiplayer service. Keep it outside the new root workspace/build globs unless deliberately migrating it in a separate task.

## Entry points

- `design-canvas/app/page.tsx`: editable node Canvas and JSON export.
- `design-canvas/app/api/board/route.ts`: D1 read/write, revision checks and seed migrations.
- `design-canvas/data/seed.ts` and `data/english.ts`: graph seed and English transformation.
- `design-canvas/app/playtest/page.tsx`: facilitator prototype.
- `design-canvas/public/mothership-location-board-v1.svg`: printable board.
- `design-canvas/package.json` and `pnpm-lock.yaml`: the snapshot's own toolchain, separate from the new game workspace.

## Export integrity and exclusions

[source-export-manifest.json](source-export-manifest.json) records all 121 tracked source paths and SHA-256 hashes. 119 are copied unchanged. Two tracked files are intentionally omitted:

1. `.openai/hosting.json`: live Site project binding. An unbound `hosting.example.json` retains the logical `DB` binding without linking this repository to the published Site.
2. `tsconfig.tsbuildinfo`: generated compiler cache.

The Git directory, dependency installation, local runtime state and credentials are not included. Third-party license files present in the source are retained. No new distribution license is granted by this export.

## Data coverage

Source seed data and all bundled rule overlays are included. The persisted `boards` row was observed at revision 3, updated `2026-09-26T01:30:24.797Z`, but the connector truncated its payload. A read-only request to the known board endpoint returned HTTP 403. No truncated JSON or reconstructed edit state is presented as a database backup.

If exact saved node text, connections and positions are needed, export JSON from the existing Canvas while signed in and hand that file to Codex. Inspect and reconcile it against confirmed source decisions before adoption. There is no automatic restore into the new Firebase game and no full database migration in this package.

## Running or migrating later

The snapshot declares Node `>=22.13.0` and pnpm `11.25.0`. Inspect its actual manifest/scripts rather than assuming its generic starter README matches every command. Its hosting plugin, auth middleware and D1 binding depend on the original platform. A portable runtime was not built or verified during this export.

When a later task needs to run it, configure an isolated local database and environment first. Do not copy production credentials or reconnect the new repository to the live Site merely to inspect the code. The new game follows the Firebase architecture and server authority contract documented at the repository root.
