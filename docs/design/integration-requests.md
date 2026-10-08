# Designer requests to Codex Integration

**From:** Visual and Motion Designer (issue [#4](https://github.com/Amirkianfar66/GameN/issues/4)). **For:** Codex Astra, Backend and Integration.
**Base:** `BASE_SHA` `333c9e820f362a211352bc689372663f29b73ac4`. **Date:** 6 October 2026; revised 7 October 2026 for the adoption of the comic board and for the two dependencies named in the review of that date.

Codex owns the root manifests, the lockfile, CI, the source lock, the workspace guard and the shared contracts. Designer has changed none of them. `npm run verify` passes on this branch exactly as it does on the base. This lists what Designer needs, in the order it needs it.

| ID | Request | Blocks | New dependencies |
| --- | --- | --- | --- |
| [DSN-REQ-1](#dsn-req-1) | Run the Designer tests and checks in `npm run verify` | CI coverage of everything in this PR | None |
| [DSN-REQ-2](#dsn-req-2) | Decide how design tokens 0.4.0 is adopted, and update the source lock for it | Frontend adopting the revision as *the* tokens | None |
| [DSN-REQ-3](#dsn-req-3) | Say how the four pinned Designer files are kept current | Keeping the brief and both directions current | None |
| [DSN-REQ-4](#dsn-req-4) | Contract facts the design is waiting for | Three finished pictures that nothing draws, and two planned markers | None |
| [DSN-REQ-5](#dsn-req-5) | Say how `apps/game` reaches `design/exports/`, and hold the loading rule there | Frontend loading any asset | None |
| [DSN-REQ-6](#dsn-req-6) | A player's name and chosen character as public facts of a seat, set before roles are dealt, carried by a new wire version or by a separately versioned identity record | Characters and names in a connected match. The rooms, their colors and the role devices wait for nothing | None |
| [DSN-REQ-7](#dsn-req-7) | A newer decision record that points at the owner's approval of 7 October 2026. The source-locked register is not to be edited for it | The current register and the design agreeing on what is approved | None |
| [DSN-REQ-8](#dsn-req-8) | Close a pending admission when setup starts, so a waiting phone learns it was not seated (issue #76) | `join.waiting-host` telling the truth after the host starts without that device | None |
| [DSN-REQ-9](#dsn-req-9) | Decide whether a join link or QR code may carry the room code (issue #76) | The share sheet's link and QR, which are drawn as a PROPOSAL | None |
| [DSN-REQ-10](#dsn-req-10) | A shorter, supervised way to hand a seat to another device than 43 characters plus a match identifier (finding G20; issue #76) | Seat recovery read aloud or typed at a table | None |
| [DSN-REQ-11](#dsn-req-11) | Say in the view that an election is a second one among tied candidates (G13), and which vote a published count belongs to (G15) (issue #76) | Wording the runoff and the “last count” without inference | None |

Nothing here installs anything. Every script Designer added uses Node built-ins only.

## DSN-REQ-1

**Run the Designer checks in `verify`. Needed now.**

`npm run verify` runs `tests/bootstrap` only. Designer's own package and directory now hold 66 tests and a 15-part check (52 and 13 in PR #45; 54 and 14 in PR #57). They pass locally and **do not run in CI** until the root script includes them.

Requested change to the root `package.json`:

```diff
+    "test:design": "npm run build && npm run test --workspace @mothership/design-tokens && npm run check:assets --workspace @mothership/design-tokens",
```

and `&& npm run test:design` at the end of `test` and of `verify`. It composes with Frontend's REQ-1, which adds `test:frontend` the same way.

That command line was run as written after a clean `npm ci` and passed. It needs no network, browser or credentials, and took 14 to 15 seconds on the development machine. It writes only to the system temporary directory, and removes what it wrote.

Two things to know before wiring it:

- **It checks that the committed review renders and browser reports are current.** `design/review/index.json`, `layout-check.json` and `shell-check.json` each record a hash of everything the review pages draw from (`design/prototypes/`, `design/exports/`, `design/studies/`, `design/contract/` and the 0.4.0 token file). Anyone who changes one of those without re-rendering will see `check:assets` fail and say which script to run. Those scripts need a Chromium-based browser, so they stay out of CI; CI only refuses stale results.
- **It does not run the browser checks.** `check:layout`, `check:shell`, `render:review` and `prove:checks` are deliberately not in it.

What it covers and what it cannot: [verification.md](verification.md).

`design/` is not a workspace and has no manifest. `scripts/check-workspace.mjs` needs no change: nothing under `packages/design-tokens/src/` imports anything, and the new file there is JSON.

## DSN-REQ-2

**Design tokens 0.4.0, and its lock update. Needed before Frontend treats 0.4.0 as the tokens.**

The pinned proposal is 0.2.0. `docs/bootstrap-source-lock.json` pins `docs/design/design-tokens.json`, and `scripts/check-sources.mjs` requires `packages/design-tokens/src/tokens.json` to be byte-identical to it. Both are untouched here.

0.4.0 is a new file beside them, `packages/design-tokens/src/tokens-0.4.0.json`, exported as `nextDesignTokens`. It carries what the owner approved on 7 October 2026: a color family for each of the five rooms, the colors of the nine characters, the caption yellow, and the times of the carried move and the role-card turn.

- **Over the pinned 0.2.0 it only adds.** Every 0.2.0 key keeps its name, shape and value, which a test and a check hold. `tests/bootstrap/presentation.test.mjs` reads the 0.2.0 export and still passes. No 0.2.0 motion total changed: the carried move is a new duration, and its time in the air is the 450 ms of `publicMove`.
- **Over 0.3.0 it changes one entry, and lists it.** 0.3.0 was the revision of PR #45, never pinned, and it said a location is never tinted to tell it apart. The owner approved rooms in color. 0.4.0 names that entry in `revisedFrom030`, with what it was and why; a test and a check refuse any other difference from 0.3.0, and a listed one that misquotes it. `tokens-0.3.0.json` stays in the package for that comparison and is no longer exported.

| File | SHA-256 |
| --- | --- |
| `docs/design/design-tokens.json` (0.2.0, pinned, unchanged) | `013e5e60d6ad255ca24a373f02a0095fb31cca17df39b6287315c225d70127e1` |
| `packages/design-tokens/src/tokens-0.4.0.json` (0.4.0, new) | `b8cabe6710de1d838dc5cbbe61ff3d1b4eb44115d0b3dfb9d89349d97cf35a3d` |
| `packages/design-tokens/src/tokens-0.3.0.json` (0.3.0, kept for comparison, unchanged) | `095f91a6cc5feb6cb5f0b9cf1c8ec299db16395c0f8436d8fee60ef80b357619` |

A check refuses this page if the first two hashes are not the files'.

Two ways to adopt it. Designer has no stake in which, and will not regenerate the lock either way.

- **A. Keep 0.2.0 frozen as the historical proposal** and add the 0.4.0 file to the lock as a second pinned source. Nothing that reads 0.2.0 changes. Frontend switches exports when it has reviewed the revision.
- **B. Replace 0.2.0 with 0.4.0** in both pinned places and update the lock entry, recording the reason and that no rule version is affected. `presentation.test.mjs` still passes, because every value it asserts is unchanged. Designer would then remove the second export and the 0.3.0 file in a follow-up.

Until one of these lands, 0.4.0 is a proposal that the reference stylesheets and review pages use and nothing else depends on.

Rule-version impact of either: none. Tokens carry no rule.

**One pinned value the approved direction runs into.** `motionPolicy.loops` is `false` in the pinned 0.2.0 tokens, and the approved page has motion that repeats while nothing happens (stars, lamps, a blink). 0.4.0 keeps `loops: false`, the reference stylesheets hold no such motion, and it is open decision [DSN-D16](README.md#open-decisions). Changing it is a change to a pinned value and would come as its own request.

## DSN-REQ-3

**The four pinned Designer files.**

The source lock pins `docs/design/art-direction.md`, `docs/design/motion-direction.md`, `docs/design/design-tokens.json` and `agents/designer.md`. All four are in or beside Designer's ownership; any edit fails `check:sources`. This is Frontend's REQ-6 again, for a different role.

They are left untouched, and three lines in them are now out of date:

- `motion-direction.md`: “no motion assets or runtime implementation are included yet”.
- `art-direction.md`: “No artwork, renderer benchmark or user approval is implied”, which is still true of approval and benchmarks, and no longer of artwork.
- `agents/designer.md`: “implementation branch/PR starts after the shared bootstrap”.

Requested: either a reviewed lock update when Designer proposes wording, or a statement that they are frozen as historical sources. Designer assumes the second, keeps status in [README.md](README.md), and records in [visual-interaction-contract.md](visual-interaction-contract.md#9-where-this-refines-the-art-direction) each place this work departs from the art direction and why.

## DSN-REQ-4

**Facts the design is waiting for. Not requests to change protocol 1.**

Each of these is specified and is drawn from nothing today, because the audience views at the base commit do not carry the fact. None should be inferred on the client. They are for the protocol review Frontend and Balance are already part of.

| Fact | What waits for it | Today |
| --- | --- | --- |
| That a seat's shot is spent, as distinct from never available | A spent card and the struck-out pip ([DSN-D02](README.md#open-decisions)) | Nothing is drawn as spent. A device reports once that its own registration is no longer pending, until the player presses Done; after that it shows what `self.shotAvailable` says |
| The server's own list of seats that may be targeted | Two finished rings and a dimmed token ([DSN-D03](README.md#open-decisions)) | Drawn by no rule. Target rows are Frontend's provisional same-location hint |
| A count of a resource | A number beside the pip | A pip with no number |
| A revealed faction per seat, at its permitted step | The one public use of a faction color, `marker-revealed-faction` | Not drawn. No public asset contains a faction color, and a check holds that |
| Whether a Captain is currently immune | Any immunity mark ([DSN-D10](README.md#open-decisions)) | The Captain marker is a rank star and the word “Captain” |
| The team of a role, in the seat's own view | The team word on a role card without a client-side table | All nine proposed cards take their team word from the rule sources through copy that is still to be reviewed, and a check holds each card to the team the rule source gives the role |
| A seat's display name and chosen character | The playing pieces and their tags ([DSN-REQ-6](#dsn-req-6)) | Every seat is a numbered token and “Player N” |

Designer read the draft protocol 2 on `codex/v1-pinned-frontend-integration` at `b731c97` for forward compatibility only and built nothing on it. As far as that reading goes: `legalTargets` and `revealedFaction` would supply the second and fourth rows; nothing there supplies the first. Under V1-17 of the owner-approved sheet on that branch, Protection and attack causes stay undisclosed, which would keep the two synthetic studies permanently out of a connected match. If any of that is misread, say so.

**The asset manifest version.** The exports are versioned `design-0.2.0` (`design-0.1.0` in PR #45). A check holds that it fits the `assetManifestVersion` field of both protocol 1 and that draft. The fixture pins `0.0.0-no-assets`; nothing here changes that.

## DSN-REQ-5

**How the application reaches the exports, and the rule it must keep when it does. Needed before Frontend loads any asset.**

`design/exports/` is plain files outside every workspace. `apps/game` may depend on `@mothership/design-tokens` but not on `design/`, and the workspace guard matches imports as whole specifiers.

Designer has no preference between these and has built neither:

- a bundler copies `design/exports/` as static files and the client loads each bundle's stylesheet by the path the manifest gives. No package change; the guard is not involved, because nothing is imported;
- or `@mothership/design-tokens` grows a reviewed subpath that re-exports the manifest, which needs the per-specifier allowlist Frontend's REQ-3 asks for.

Either way three things have to hold in the connected client. Designer holds them for its own review pages with `check:shell` and can help write the same watch against the real bundle when one exists:

1. **No request depends on a view.** A device loads each of its bundles whole, as one stylesheet, before its first match view: three on a phone, one on the table. A phone never asks for one role's picture, one pip or one icon by itself. [frontend-handoff.md](frontend-handoff.md#the-one-thing-to-read-first) says why.
2. **`design/studies/` is in no production bundle.** Every file there carries `mothership:dev-only`, the mark Frontend's production-exclusion check already looks for, so that check covers it once it runs over the built output.
3. **Nothing under `design/prototypes/` is shipped.** It is review tooling. Its modules carry the same mark. Its two reference stylesheets, `comic.css` and `cues.css`, do not: they are there for Frontend to take rules from.

## DSN-REQ-6

**A name and a character for each seat. Needed for characters and names in a connected match. The five rooms, their colors and the role devices need nothing new.**

On 7 October 2026 the owner approved playing pieces that are characters, nine to choose from, shown with the seat number and the player's name ([owner-decisions.md](owner-decisions.md)). Designer read every branch on the remote at that date and found no contract field for either: no display name, no nickname, no character or avatar, in the views, the host and admission documents or the lobby.

What the design needs, stated as facts and not as a schema:

| Fact | Audience | Set when | Notes |
| --- | --- | --- | --- |
| The name a seat is shown with | Public | In the lobby, by that seat's player | Live text, at most 12 characters (`component.seatTag.nameMaxLength`), treated as untrusted input wherever it is drawn. The seat number stays beside it: it is what the rules, the votes and the target lists call a player |
| The character a seat chose, one of nine | Public | In the lobby, by that seat's player, **before roles are dealt** | An id, `c1` to `c9`. One per seat in a match: the owner's V1 has at most nine players, and a character someone has taken is not offered. The choice must be independent of the role deal in both directions |

**The two dependencies the review of 7 October 2026 named, as Designer understands them. Both are Integration's to decide.**

1. **How the two facts travel.** Existing strict protocol-2 readers reject added fields, so the facts cannot simply be added to the views. Either a reviewed new wire version with active-match routing, or a separately versioned identity record beside the match views. The design is indifferent between them and needs only that every device of a match, the table display included, holds the same name and character for each seat before it draws that seat, and that neither changes during a match. Frontend and Game Balance are the consumers and review either.
2. **What Designer supplies to it.** A catalog, [`design/contract/crew-catalog.json`](../../design/contract/crew-catalog.json), version `crew-0.1.0`: the nine ids, the two exports that draw each (`piece-crew:standee-cN` for the board, `piece-crew:card-cN` for a row and for the player's own role card), their colors in the tokens, the proposed call signs, and the rules a character and a name must obey. It is a proposal and no shared contract; a contract that carries a character id would validate against the same nine ids. A check holds it to the manifest and the tokens, and refuses a catalog that gives a character a role, a team or a faction. All eighteen pictures are in the public bundle, which every device already loads whole: choosing or changing a character fetches nothing.

**What Frontend's client needs from the record** is in Frontend's comment on PR #57 of 7 October 2026: a listened public document per match; per seat a seat id, a display name and a character id from a catalog whose version the document names; set in the lobby and fixed at the start; uniqueness decided by the server; a fallback for a seat with neither; identity that stays with the seat through seat recovery; nothing of a role in it, in either direction. Designer agrees with each, and the catalog's rules say the same.

Until the facts exist, the design draws what it drew before them: a numbered token and “Player N”. Both looks are in the reference stylesheet, on a PROPOSED `data-character` attribute and PROPOSED name parts, and both are measured by `check:layout` ([frontend-handoff.md](frontend-handoff.md#names-and-characters)).

Three things the design depends on, whoever implements it:

1. **The character is never a function of the role, and the role is never a function of the character.** If a seat could choose after learning its role, a character could be used to signal one. No deal, rule, target list or renderer may read a character to decide anything.
2. **Where it falls in the order.** Approved decision V1-01 has each player choose Room A or Room B before roles are dealt. The owner's order for this is character, then the role deal. Designer assumes character and name, then the starting room, then roles ([DSN-D15](README.md#open-decisions)).
3. **Nothing of a role reaches a public fact.** The role's device is drawn only inside the seat's own private sheet. All nine devices travel in the role bundle to every phone, whatever its role; all nine characters travel in the public bundle to every device.

A name is a player's own text. A player may type a role's name as theirs. That is not a leak and no check should treat it as one; it is also not something any style, selector or rule may act on.

## DSN-REQ-7

**A newer decision record for the owner's approval. The source-locked register stays as it is.**

The review of 7 October 2026 is right that the original decision register is source-locked: its bytes are pinned, and Designer withdraws the earlier wording of this request, which asked for an entry in `docs/decisions.md`. **Designer has not edited the register and does not ask for its pinned bytes to change.**

Requested instead: a newer decision record, in whatever form Integration keeps current decisions, that points at [owner-decisions.md](owner-decisions.md) and says three things.

| What the record should say | Where it is |
| --- | --- |
| The owner approved the comic board as the design direction on 7 October 2026: five rooms in color, nine public characters with seat number and name, the role as a private device on the player's own character, at most nine players in Version 1 | [owner-decisions.md](owner-decisions.md), in the owner's words |
| It changes no rule and no contract. Character choice is independent of role assignment; role devices are private | The same page, “What the approval covers” |
| For the look of the board and of the pieces it supersedes two sentences of the pinned art direction, which Designer cannot edit ([DSN-REQ-3](#dsn-req-3)): that the public palette is charcoal, paper and muted steel, and that the public pieces are neutral numbered tokens. It leaves standing that no public piece, cue or location shows a role, a faction or a private choice | [visual-interaction-contract.md](visual-interaction-contract.md#9-where-this-refines-the-art-direction) |

The alternative the review allows, a reviewed lock update of the register itself, is Integration's choice and not Designer's request.

## DSN-REQ-8

**Close a pending admission when setup starts.** Added 8 October 2026 for issue [#76](https://github.com/Amirkianfar66/GameN/issues/76), on the design base `87715a46dbd6a107e417bb6024d81c3fcb679049`.

A phone that asked to join watches its own admission document. If the host fills every seat and starts setup without it, that document stays `pending` for good: the phone keeps saying “Waiting for the host to seat you.” and cannot read the lobby to learn otherwise. Requested: when `beginSetup` freezes the roster, mark every still-pending admission of the match with a terminal status (for example `closed`), which the requester may read, and let the phone say “This room started without you. Ask the host, or join another game.” This adds a value to the admission status: a contract change, for Integration to version and for Frontend and Balance to review. Until then the design draws only what is true today (`join.waiting-host`) and records the gap in the inventory.

## DSN-REQ-9

**Decide whether a join link or QR code may carry the room code.** Added 8 October 2026 for issue #76.

The share sheet (`host.share`) proposes Copy code (Frontend only), the platform share sheet, and a link or QR that opens Join with the code filled in, never submitted on its own. The room code is a joining credential while the lobby is open: in an address it is kept by browser history, logs, link previews and screenshots. Draft #41 already rules a recovery code out of links; the room code is weaker but not nothing. Requested: a decision, yes or no, and if yes, the form (a fragment such as `#room=…`, which is not sent to the server, rather than a query parameter). The prototype draws a labeled stand-in and no code.

## DSN-REQ-10

**A shorter, supervised seat hand-over.** Added 8 October 2026 for issue #76; this is Frontend's finding G20.

A recovery code is 43 characters and the new device also needs the match identifier. The design groups the code by four for reading aloud (`host.recovery`), which helps and does not solve it. Requested: a hand-over that works across a table, for example a short code of six to eight characters that expires within two minutes and that the host confirms on their own phone, or a code the new device shows and the host types. The property to keep is V1-21's: the old device loses the seat at the moment the new one takes it, and nothing is dealt again.

## DSN-REQ-11

**Say in the view what the screens now have to infer.** Added 8 October 2026 for issue #76; these are Frontend's findings G13 and G15.

- A Captain election held again among tied candidates has the same phase kind as the first. The design does not use the word “runoff” (`phase.election-again`) and shows the last count, “Nobody was elected.”, beside the new candidates. A field such as `ballot.round: 2` would let every screen say it plainly.
- The last published count stays in the view through later phases with nothing saying which vote it was. The design labels it “Last vote counted · Jail vote”. An identifier of the vote it counts, or its round, would let a screen say whether it is this round's.

Both are additive public facts. Neither changes a rule.

## What Designer does next, and what it waits for

| Next | Waits for |
| --- | --- |
| The comic page on a phone, with rooms that can be pressed and a hand of cards, as the approved page has it | The movement markup of protocol 2 on Frontend's side, and a reading path that survives large text ([DSN-D18](README.md#open-decisions)) |
| The cues for a dealt role card and for a room that is picked; the lobby step that sets a name and a character | The same, and [DSN-REQ-6](#dsn-req-6) |
| Wording of the nine role cards | Frontend, which said on PR #57 that it will draft them, for interface wording; the owner for rule statements ([DSN-D17](README.md#open-decisions)). Designer's lines are a draft offered to Frontend's, with their rule sources |
| Device review of the layouts with Frontend | Frontend's harness with the reference stylesheets, and named devices |
| Vote, Hack, Code, showdown, lobby and result | Their phases and facts in an adopted protocol, and an issue each |
| Sound | The owner's decision on DSN-D09 |
