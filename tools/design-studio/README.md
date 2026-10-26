# GameN Design Studio

The owner's design reference, hosted inside GameN at `/development/design-studio/` and linked from `/development/`. It contains the editable roles/aspects graph, Development Ideas, Winning Conditions and the selected reference library. Its decisions are design records; saving a board does not mutate the production ruleset or an active match.

## Source and boundaries

Imported from the actual GameN Studio source `9f5ac4f45589935fb2ed1027f0d54ebcd7017138`, formerly hosted on Sites. The source baseline displayed in imported cards is historical provenance. The integration base is `db65bb87f05983ff6861d27689ba1b7bab55d051`; its playable tuple is protocol 2 / `full-game-1.11.0` / `in-person-v1-hospital-four-2026-10-19` / `design-0.5.0`.

The four owner-confirmed event records were brought into this Studio on 25 October 2026. The latest [owner record](../../docs/design/owner-decisions-2026-10-25.md) and [navigation/Code overlay](../../rules/overlays/planet-navigation-code-owner-decisions-2026-10-25.json) replace the five-round ending with Y-route planet arrival. Automatic hidden-team A/B weights, Captain 2x, Officer tie choice and private direction-only confirmations determine one movement. Changing sides preserves depth. Alien needs Blackhole and survival at either planet.

The [26 October role-name decision](../../rules/overlays/role-names-owner-decision-2026-10-26.json) renames Soldier Blue to **Engineer** and Cracker to **Doctor**, without changing their mechanics. Current card text and references use the new names. Stable node IDs, archived records, historical source paths and immutable revisions retain their original identity.

Engineer remains the ninth Blue secret role, with no starting weapon. Its once-per-match Navigation Disruption fixes the opposite room occupants and suppresses only their navigation weight for that round; all ballots stay available. Code is the unordered player-number set for Undercover, Alien, Insider and Doctor. Alien no longer receives the full Code. Insider can derive it from the original unordered trio plus self. Hacker and Red Disabler know Undercover. Wrong Scan blocks the next round's Scan; correct final Code replaces Scan permanently with the once-use Hack Spaceship button. Unlocking and activation are separate. These records include explicit open action-cost, eligibility, confirmation, legacy-window and Blackhole integration questions.

Officer remains only the Captain-appointed public office. Historical removed-role, Vote Disruption, old victory and Final Showdown cards remain archived. Undercover alone starts armed, and nine players still means 5 Blue / 3 Red / 1 Alien. Current design records are labelled not implemented; this publication changes no gameplay ruleset.

The Hospital panel design adds a shared Public Action for patients: one code attempt per player per match, using Doctor's player number. Wrong codes spend only that attempt; correct codes reserve one of the two heals shared with Doctor and resolve at that round's Rescue stage. The Doctor, Rescue and Hospital cards show the same resource rule. The owner-confirmed Blackhole clarification gives each reality its own state for that shared healing pool: inherit the existing remainder at a branch, then keep only the selected reality's healing registrations/effects and reserved/spent inventory at Sync. There is no refill or combination of pools. The separately confirmed lifetime panel-attempt flag is global: a correct or incorrect attempt stays spent even when its reality is discarded at Sync. The broader Blackhole timing integration remains open. The Hospital card also adopts the already-confirmed four-bed overlay rather than its imported historical roster-sized capacity. These are design-reference updates, not a game-engine release.

`source-provenance.json` records private snapshot hashes. The source snapshot is available; the latest Sites database was not exported. Do not describe this as recovery of every remote manual edit or of the old revision history. Import JSON can preserve an additional owner export as a new board without replacing the migrated baseline.

The historical `reference/design-canvas/` directory is untouched. This tool has its own lockfiles and is deliberately outside the eight production workspace and CI source globs. Its client is built separately and never imported by the game client.

## Private data and access

- The public client contains the editor shell. The reference library, initial board, current seed and saved revisions are returned only by the authenticated API.
- `private-data/`, `data/` and the server's staged copies are ignored by Git. Do not add them to the public repository or Hosting output. Recover the private input files from the owner-controlled deployment/source archive, verify their recorded hashes and stage them with `scripts/prepare-server.mjs`.
- A separate named Firebase Auth app uses email-link sign-in. It cannot replace an anonymous game seat's identity. The server checks a non-anonymous, verified email against `STUDIO_OWNER_EMAIL` on every request. Missing configuration fails closed.
- Cloud records are scoped by the verified UID under `designStudioOwners/{uid}/boards/{boardId}`. Existing Firestore rules deny direct client reads and writes to this collection; the API uses Admin SDK access. No game Firestore rule change is needed.
- Explicit owner corrections in the private source bundle are adopted once when an older board is opened. Untouched source fields advance through the existing three-way merge. Confirmed role-name corrections also update those names in current customized card text and existing connection captions. Other owner text, node notes, proposals and positions remain. Retired role cards and their edges are archived. Normal saving creates a new revision, preserving all earlier revisions.
- Compressed immutable revisions use a transaction comparing the expected head revision. Conflicts preserve the browser draft and offer export/save-as. Existing revisions are never overwritten. Browser drafts are namespaced by designer UID.
- Existing Firebase Auth App Check enforcement is preserved. The named Studio app initializes the existing reCAPTCHA Enterprise provider, and API requests also require valid App Check attestation. The API only accepts the configured same origin for writes, bounded JSON and validated board schemas. It returns no private data before authorization. There is no production preview-auth bypass.

## Build and release

Use Node `22.21.1` and npm `10.9.4`.

```sh
npm ci --prefix tools/design-studio
npm run typecheck --prefix tools/design-studio
npm run build --prefix tools/design-studio
npm ci --prefix tools/design-studio/server
node tools/design-studio/scripts/prepare-server.mjs
```

The server's ignored `.env.PROJECT_ID` supplies `STUDIO_OWNER_EMAIL` and `STUDIO_ORIGIN`. Preserve the existing owner audience. Email-link authentication requires `signIn.email.enabled=true` and `passwordRequired=false`; preserve anonymous sign-in and authorized domains for the game. Do not print complete Auth configuration responses: they can contain password-hashing secrets.

Deploy only the separate `gamen-design-studio` codebase, then build/deploy Hosting with the existing `scripts/prepare-hosted-preview.mjs PUBLIC_CONFIG_JSON` workflow. That script includes the Studio and narrow API/SPA rewrites, so a later Hosting publication does not accidentally remove Development. It does not package private server data into Hosting. Use an explicit project and the existing authorized Firebase CLI account. No game Functions, IAM roles, Firestore rules or gameplay profiles need redeployment.

```sh
firebase deploy --only functions:gamen-design-studio --config tools/design-studio/server/firebase.json --project PROJECT_ID --account OWNER_ACCOUNT
npm run build
node scripts/prepare-hosted-preview.mjs PUBLIC_CONFIG_JSON
firebase deploy --only hosting --config dist/firebase-hosting.json --project PROJECT_ID --account OWNER_ACCOUNT
```

The Studio API runs at zero minimum instances and at most two instances. Private API responses are never cached. Hosting and API can be rolled back independently; retain the matching source/data hashes and existing revision documents.

## Verification scope

The owner requested no automated game tests for this design analysis. Use builds, typechecking and direct manual browser/access/storage checks; record what was actually observed. A local preview uses separate loopback-only memory storage and does not prove authenticated cloud saving. The owner must complete their own emailed sign-in link; never put that code into a log or repository.
