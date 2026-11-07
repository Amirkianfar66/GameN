> **Published on 14 October 2026, unchanged.** Below this note is the Designer's review and production plan of 13 October 2026 as it was sent to the owner, byte for byte: `tail -n +3` of this file has SHA-256 `684b6275b6e2c58208eae4c9df695e690422efac7a646120a991fed6c7e6597a`. It was written before the specification packet could be read, so later records supersede parts of it: [motion-spec-crosswalk.md](motion-spec-crosswalk.md) maps its C-notes to the packet, [owner-decisions.md](owner-decisions.md) records what the owner decided, and each step's own doc says what was built. Its storyboard numbers S1 to S15 and its production plan are the ones [deliverables.md](deliverables.md) uses. Every event, field and module name in it was a proposal.

# GameN / Mothership: Designer review and production plan for the owner's motion specification

From the Visual and Motion Designer (Claude Code), 13 October 2026.

**Scope:** review and planning only. No artwork, source code, commits, merges, deployments or messages to other sessions were made for this review.

**Proposals:** every event name, field name and module name below is a proposal until Backend and Integration accept it. No coordination or acceptance has happened yet.

---

## Summary

- **I could not read the six-file specification packet.**
  - It is not in this container.
  - Its branch, `codex/owner-motion-spec-2026-10-13`, is not on the remote.
  - It was not attached to the message.
  - I read the complete creative brief (sections 1–17), your notes (Owner Response 1–10) and the repository's own records and sources.
  - So I cannot cite the specification's G/Q numbers. Each contradiction below cites the brief section and the repository record it conflicts with, for the coordinator to map onto G/Q in one pass.
- **One finding blocks implementation: Blackout needs authoritative slot IDs.**
  - Today, Designer's `layout.js` and Frontend's `stations.ts` compute places from current occupancy. They move people when someone enters or leaves.
  - Backend recorded on #96 that stable places with fresh-client agreement "would need separately reviewed authoritative state". Memory targeting needs exactly that.
  - Minimal fix: one public, stored `slotId` per on-board seat, assigned on entry and never reflowed.
- **The other conflicts are older confirmed records that the latest owner decisions supersede.**
  - The records: Hospital capacity of five, Injured prisoners kept in Jail, the Final Zone, the release vote, secret Protection, a private Hack partner and the turn-time Disable.
  - Each resolves by precedence, but Backend needs a new ruleset tuple before Frontend can integrate it.
- **The existing art carries over almost completely.**
  - Kept unchanged: the nine characters, the rig, the 27 gestures, the walk and hit animations, the wardrobe, Rooms A and B, the Command Room, the Jail, the phone shell, the vote result, the Hack claim, the Insider board and the ability strips.
  - New work: a 7/8/9-berth Hospital ward, a Chamber scene, the Command console, Jail door/airlock overlays, lighting states, a set of effects and new gestures. All are additive modules; no pinned file changes.
- **No owner question is needed.** The one discrepancy on an approved mechanic, the Clone duration, has a clear precedence answer for the coordinator to confirm against the decision register.

---

## 1. Repository, worktree, branch and HEAD

| Item | Actual value |
| --- | --- |
| Repository | `Amirkianfar66/GameN` |
| Worktree used for this review | `/home/user/GameN-worktrees/designer-phone-polish` |
| Branch / HEAD | `claude/designer-phone-polish` @ `5c9a1510d35d4b9762f9bc2a27dae3f5d53bd5d7`, equal to `origin`, working tree clean. This is draft PR #127 (#121). |
| Relation to the specification basis | Based on `codex/v1-ability-art-release` @ `abb6839524b6dc3e5225e600f2f067c3fa3f9501`, the specification's source basis. `git diff --name-only abb6839..HEAD` lists 769 files, all under `design/`, `docs/design/` and `packages/design-tokens/`. No shared, runtime or other-role file differs from the basis. |
| `main` | `b9d9334` (bootstrap record). `abb6839` is not in `main`; the work lives on integration branches. |
| Specification branch | `codex/owner-motion-spec-2026-10-13` is not among the remote's 83 heads. The specification files exist only on the coordinator's Mac. |

**Preserved local work.** None of it was touched in this review. Every branch matches its remote SHA.

| Path | Branch @ HEAD | What it is |
| --- | --- | --- |
| `/home/user/GameN` (primary checkout) | `claude/brave-cannon-lmhd0i` @ `87ac254` | Phone-first V1 journey (#76): host, join, lobby, setup and game states |
| `…/designer-ability-art` through `-7` | `1453500`, `022ae5b`, `3ec88ea`, `1a52f56`, `a3379d1`, `1e2f491`, `8f1f356` | Ability-art slices 1–7 (Insider board, files, strips, showdown, failure states) |
| `…/designer-ability-art-8` | `claude/designer-ability-art-8` @ `27be874` | Draft PR #116: character selection and role-card reveal (slice 8). Kept separate. |
| `…/designer-board-motion` | `codex/designer-board-motion` @ `0840939` | Board-motion scenes, figures and gestures |
| `…/designer-phone-polish` | as above | PR #127: phone shell, five-second vote result, room clothes, private Hack, and the review fixes `3784057` and `5c9a151` |
| Scratchpad `trial-merge` | detached @ `27be874` | Scratch verification tree, not a deliverable |

The historical Canvas snapshot (`reference/design-canvas/`) and the original artwork under `design/source/` were read only.

---

## 2. What I read: confirmation and limits

**Not read: the consolidated specification** (README.md, game-design.md, rules-contracts.md, motion-requirements.md, decision-register.md, motion-storyboards.md).

- The coordinator's path does not exist in this container.
- The branch is not on the remote, and the files are uncommitted additions in any case.
- No packet was attached; the message carried text only.
- A search of this disk, and a search of the repository's GitHub issues, found nothing.

I cannot confirm that I read the complete specification, and I don't claim to.

**Read in full:**

- **The creative brief**, sections 1–17.
- **Your notes**, Owner Response 1–10, including the second copy of section 7 and the separately formatted sections 8–10.

**Repository instructions:**

- `CODEX_START_HERE.md`, `AGENTS.md`, `CLAUDE.md`, `docs/project-context.md`, `docs/architecture/rendering-direction.md` and `agents/designer.md`.

**Decision records and rules:**

- Registers and decisions:
  - `docs/decisions.md` and `docs/backend/v1-decision-register.md`.
  - `docs/backend/v1-rule-decisions-proposal.md` (V1-01–V1-21).
  - `docs/decisions/` records: crew identity, compact phone UI, Pass, random starting rooms, room capacity.
- Capacity: `docs/backend/capacity-resolution.md` and `docs/backend/room-capacity.md`.
- Design: `docs/design/owner-decisions.md`.
- Overlays: `rules/overlays/location-board-layout-v1.json` and the two capacity overlays.

**Contracts and engine:**

- Contracts, read only to locate conflicts: `packages/contracts/src/full-game.ts` and `views.ts`.
- Engine, read only to locate conflicts: `packages/engine/src/full-game/placement.ts` and `lifecycle.ts`.

**Other roles' reviews:**

- `docs/backend/board-motion-contract-review.md`.
- Frontend's `docs/frontend/claude-phone-kit-adoption-proposal.json` at `bc92e58`, which references `ca78625`.
- `docs/frontend/scene-drawing-provenance.json` and `design/tools/lib/reviewed-drawing-ports.json`.
- Issue #115 (named-file approval of drawing ports, no directory exemption).

**Design sources inspected:**

- `design/board-motion/figures/`: body, rig, parts, crew, gestures, motion, wardrobe.
- `design/board-motion/scenes/`: index, frame, kit, compose and all five rooms.
- `design/board-motion/js/`: `layout.js` and `dress.js`; the cue timings in `director.js`.
- Contracts: `design/board-motion/contract/cues.json` and `design/contract/motion-cues.json`.
- Ability art: `design/abilities/contract/abilities.json` (24 treatments) and its asset list.
- Phone kit: `design/phone-kit/source/art.mjs`, `js/hack.js` and `js/vote-result.js`.
- Exports: `design/exports/asset-manifest.json` (design-0.2.0, 35 assets).
- Tokens: `packages/design-tokens/src/tokens-0.4.0.json`.
- Setup art: PR #116's file list.

**What follows from not reading the packet:**

- Where the brief is less specific than the specification probably is, I label proposals; this covers exact checkpoints, event names and eligibility edges.
- If the specification differs from the brief, the specification wins.
- Work package A0 (section 6) is a reconciliation pass to run as soon as the packet is readable here. Pushing the specification branch, or pasting the six files, is enough.

**Precedence applied:**

1. The latest owner decisions: the brief and your notes. The brief's "Latest gameplay decisions" are the later text.
2. Confirmed overlays.
3. v2.1.
4. Prototype defaults.

---

## 3. Contradictions and minimal resolutions

**Labels.** C-n are my own labels. The "Spec entry" column names the topic to find in the decision register, so the coordinator can attach the G/Q number.

**Your three categories:**

- **Approved motion graphics** are Designer's to deliver.
- **Approved gameplay changes** are Backend's to implement.
- **Remaining implementation questions** carry a recommendation here and need no owner input.

### 3.1 Blocking for implementation (art can proceed on labeled fixtures)

| ID | Conflict | Sources in conflict | Spec entry | Minimal resolution | Category / owner input |
| --- | --- | --- | --- | --- | --- |
| **C-1** | **Stable, reconnect-safe slot identity versus today's stateless, reflowing allocators.** Memory targeting needs every phone and the display to agree on who stands at position N through the preview and the darkness. That includes a phone that reconnects mid-window. Existing occupants must never step aside when someone arrives or leaves. A function of current occupancy cannot do this. | Brief: §1 "Fixed positions… keep… existing occupants' positions stable"; §16 "normalized anchors mapped to authoritative slot IDs. Do not identify occupants by array order". Repository: `design/board-motion/js/layout.js` `assign()`, whose reflow emits the `layout-reflow` cue; Frontend `packages/presentation/src/model/stations.ts:134` (stateless); INT-006; `docs/backend/room-capacity.md:45–47` ("stable exact stations … and fresh-client agreement would need separately reviewed authoritative state/history. No such shared field is added by #96"). | Fixed positions / slot IDs | **Backend stores and publicly projects one `slotId` per on-board seat**: A1–A5, B1–B5, J1–J5, C1, H1–Hn. It is assigned on entry by a role-independent rule, never reassigned while the seat stays, and frozen through the lighting window. Recommended rule: the existing preference order (seat n first tries place (n−1) mod 5), applied **once at entry, without reflow**, so today's pictures mostly hold. The Hospital fills front row first. Clients draw only from `slotId`; `assign()` and `stations.ts` remain for historical tuples only. | Remaining implementation question. No owner input. |
| **C-2** | **Hospital capacity and placement.** The brief says every Injured character is in Hospital, which holds the whole starting roster (7/8/9). | Brief §1, §9; notes §7. Repository: CAPACITY-01 (Hospital five), CAPACITY-04 (Injured denied a place wait where they are), CAP-ORDER-01, BAL-OD (free Injured waiting in Jail); engine `placement.ts:20–30` (an Injured jailed player never enters Hospital; entry needs space); Designer `layout.js` `CAPACITY_ROOMS` (FULL on Hospital); the `wardrobe.mjs` header (the "released Injured waiting in Jail" case); the five-place Hospital scene. | Hospital deadline / capacity | Resolved by precedence. **New ruleset/engine tuple**: Hospital capacity equals the roster; an Injured character always enters; Hospital never FULL. Art: a new 7/8/9-berth ward module. The five-place Hospital stays byte-identical for historical tuples. | Approved gameplay change. No owner input. |
| **C-3** | **Medical detention.** An Injured prisoner is detained in Hospital under a neutral marker, wearing patient clothing; healing returns them to Jail. RELEASE and EJECT leave detainees alone. | Brief §6, §7, §9. Repository: V1-02 ("Health and Jail remain separate"; healed returns to the last A/B room; a released Injured player goes to Hospital); engine `placement.ts:20–23`; CAPACITY-05. | Medical detention | Resolved by precedence. Backend moves an Injured prisoner to Hospital with **`jailed` still true**, and returns them to Jail when healed. Design derives the marker from existing public facts: `location === 'Hospital' && jailed`. **No new field**, and `outfitFor('Hospital')` already gives the gown. | Approved gameplay change. Backend confirms that `jailed` stays true after a RELEASE; the recommended reading is yes, because RELEASE applies only to prisoners physically in Jail. |
| **C-4** | **Showdown location.** Players stay in their authoritative rooms; there is no playable Final Zone. | Brief §14. Repository: `rules/overlays/location-board-layout-v1.json` lines 5 and 10 (all non-eliminated transfer to Final Zone); engine `lifecycle.ts:142`; `LocationSchema` includes `'Final Zone'` (`views.ts:12`, used by `full-game.ts:48`); CAPACITY-01 ("Final Zone holds all remaining participants"); Designer `layout.js` final placements and the `stand`/`standFolded`/`standBack` crowd gestures; board CSS `data-final`. | Showdown | Resolved by precedence. A new tuple without the transfer. The showdown becomes a shared overlay over the unchanged board. Final Zone art is kept for historical tuples only. | Approved gameplay change (presentation consequence). No owner input. |
| **C-5** | **Captain RELEASE becomes a direct command.** It releases everyone in Jail and has no vote. | Brief §6, §8, §12; notes §6. Repository: V1-11 (a release choice for one selected prisoner, then a release vote); phases `RELEASE_CHOICE`/`RELEASE_VOTE` (`full-game.ts:38`, `lifecycle.ts:35, 220, 227`); `lastTally.kind` `RELEASE_VOTE`; ability treatment `shared-votes` (key ring, release ballot); phone-kit `vote-result.js` release variants; cue `cue-ballot-subject`. | Captain commands | Resolved by precedence. The new tuple drops both phases and adds direct commands. **Vote-result art is unchanged**; its release variants serve historical tuples only. RELEASE gets its own film (S6). | Approved gameplay change. No owner input. |
| **C-6** | **EJECT and off-board elimination history.** EJECT eliminates the living prisoners physically in Jail. It then clears the Jail, retained bodies included, into a history kept off the board. | Brief §7. Repository: CAPACITY-01 ("Eliminated occupants count": bodies keep their places); `LocationSchema` has no off-board value; Designer layout keeps every Eliminated character at its place. | EJECT | **The public view needs an off-board representation and an ordered history.** Recommended: an explicit new location value in the new tuple, so every consumer's location switch must handle it, plus an ordered `eliminationHistory` (seat, round, public kind). Backend/Integration decide the form. | Approved gameplay change. No owner input. |
| **C-7** | **Room-visible defense (ATTACK BLOCKED).** Occupants of the affected room see a neutral block. Outsiders and the display see nothing. | Brief §4; notes §4. Repository: V1-17 (Protection known only to Undercover, never shown to the recipient or the public; the attacker sees completion only); contract audiences are only `public` and `player` (`full-game.ts:107–109`); `board-motion-contract-review.md:102` (no event subscription target; cues come from view differences); the Designer cue rule "No cue exists for … a block, Protection…". | Defensive impact | Resolved by precedence. Backend delivers a **per-player fact to each authorized occupant** at the checkpoint, fanned out as player-audience items, so **no new audience class** is needed. It never goes to the public stream, host or display. Designer revises its own cue rules. | Approved gameplay change. No owner input. |
| **C-8** | **Hack pair publicity.** Everyone sees the two participants, their entrance and their exit. | Brief §2; notes §2 ("If the current disclosure contract hides participant association, it should be updated"). Repository: `hackPartnerSeatId` exists only in the player view (`full-game.ts:84`); ability treatment `shared-hack` ("the partner private to the two"); `board-motion-contract-review.md:121`. | Private Chamber | Resolved by precedence. The public view gains both participant seat IDs from the start of the Hack phase (recommended) through the exit. Claims and conversation stay participant-only (#127 §11). | Approved gameplay change. No owner input. |
| **C-9** | **Blackout replaces the turn-time Disable.** The Disabler registers on their own turn and targets a remembered position in a shared lighting window. Self, empty, eliminated and timeout are consuming misses. | Brief §1; notes §1. Repository: V1-13 (Disabler targets another player directly; no self); V1-07 (attack-stage order); `DISABLE` with `legalTargets.DISABLE`; ability treatment `disabler` (reticle on a chosen player). | Blackout | Resolved by precedence. A new window and a position command (Backend). Design keeps the registration strip without a target and adds the lighting window (S1). | Approved gameplay change. No owner input. |

### 3.2 Not blocking for art; discrepancies inside the materials given to me

| ID | Discrepancy | Resolution |
| --- | --- | --- |
| **C-10** | **Clone duration.** The brief §3 ("Latest gameplay decisions") says the Clone covers the rest of the activation round **and the whole following normal round**: activate in Round 2, expire after Round 3's resolution; Round 5 covers Round 5 only. Your notes §3 and §10 say it lasts **until the end of the activation round**. | Follow the brief: it is labeled latest, and it also finalizes the blockable categories your notes left open. **The art is duration-agnostic.** Every Clone visual is private, and expiry plays only when the Alien's own view says the effect ended. Before Backend implements, the coordinator should confirm in the decision register that this is an individual owner answer, not an Integration default. If it is an owner answer, nothing goes to the owner. |
| **C-11** | **Return after the Chamber.** Your notes say both characters "return to their previous board positions". The brief says "the latest authoritative location, not a stale pre-conversation position". | Use the brief: they walk to the slot the current view gives. |

### 3.3 Older presentation assumptions that the latest decisions supersede (Designer-owned)

These change in the production work. None needs an owner question.

- **D-1. Motion policy.** `motionPolicy.loops: false` and "ambient: undecided (DSN-D16)" in `tokens-0.4.0.json` give way to subtle idle loops (brief §2, §9, §15). This needs a token revision for Integration to pin.
- **D-2. Cue contract rules.**
  - The rules in `cues.json` and `motion-cues.json` say there is no cue for a block, Protection or a Rescue giver; no light change in a room; and no sound.
  - Their replacements, scene by scene:
    - Blocks are room-visible.
    - The Rescue drone is source-free.
    - Lighting follows a common schedule.
    - Audio is silent by default in person.
- **D-3. Impacts.** DSN-D35's question (no impact on a health change) is settled: an authorized outcome gets a source-free impact (brief §1, §4).
- **D-4. Hospital places.** The wheelchair, IV pole and bench places give way to patients on berths (brief §9).
- **D-5. Crowd, FULL and reflow.** The Hospital FULL tag, the six-to-nine crowd layout and the `layout-reflow` cue drop out of the new tuple.
- **D-6. Final Zone gestures.** The Final Zone crowd gestures serve historical tuples only.

### 3.4 Points most likely to change once the packet is readable

These need a re-check in A0:

- Blackout eligibility for a Disabler in Hospital, Command or Jail.
- When the Hack pair becomes public: the declare stage or the result stage.
- RELEASE destinations when A or B is full.
- EJECT's checkpoint relative to victory processing.
- How the rescue due round is represented.
- The showdown's cross-room special-shot exceptions.
- Insider knowledge: an unordered set (as approved) or a mapping.

---

## 4. Asset reuse inventory: existing characters and rooms preserved

**Rule for every new item:** it is an **additive module**. No pinned byte changes:

- Frontend's drawing-port pins at `49f0db4`.
- The proposed pins of `wardrobe.mjs` (`1c30862d…` / runtime `312c4cda…`) and `art.mjs` (`c8677076…` / `713b860f…`).
- The pinned `abilities.css` (`cfcc1e29…`).

Integration approves each new file by name and hash (issue #115: no directory exemption).

### 4.1 Characters and figures (reused unchanged)

| Asset | Source / version | Reuse |
| --- | --- | --- |
| Nine characters c1–c9: Vega, Rigel, Lyra, Atlas, Orion, Nova, Juno, Mira, Echo | `figures/crew.mjs`; approved standees `design/source/crew/crew-1…9.svg`; tokens 0.4.0 `color.crew` | Every scene: patients, Chamber pair, prisoners, Clone (the clone *is* the same drawing), EJECT silhouettes, Insider portraits (`piece-crew` card c1–c9) |
| Rig and body | `figures/rig.mjs`, `body.mjs` (`board-motion-0.3.0`: FRAME, ORDER, `figureSvg`), `parts.mjs` | Unchanged |
| 27 gestures | `figures/gestures.mjs`: 21 place gestures (A1–A5, B1–B5, H1–H5, J1–J5, C1), `stand` ×3, `down`, `slumpDesk`, `slumpBench`; marks `+injured`, `+still` | Rooms A/B, Jail and Command unchanged; H1–H5 kept for historical tuples |
| Motion | `figures/motion.mjs`: `walkPose` (with limp), `jolt`, `hurt`, `flinch`, `falling`; `TIMELINES` exit/arrive/hitStay/hitHurt/hitDown; move 120/450/330 ms, impact 320 ms, fall 240/260/400 ms | RELEASE walk-outs, Chamber walks and returns, transfers, impacts |
| Wardrobe | `figures/wardrobe.mjs` `wardrobe-0.1.0`: `outfitFor(location)` gives crew/gown/prison; `dressedFigureSvg` | **Unchanged.** Patient clothing in Hospital beats prison stripes by location already. Detention is a separate mark, never an outfit. |

### 4.2 Rooms and scenes

| Room | Existing | Reuse and addition |
| --- | --- | --- |
| Room A (A1–A5), Room B (B1–B5) | Scenes lifted from the approved sources `design/source/board/board-room-a.svg` and `-b.svg` | Unchanged. New: per-room lighting states (dark mask, fixture flicker) as an overlay module. |
| Command Room (C1) | Bridge with window, consoles and chart table; C1 the Captain at the table | Base unchanged. New overlay module: console inset with the RELEASE/EJECT plates, and gestures `consoleReach`/`consolePress`. |
| Jail (J1–J5) | Cell with blast door, keypad, pipes, bench and cot | Base unchanged. New overlay module: blast-door states and keypad LEDs (RELEASE); a round airlock hatch in the back wall left of the blast door, with clamps, space view and an exterior hull panel (EJECT); emergency lights. The approved blast door stays the interior door. |
| Hospital (H1–H5) | Sick bay with two beds, a wheelchair, an IV pole and a bench | **Kept byte-identical for historical tuples.** New scene module: a **ward of 7/8/9 berths** that reuses the approved shell, back wall, window, cabinet and monitor through the same lift mechanism as `compose.mjs`. |
| Scene kit and framing | `scenes/kit.mjs` (palette, deck, `lightCone`, `halftone`); `scenes/frame.mjs` (`frameScene`, `pressRects`, `PRESS = 44`) | Reused by every new module. |

### 4.3 Effects, markers and phone art

**Approved assets (design-0.2.0):**

- Effects: `fx-ink-trail`, `fx-landing-puff`, `fx-landing-burst`, `fx-speed-lines`, `fx-panel-cap`.
- Patterns: `pattern-halftone`, `pattern-hatch`.
- Markers: `marker-health`, `marker-jail`, `marker-captain`, `marker-turn`, `marker-self`.
- Token and icons: `token-numeral` (the base of the Blackout position marker), `icon-private`, `icon-connection-stale`.
- Reused for impacts, suction lines, panel caps, the detention tag (the `marker-jail` glyph on a steel tag) and the numbered markers.

**Phone kit (#127):**

- Shell: navy and gold top bar; bottom bar Board / Actions / raised **Pass** / Card / Menu (`phone-kit.css`).
- Five-second vote result: `vote-result.js`, `RESULT_ART`.
- Private Hack: `hack.js`, `HACK_ART`, with the L1–L7 lifecycle and B1–B6 phase binding of handoff §11.
- All reused. The public Chamber is a separate module beside them.

**V1 journey (#76):** host, join, lobby, setup, game and end states in `design/v1-phone/`. Reused.

**Setup art (#116):** the nine-character matrix and the role-card reveal. Reused.

- One compatibility catch: #116 adds 58 lines to the **pinned** `abilities.css` (`c35301a2…` against the pinned `cfcc1e29…`).
- Recommended: move those lines into its own `setup.css` before adoption.

**Ability kit (`abilities-0.1.0`, 24 treatments, about 40 dossier SVGs):**

| Treatment | Reused for |
| --- | --- |
| Insider board (cork, photos, tape, envelope, stamp, folder) | S11 |
| Disabler strip (spark, cell) | Blackout registration, without a target |
| Protection shields | Undercover-private notes |
| Rescue cross and vials | Cracker-private |
| Ballot and box | Votes |
| Comms ring and cord | Hack request |
| Special round | Showdown |
| Key ring | Historical tuples only |

**Devices:** role cards such as `device-blue-disabler` and `device-red-disabler`. They stay on the role card only and never appear in an effect.

**Not reused for production:** the painted-room and comic-board explorations, which remain evidence.

---

## 5. Storyboards for every scene (brief sections 1–15)

**Conventions:**

- "Public" means every phone's public layer and the display.
- Times are milliseconds from the trigger.
- Server windows are drawn from the trusted deadlines Frontend already computes, never from a local start time plus a duration.
- Reduced motion uses static, readable states with 80 ms fades: no travel, shake, spatial flips, flicker or rapid flashes.
- Audio is off by default in person for every scene.
- The board layout is the existing grid: Command Room across the top; A | spine | B; Hospital (bottom left) | spine | Jail (bottom right).

### S1. Blue/Red Disabler: Blackout Strike

**Purpose.** Tense memory targeting in darkness. One common lighting schedule runs in every normal round, in every room, whether or not anyone requested a strike.

**Audiences:**

- The schedule, the markers and the outcome are public.
- Selection is owner-private to an eligible Disabler, in their bound room.
- A block is room-visible (S4).

**Before the window.** Jail vote, then its five-second result (S12). A Jail admission walk must finish inside the result's last 1.2 s, so the preview starts with settled, frozen occupancy (sequencing dependency).

| Beat | Time | Full motion | Every phone and the display |
| --- | --- | --- | --- |
| Preview start | 0–300 | Neutral **numbered position markers** fade in at **every fixed slot of every room, empty ones included**. They use the `token-numeral` style (ink disc, paper numeral). | Identical |
| Preview hold | 300–4200 | Lights on, figures and name tags normal, markers visible | Identical |
| Malfunction | 4200–5000 | Fixture flicker: two dips to 60% brightness (4300–4420, 4650–4770); small sparks at each room's own light fixture at 4700. **The pattern is seeded by the window id, not by any request.** | Identical in all rooms |
| Lights out | 5000–5200 | Ink mask to about 92% over each room's art; wall line work stays faint so each room still reads as a room. **Figures, portraits and name tags fade out completely, with no silhouettes.** Markers switch to the dark style. Room tags stay readable at 70%. The spine dims. The top bar and navigation are untouched. | Identical |
| Darkness | 5200–15000 | Static dark. Every phone shows the same low-luminance strip, "Lights out", with the remaining time. **The eligible Disabler's strip is the same size and brightness**, and also holds the selection line: tap a marker in the bound room, then "Strike position 3?", then Confirm or Choose again, then Sending, then Registered. Markers in the bound room are pressable (at least 44 px, identical look). Everywhere else nothing is pressable, and a tap gives no feedback. | The display shows the dark board only |
| Window closes | 15000 | Selection closes. A timeout is Backend's consuming miss. | — |
| Hold | ≥ 15000 | Darkness holds until the round's outcome is published, capped at 1500 ms after `endsAt`. Then all rooms return together. | Identical |
| Impact | R + 0–320 | For each **authorized hit** in the batch: a source-free spark flash and a comic impact star centred on the slot's press point. There is no muzzle, beam, trail, direction or camera move toward any actor. Full motion only: the hit room's art shakes ±3 px for 160 ms, art layer only. | Public |
| Lights return | R + 120–520 | Every room fades up. Figures reappear in the authoritative state: a hit plays the existing jolt then flinch with bandage, or the place's fall; a block shows S4 to authorized occupants only. **A miss shows nothing anywhere**, because a spark at an empty slot would reveal the requesting room. | Public, plus room-visible S4 |
| Settled | R + 520–900 | Markers fade out; the board is normal. Later placement walks (to Hospital) follow as ordinary public moves. | Public |

**Reduced motion:**

- At 0, the markers appear with an 80 ms fade.
- At 4920, one 80 ms fade to a static dark state with a "LIGHTS OUT" caption and a static spark icon in each room caption, in every room. There is no flicker.
- At R, an 80 ms fade back to light.
- A static burst icon sits on hit slots for 600 ms, beside the status marker.

**Accessibility:**

- During the preview, each room exposes a one-line positions summary from public facts, for example "Room A: 1 Vega, 2 empty, 3 Orion, 4 Mira, 5 empty".
- In darkness, markers are named "Position 3" only.
- Outcomes are announced politely after the lights return.

**Interruption, staleness and reconnect:**

- If the page is hidden or blurred during the window, it shows the current state when it comes back: dark with the true remaining time while the window lasts. Flicker is never replayed.
- The private selection strip returns only after Frontend's foreground and fresh-view checks and an explicit tap.
- If the view's window id is not current, the private UI is dropped.
- After the window, a reconnect draws the lit board and the current outcome with no impact.

**Disclosure invariants:**

- Blue and Red produce identical DOM, CSS, timings and asset requests.
- A round with no request looks identical to a round with one.
- There is no early response to a selection, no names in the dark, no self warning and no invented damage.
- Decorative shake never moves a marker or a hit area.

**New art:**

- Per-room dark masks and fixture flicker states: the Room A ceiling lamp, the Room B laboratory strip, the Jail caged lamp, the ward lights and the bridge lights.
- Spark sprites (3 frames).
- Position marker in preview, dark and private-chosen states.
- Impact core over `fx-landing-burst`.
- "LIGHTS OUT" lettering.

### S2. Private Hack: Private Chamber

**Purpose.** A public pair with private content.

**Audiences:**

- The pair, the entrance, the talk loops and the exit are public.
- The claim card and the conversation panel go to the two participants only, through the existing #127 lifecycle.

**Server stages:** declare (≤ 15 s), result (5 s), talk (60 s).

| Stage / beat | Time | Full motion |
| --- | --- | --- |
| Declare starts | 0–220 | Both participants get a thin caption-yellow outline and a comms badge above the head. The phase strip reads "Private Hack: Player 3 + Player 7". Participants see the private declare panel (#127). |
| Result stage: exit | 0–570 | Both stand (exit beat, 120 ms) and walk to their room's door edge (450 ms). The figures leave the panel, clipped. |
| Away ghosts | 570–900 | Each slot shows a dimmed, dashed "away" ghost of its figure with the comms badge. The slot stays visibly occupied and **keeps its hit area**. |
| Chamber cut | 600–1000 | The Chamber inset opens in the cinematic region (see the handoff): a 200 ms panel slide, then a 200 ms thick ink border. It shows the outside of the sliding door. |
| Door | 1000–1400 | The automatic door slides open with a light spill. |
| Enter and close | 1400–2400 | Both walk in (600 ms). The door closes with a two-frame dust accent and no sound. |
| Seated | 2400–2900 | They settle facing each other: `chamberSitL` and `chamberSitR`, two chairs and a small table under a single overhead light. |
| Hold | 2900–5000 | Seated and still. **The entrance never overlaps the private claim card**, which sits above the board in the sheet layer on participants' phones. The conversation starts at the talk stage, not before. |
| Talk | 60 s | Decorative loops, scheduled deterministically from `hackId` and desynchronized between the two: head tilt ±4° (2.8 s); a hand gesture every 5–7 s (1.2 s); lean forward and back (4.6 s); a listening pose; a blink every 3–6 s (120 ms); a posture shift every 9–12 s. Both can gesture at once. **Nothing follows real speech, a microphone, a claim or a choice.** The timer comes from the trusted talk deadline. |
| Exit (nonblocking) | about 1700 after talk ends | Door opens (300); they stand and walk out (450); the inset closes (200); each walks in from their room's door edge to the **latest authoritative slot**, settling over 330 ms as the ghost fades. |

**Collapse.** Whenever the viewer's own strip, tray, Card or Menu opens, or the server offers the viewer a character target, the inset collapses within 120 ms. It becomes a 44 px chip with two heads, "Chamber" and the time.

**Reduced motion:**

- The highlight is static.
- The ghosts and a seated inset appear with 80 ms fades.
- There are no loops.
- On exit, the inset closes and the figures appear at their slots with 80 ms fades.

**Reconnect:**

- During the talk: the inset is drawn with the pair seated. The entrance is not replayed.
- After the talk: the figures are at their slots. The exit is not replayed.
- A stale `hackId` or `phaseId` means no inset and no private panel.

**Privacy:**

- The public inset holds no claim, card, side color or role.
- Private content leaves on blur, hidden, stale or an audience change (L1–L7); the public inset stays.
- The app supplies no voice transport and no protection against being overheard.

**New art:**

- The Chamber scene: a small futuristic room in dark metallic navy with purple shadows, yellow lamp light, a subtle red door-status light and a minimal interface panel.
- Door frames: closed, three opening frames, open.
- The `chamberSit` gestures and their loop keyframes.
- The away ghost, the pair highlight and the comms badge.

### S3. Alien: Phantom Clone (private activation, public invariance)

**Purpose.** A visually identical stand-in hides the defense.

**Audiences:**

- Activation and expiry art are owner-private to the Alien's phone, inside the private sheet, never on the board.
- Blocks use S4.

**Trigger.** The Alien registers on their own ordinary turn: Actions, "Phantom Clone", Confirm, Sending. The film plays once, when the own view first says the Clone is active and the sheet is open in the foreground. The effect is immediate on acceptance.

| Beat | Time | Private sheet, as a card-sized portrait of the Alien's own character |
| --- | --- | --- |
| Scan | 0–400 | Cyan-violet holographic scan lines sweep up the figure. |
| Duplicate | 400–900 | A halftone duplicate silhouette forms beside it. |
| Resolve | 900–1300 | The duplicate resolves into the exact character, drawn by the same functions in the same outfit. |
| Vanish | 1300–1800 | The real figure fades to a dotted outline; the clone remains in pose. |
| Settled | — | A private chip on the Card: "Phantom Clone active", with "through Round N" only if the view says so. |

**Expiry.** When the own view says the Clone ended, the reverse plays (900 ms) the next time the sheet is open, or a quiet chip says "Phantom Clone ended". Elimination ends it with no special art.

**Public invariance:**

- The board figure keeps the same drawing, outfit, idle loop, movement and asset requests on every phone, including the Alien's own.
- The Clone art ships in the common bundle and is never fetched conditionally.

**Reduced motion:** before and after frames with an 80 ms cross-fade.

**Reconnect:** chip state from the view; no replay.

**In-person glare.** The film is low-luminance and contained in the sheet, with no full-screen glow.

**New art:** scan lines, duplicate silhouette, dotted outline, "CLONE ACTIVE" and "CLONE ENDED" stamps, and the Actions icon.

### S4. Clone and Undercover Protection: shared ATTACK BLOCKED

**Purpose.** Players see an attack fail, but not why.

**Audience:** room-visible only, meaning the occupants authorized at the checkpoint. Nothing reaches the display, the host or outsiders: no banner, count or sound.

| Beat | Time | Identical for both causes |
| --- | --- | --- |
| Incoming | 0–120 | A source-free comic impact star at the chest (the press point), with no direction or trail. |
| Shield flash | 120–360 | A hexagonal energy bubble (cyan-white core, ink outline, halftone) blooms from 0.8 to 1.05; the figure braces with a reduced jolt. |
| Absorb | 360–620 | A ring expands and fades, and eight symmetric particles scatter. |
| Return | 620–900 | The figure returns to the authoritative slot gesture. An Injured character stays Injured: no healing glow, bandage kept. |
| Label | 620–2420 | **ATTACK BLOCKED** lettering, caption yellow on ink, holds for 1600 ms then fades over 200. The accessible announcement is "Attack blocked on Player 5." It names the affected character only. |

**Details:**

- Several blocks each play on their own target.
- A showdown Protection block uses the same treatment; the Clone never blocks a special shot.
- **Reduced motion:** a static shield ring and the label (80 ms fade, 1600 ms hold).
- **Layer:** a room-visible effects layer clipped to the room panel. All nodes are removed after settling, so no residue is left in the DOM.
- **Reconnect and staleness:** never replayed; a stale checkpoint is dropped.

**Private differences allowed:**

- The Alien's activation (S3).
- The Undercover's own board can show a small private shield tab on the protected character while the projection says Protection is active.
- The recipient sees nothing until a block.

**New art:** impact star, shield bubble (3 frames), energy ring, particles and the lettering.

### S5. Cracker: Medical Drone + Emergency Revival

**Purpose.** Hopeful recovery caused by Hospital infrastructure.

**Audience:** public, because the health change is public.

**Trigger.** A public resolution entry: a Hospital patient goes from Injured to Healthy at the Rescue stage. There is no actor field.

**Duration.** 5500 ms, nonblocking. Controls stay live, and the next phase may start. The readable list says Healthy at once; the film catches up.

| Phase | Time | Full motion |
| --- | --- | --- |
| 1 Alert | 0–700 | The patient's berth lamp blinks amber twice (≤ 2 Hz). The monitor is already unstable from S9. |
| 2 Arrival | 700–1900 | The ward's ceiling dock iris opens. The drone (compact body, central cyan lens, three small arms, cyan and yellow running lights, thick outline) descends with a ±2 px hover and glides along the ceiling rail to above the berth. Its path never starts at a door or a character. |
| 3 Scan | 1900–2900 | A cyan scan line sweeps the patient twice; a small hologram (ECG and body outline) appears; diagnostic ticks. |
| 4 Revival | 2900–3500 | Energy charges as a yellow ring tightens. A pulse flash of at most 120 ms is confined to the berth and covers under 25% of the panel. The patient jolts gently (40% of `jolt`). There is no contact and no gore. |
| 5 Recovery | 3500–4600 | The waveform steadies; the lamp turns cyan; the patient lifts their head and sits up (`wardRecover`); the bandage goes. Gown and identity are kept. |
| 6 Departure | 4600–5500 | Arms retract, the drone returns to its dock, and the lighting settles. |

**Placement afterwards.** At finalization, the existing public move walks the patient out: to their last A/B room, or to the **Jail if detained**. The gown becomes prison stripes on landing.

**Details:**

- **Several rescues at once:** up to two drones from two dock bays at the same time; further ones wait for a free drone. Animation order never decides anything.
- **Self-rescue:** the same film.
- **A failed Rescue:** nothing.
- **Reduced motion:** static frames with 80 ms fades: drone above the berth, monitor "stabilized", patient sitting up, drone gone (about 1.2 s).
- **Interruption:** a newer state, such as the placement walk, fades the drone out in 80 ms and lets the move cue run.
- **Reconnect:** no replay.

**New art:** ward ceiling dock (two bays), the drone with arm states, scan line, hologram, revival ring, `wardRecover`, and monitor states (stable, unstable, critical, flat, off, charging).

### S6. Captain: Prison RELEASE

**Audience:** public.

**Trigger.** A public Captain-command fact: kind RELEASE, executed, with the affected seats. The resulting moves come from the state.

**Duration.** 4200 ms, nonblocking. The Captain's turn timer keeps running.

| Beat | Time | Full motion |
| --- | --- | --- |
| Console | 0–500 | C1 turns from the chart table to the console (`consoleReach`). The console inset opens in the cinematic region with **RELEASE** lit green and optional cyan accents. |
| Press | 500–800 | The button depresses (Activated), a green ring flashes on the panel, and "RELEASE" lights up. |
| Pulse | 800–1400 | A green dotted command pulse runs down the board's spine conduit from the Command Room to the Jail. |
| Locks | 1400–1900 | Keypad LEDs go green and the bolts retract (three frames). |
| Door | 1900–2500 | The blast door slides open. |
| Walk out | 2500–3700 | Prisoners stand and walk to their **authoritative destinations**, staggered 80 ms by slot. Stripes become the crew suit on landing. |
| Close | 3700–4200 | The door closes, the indicators return to normal, and C1 goes back to the table. |

**Details:**

- **Medical detainees** stay in Hospital, marker kept.
- **Defenses:** none can block it, and no block effect ever shows.
- **Reduced motion:** a static lit console, then the door open, then the prisoners at their destinations, then the door closed, each with an 80 ms fade.
- **Reconnect:** current state; RELEASE shows Used.

**New art:**

- Console inset and button plates (S8).
- The `consoleReach` and `consolePress` gestures for C1.
- Conduit pulse, blast-door states, keypad LEDs and bolts.

### S7. Captain: Prison EJECT (Option A)

**Audience:** public.

**Trigger.** A public Captain-command fact: kind EJECT, with the affected living prisoners and the cleared retained bodies. The resulting state puts them off the board.

**Duration.** 7200 ms, nonblocking. The board, timer and navigation stay usable.

| Phase | Time | Full motion |
| --- | --- | --- |
| 1 Command | 0–900 | A short push (≤ 6% zoom, art only) on C1 at the console. The red **EJECT** plate (or "PRISON EJECT") appears; the transparent safety cover lifts over three frames; the button is pressed; a hard click is drawn as a red comic impact accent, with no gun-like lettering. |
| 2 Alert | 900–1500 | Red emergency lights pulse in the Command and Jail panels (≤ 2 Hz, low luminance). A red command pulse runs down the spine. |
| 3 Lockdown | 1500–2400 | The interior blast door locks (bolts, red keypad); indicators switch to striped red and amber; prisoners react (`startle`, `brace`). |
| 4 Airlock | 2400–3300 | The external clamps release and the heavy round hatch opens onto space (ink-black with halftone stars). Airflow speed lines build toward the opening (`fx-speed-lines`). |
| 5 Ejection | 3300–4400 | Prisoners are pulled and thrown out as tumbling silhouettes (`ejectTumble` ×2) with motion lines and a little debris (papers, a cup). Silhouettes keep a paper rim light, so they read against black. No injury is shown. **Retained bodies** dissolve upward at the same moment as grey paper-cut memorial silhouettes, also non-graphic. |
| 6 Exterior | 4400–5800 | An exterior inset clipped to the Jail panel: the hull and the open hatch, with small figures drifting away. The scene quietens. |
| 7 Closure | 5800–7200 | The hatch closes, the emergency light settles, and the Jail is empty. A final short panel shows C1 at the console, with EJECT under its cover marked USED. |

**Settled state:**

- The Jail is empty.
- The off-board history gains the ejected and cleared characters as grey silhouettes with name and seat number, in Menu's player list, plus an optional memorial plaque with the count next to the Jail tag.
- Faction reveals come only from the authoritative state, never from the film.

**Never shown:** a defensive block, a medical detainee leaving Hospital, a module detaching, or anything graphic.

**Reduced motion.** Static panels with 80 ms fades: the console with "EJECT" lit, then the Jail with the open hatch and "EJECTED", then the empty Jail, then the memorial entries. There is no suction travel, camera move, shake or flash.

**Reconnect:** no replay.

**New art:**

- Airlock hatch (closed, unlocking, open), clamps, space view, exterior hull panel.
- Suction lines and debris.
- `startle`, `brace` and `ejectTumble` poses.
- Emergency-light states.
- The memorial silhouette treatment and the history entry.

### S8. Captain button states

These are the Captain's own controls in the Actions tray or console sheet. RELEASE (green) and EJECT (red, under a transparent cover) have independent allowances. Both allowances are public once used, and a new Captain sees them Used.

| State | Treatment | Without color |
| --- | --- | --- |
| Available | Illuminated rim and a subtle glow cycle (2.4 s, ≤ 15% luminance change; static under reduced motion); enabled | Solid outline and the label |
| Temporarily unavailable | Unlit and desaturated, with a reason line from the server's reason code: "Only on your turn", "Only in the Command Room", "No one in the Jail" | **Dashed outline** and the reason text |
| Activated | A deliberate 3 px press with an inner shadow (120 ms). Confirming intent: EJECT needs the cover lifted, then the press; RELEASE uses a confirm strip, "Release everyone in the Jail?". Then the local "Sending…". | Pressed shape and the strip |
| Used | No glow, inactive, a **USED** stamp across the plate | Stamp |
| Rejected / unknown | The existing failure states, "Not done" and "Checking…" | Words |

**A rejected, pending or unknown command never plays S6 or S7.** An invalid or empty command never shows Used.

### S9. Hospital: Injured / critical condition

**Audience:** public.

**Trigger:** a seat whose location is Hospital and whose health is Injured.

**Storyboard:**

1. **Transfer.** The existing public move with a limp ends at the assigned berth.
2. **Into the berth.** `wardEnter`: sit on the berth edge, then lie down (600 ms). The patient wears the gown with a bandage.
3. **Monitor on.** The waveform is unstable.
4. **Warnings.** A restrained red and amber lamp breathes; there is no strobe.
5. **Deadline badge.** On the berth's foot plate: **"Rescue by end of Round 3"**, from the server's due round. In the due round it reads **"Last round for Rescue"** and the waveform becomes more irregular.
6. **Idle loop.** Breathing (chest 1.5%, 3.6–4.4 s), a weak hand twitch every 8–12 s, the irregular ECG trace (2.2 s), and a slight lighting variation.

**Medical detention:**

- A neutral steel tag carrying the `marker-jail` glyph hangs on the berth rail. It is never in a faction color.
- The gown overrides stripes.
- Each berth has a name plate with the public seat number and name, as every piece's tag does. This keeps patients identifiable at phone scale.

**Round 5:**

- A Round 4 patient's badge says "Rescue by end of Round 5".
- **A new Round 5 or showdown injury gets no badge.** The server gives no due round, and the client never invents one.
- **No client timer causes death.**

**Reduced motion:** a static unstable waveform and a static lamp, with no loops.

**Reconnect:** the badge comes from the view and never resets.

**New art:** the berth (front row, middle row, back row), bed light, monitor states, lamp states, badge frame (the words are DOM text), detention tag, `wardEnter`, `wardLie`, `wardLie+still` and the loop keyframes.

### S10. Hospital: Flatline + Life Support Shutdown

**Audience:** public.

**Trigger.** A public resolution entry: a Hospital patient goes from Injured to Eliminated at the **medical-deadline stage**. An elimination by damage plays the ordinary hit-down instead.

**Duration:** 4800 ms, nonblocking.

| Phase | Time | Full motion |
| --- | --- | --- |
| 1 Critical | 0–1400 | The heartbeat slows and turns irregular; the lamp intensifies to a steady red-amber, with no strobe; breathing slows and stops. |
| 2 Flatline | 1400–2400 | The trace goes flat; a short alarm glyph appears (visual only); the Hospital panel dims by 20%. The board stays readable. |
| 3 Shutdown | 2400–3800 | The screen shrinks to a dot and goes off, the bed light fades, the lamp goes out, and the patient is motionless (`wardLie+still`). |
| 4 Final | 3800–4800 | The Eliminated marker appears; the gown is kept; the berth stays occupied by the retained body with the equipment off. A faction reveal appears only when the state says so. |

**Never shown:** an attacker, a defense, gore, or this film after a Rescue.

**Reduced motion:** flat trace, then off, then the Eliminated marker, with 80 ms fades.

**Reconnect:** no replay.

### S11. Insider: private classified investigation board

**Preserve the approved file** (`abilities-0.1.0`, slice 1):

- A cork board with **three portraits of the players' chosen characters** in seat order.
- The **three role labels**, Undercover, Alien and Cracker, as one set in an envelope stamped "ONE EACH", with "Who is which: unknown".
- A CLASSIFIED stamp and one red string.
- Opening animation: assembly over 1020 ms under full motion, static under reduced motion.

**Polish proposal:** the closed CLASSIFIED folder opens to reveal the board, with stronger halftone shadows. It never ties a label to a portrait.

**Content and privacy:**

- The content comes only from `knowledge.insiderCandidates`, after Frontend's private checks.
- It is removed on blur, hidden, stale or unauthorized, and never replayed on reconnect; reopening takes a tap.
- It never appears on the board, display, host, public markup or shared assets.

**If the projection ever carries a mapping,** labels could be pinned under portraits, but only with that explicit field. The recommendation is to keep the approved set.

### S12. Vote result and Hack result

**Vote result (#127 B, existing):**

- A five-second synchronized outcome screen with aggregate counts only, covering the Captain election and runoff and the Jail outcomes.
- It stays visible with Menu open or reopened, keeps Menu usable, never restarts its clock and never takes the next phase's time.
- In the new tuple there is no release vote, and **RELEASE and EJECT never get a vote sequence**.
- The Jail admission walk fits inside the result's last 1.2 s (S1).

**Hack result (#127 D, existing):**

- The target's declared side as a **claim** (bluffing allowed), or "No side declared".
- Timing: up to 15 s to declare, a 5 s result, then a full 60 s conversation.
- Bots follow the existing declaration policy.
- The Chamber entrance (S2) plays on the board under the private card and never covers it. Observers see the entrance without the card.

### S13. Phone screens, board and wardrobes

**Phone screens:**

- **Preserved:** Host, Join/Lobby (#76), Character Selection and Role Reveal (#116), and the Main Game shell (#127).
- **Character Selection:** a clean nine-character matrix, tap to select and confirm, 30 s, server auto-assignment at timeout, no explanatory paragraphs.
- **Role Reveal:** the role card in focus, at least 30 s of reading, Ready from every human (bots automatic), with timer and state compact in the top bar.
- **Starting room:** server-random A or B. The lobby says the room is assigned when the match starts, using the existing truthful copy for an unassigned room.

**Main board:**

- **Fit:** fits the phone without page scrolling; enlarged text reflows Menu lists and strips without moving anchors.
- **Controls:** bottom bar Board, Actions, raised Pass, Card, Menu. Room tags move the player; Move is not in the Actions tray; actions target characters on the board; Blackout uses positions.
- **Pass:** "Your Hack with Player 5 follows" stays private to the requester.
- **Polish:** the navy frame with gold accents; FULL appears only on Rooms A and B in the new tuple. With a 7–9 berth ward, the Hospital band gets enough height for 44 px berth targets.

**Wardrobes.** Crew, gown and prison by public location (`outfitFor`), unchanged. The detention marker is separate. Identity and body are always the same person. Clothing never says anything about role or faction.

### S14. Remaining actions and showdown

**One grammar for every action**, from the existing kit:

1. **Choosing:** dashed ring and "+" tab on eligible characters; others faint.
2. **Confirming intent:** the strip question, Confirm or Choose again, and the action's mark on the chip.
3. **Pending or unknown:** "Sending…", then "Checking…".
4. **Accepted registration:** the neutral **Registered** stamp, never a result.
5. **Authoritative outcome:** only from the server's outcome.

| Action | Private strip (existing) | Authoritative outcome treatment |
| --- | --- | --- |
| Ordinary shot / Officer / Alien weapon | Reticle and rounds | Public: a source-free impact star, then the existing hit timelines (flinch with bandage, or the place's fall). Room-visible: S4. |
| Scan | Lens and printout | A private result card (membership only) |
| Supply (Round 3) | Tags | Each recipient's own acknowledgment slip |
| Code (Round 5) | Four picks and the code card | Only at the victory checkpoint or the end |
| Voting | Ballot slip and box | S12 |
| Pass | Central button, then a confirm strip | Public turn accent (`cue-turn-accent`) |
| Movement | Room tag, tentative ghost, Sending, Accepted | Public walk (`cue-public-move`, 900 ms) and arrival puff |
| Rescue | Cross and vials | S5 |
| Protection | Shield, then the Undercover's private notes | S4 only |
| Blackout | Spark cell, no target | S1 |
| Clone | S3 | S4 |
| Hack request | Comms ring | S2 |
| Captain commands | S8 | S6 / S7 |

**Showdown:**

- **Opening:** a shared title panel, "FINAL SHOWDOWN" (1200 ms), plays in the cinematic region at the phase start. **Everyone stays in their room**, including Hospital; there is no Final Zone.
- **Special shots:** targeted on the board with the server's cross-room `legalTargets`; registration is private.
- **Resolution:** follows the complete authoritative batch, with entries played in batch order at up to 900 ms each, capped at 6 s before settling. Protection blocks show S4; the Clone never blocks a special shot.
- **Winner:** shown only from the finished state. A draw is shown when the state says draw.

### S15. Global motion, accessibility and privacy

**Idle loops.** These are new and need the token revision.

- One subtle loop per place gesture:
  - Breathing: 1.5%, 3.6–4.4 s.
  - A blink every 3–7 s (120 ms).
  - A head micro-turn of ±3° every 6–9 s.
  - An environmental touch every 8–14 s: A3 turns the wrench, B2 types, B5 focuses the microscope, J1 rubs the hands.
- Phases are seeded from the seat number and the slot, never from a role.
- Loops never move a hit area, never imply speech or a decision, and pause when the page is hidden or motion is reduced.

**Camera:**

- Pushes of at most 6% over 300–500 ms.
- Comic cuts as insets.
- Impact frames of at most 80 ms over a small area.
- Shake of at most ±3 px for at most 200 ms, on the art layer only.

**Flash safety:**

- At most three flashes in any second.
- A flash covers at most 25% of the panel.
- No saturated red full-screen flash.

**Stability.** Room labels, timers, navigation and hit areas never move during a film. Board band heights depend on the viewport, the roster size and the text size, **not on current occupancy**, in the new tuple.

**Information channels.** Every state carries words or a shape as well as color and sound.

**Disclosure:**

- Blue and Red Blackout are identical.
- Clone and Protection impacts are identical.
- The drone never starts from the Cracker.
- The Chamber pair is public and its content private.
- Room effects reach their recipients only.
- **No role leaks** through color, sound, DOM labels, accessible names, asset requests or actor-correlated timing. Every effect asset is in the common bundle.

**Reconnect.** Current state and remaining time only. Attacks, deaths, private reveals and room events are never replayed.

**Interruption.** Every film settles to the current state within 80 ms.

**Losing foreground, authorization or the current phase** removes private content while keeping Frontend's command recovery.

**Audio and haptics.** Off by default in person, with no haptics for private or room-visible events. Any future sound must be identical across causes and roles.

**In-person glare.** Private and room-visible effects stay inside their panel at low luminance, so a neighbor's screen does not broadcast them.

---

## 6. Production plan

### 6.1 Art: Designer (`design/`, `packages/design-tokens/`, `docs/design/`)

All new modules are **new files** under a proposed new board version, `board-motion-0.4.0`. Pinned files stay byte-identical, and old tuples keep today's art.

| WP | Deliverable | New editable sources (proposed names) | Depends on |
| --- | --- | --- | --- |
| A0 | Reconcile with the specification packet: map C-1 to C-11 onto G/Q, diff the brief against the specification, update this plan | — | The packet becomes readable here |
| A1 | Board geometry v2: slot table (normalized anchors, press, marker, badge, effects anchors; Hospital sets for 7/8/9) and the ward scene | `scenes/slots.mjs`, `scenes/hospital-ward.mjs`, `scenes/board-v2.mjs` (index) | A0 (soft) |
| A2 | Figures v2: ward poses, `wardEnter`/`wardRecover`, `consoleReach`/`consolePress`, `chamberSit` L/R, `startle`, `brace`, `ejectTumble`; idle-loop keyframes; status marks (detention tag, deadline badge frame, away ghost, pair highlight) | `figures/gestures-v2.mjs` (a superset with its own `skeletonOf`), `figures/marks.mjs`. **`wardrobe.mjs` unchanged.** | A1 |
| A3 | Room overlays: per-room lighting, console inset, Jail doors/airlock/space/exterior, Chamber scene | `scenes/lighting.mjs`, `scenes/command-console.mjs`, `scenes/jail-doors.mjs`, `scenes/chamber.mjs` | A1 |
| A4 | Effects library: impact star, spark, flash core, shield bubble, energy ring, particles, holographic scan, duplicate silhouette, command pulse, drone, scan line, hologram, ECG traces, suction lines, debris, memorial silhouette, position marker | `fx/fx.mjs` (pure SVG functions) | A1 |
| A5 | Film timelines as data: beats, durations, easing tokens, reduced variants, layers, regions, audience and proposed trigger, interruption rules; revised Designer cue and coverage contracts | `contract/films.json`; updated `cues.json` and `coverage.json` | A2–A4 |
| A6 | Phone pieces: Captain button plates (4 states × 2), cover, USED stamp, history entry, Chamber chip, LIGHTS OUT lettering; optional Insider polish | `phone-kit/source/command-art.mjs` (new; **`art.mjs` unchanged**) | A4 |
| A7 | Token revision proposal: constrained loops, film durations (informational, never authority), flash limits, scene palettes (Chamber, Drone, EJECT, Flatline) | `tokens-0.5.0.json` (proposal) | A5 |
| A8 | Development-only prototype: labeled fixtures for every scene and state, storyboard holds (`&play=…&t=`), a two-client disclosure harness. **Not production authority.** | Extensions of the board-motion prototype | A1–A6 |
| A9 | Exports, manifest and captures: a new manifest version for the new modules, SVG exports, review captures and contact sheets | — | A8 |
| A10 | Docs: Frontend handoff, verification record, coverage, the owner's latest decisions recorded in `docs/design/owner-decisions.md`, integration requests for the Backend fields | — | A9 |

**Delivery as focused PRs:**

1. Geometry, ward and marks.
2. Lighting window and markers.
3. Shared impact and Clone-private art.
4. Hospital loops, drone and flatline.
5. Captain console, RELEASE, EJECT and history.
6. Chamber.
7. Idle loops and tokens.
8. Showdown overlay and remaining-action polish.

**Why this order.** Blackout and the slots carry the most risk and fix the geometry everything else uses. The Chamber waits on the Hack contract (`ba1842f`) and the public pair.

### 6.2 Frontend integration (Codex Frontend; `apps/game/`, `packages/presentation/`)

| ID | Work |
| --- | --- |
| F1 | Render from the authoritative `slotId` through the slot table. Keep the stateless allocator for historical tuples only. Retire `layout-reflow` in the new tuple. |
| F2 | Layer stack with a separate, never-transformed hit-area layer; cinematic regions (spine conduit, Command band, Jail panel). |
| F3 | Playback from `films.json` (GSAP, as in the architecture): cancel and settle, reduced motion, visibility gating, no replay without an observed previous state. |
| F4 | Lighting window: masks, markers, the shared dark strip, the private selection strip, trusted deadlines. |
| F5 | Room-visible fact intake: per-player items, deduplicated by `(match, audience, eventId)`, played only live. |
| F6 | Chamber inset and pair highlight; the #127 §11 private lifecycle (L1–L7) and phase binding (B1–B6). |
| F7 | Hospital ward: berths, monitors, deadline badge, detention marker; drone and flatline films. |
| F8 | Captain buttons and films; off-board history in Menu. |
| F9 | Showdown overlay; no Final Zone in the new tuple. |
| F10 | Token-driven idle loops. |
| F11 | Accessibility: live regions, positions summary, enlarged text, focus stability. |
| F12 | Measurements on real devices. |
| F13 | Historical tuples render as today: crowd, Final Zone, FULL Hospital, release vote. |

### 6.3 Backend and Integration dependencies (proposals; nothing is accepted yet)

| ID | Dependency | For |
| --- | --- | --- |
| BE1 | Public, stored `slotId` per on-board seat; assignment rule; frozen through the lighting window | C-1; S1, S2, S9 and every board render |
| BE2 | New ruleset/engine tuple: Hospital equals the roster; every Injured character in Hospital; detention with `jailed` true; healing returns detainees to Jail; no Final Zone transfer; direct RELEASE and EJECT; one-round rescue deadline and automatic death; Blackout window; Clone; room-visible blocks | C-2 to C-9 |
| BE3 | A public lighting-window phase every normal round (`previewEndsAt`, `endsAt`); the Disabler's private binding, selection command and receipt | S1 |
| BE4 | A public due round per Injured patient, or null when none applies | S9 |
| BE5 | A public resolution batch with a checkpoint id and neutral public stage tags (attack, rescue, medical deadline, captain, showdown). No actor, ability or defense. | S1, S5, S10, S14 |
| BE6 | A room-visible `ATTACK_BLOCKED {checkpointId, seatId}` for each authorized occupant; nothing to the display, host or outsiders | S4 |
| BE7 | The public Hack pair from the declare stage, with stage and deadlines; private feedback as in `ba1842f` (still not on the remote) | S2, S12 |
| BE8 | Captain: public allowances (release and eject used), a public command fact (kind, affected seats, checkpoint), and the Captain's private offers with reason codes | S6–S8 |
| BE9 | An off-board representation and an ordered elimination history | S7 |
| BE10 | The Alien's own Clone state: available, active or used, and through which round | S3 |
| BE11 | Trigger strategy: view differences plus checkpoint ids today (Backend review line 102); any listener extension parses the existing event schemas | All films |
| BE12 | Showdown kept in rooms; cross-room special-shot targets; batch publication | S14 |
| INT | Contract adoption and version pins; named-file and hash approval of each new drawing module (#115); the token revision pin; the art-version acknowledgment. **The fence is unchanged.** | All |

Balance's evaluation of these mechanics is in your notes §9. It is not a design dependency, but its results could change the Hospital deadline, Blackout, the Clone or the Captain commands.

---

## 7. Frontend coordination handoff

> **For the owner or coordinator to relay to Codex Frontend ("Continue GameN frontend").**
>
> This comes from the Claude Visual and Motion Designer, 13 October 2026.
>
> - Status: a proposal. Frontend has not reviewed it and nothing has been accepted.
> - No code, art or contract was changed.
> - Base: `abb6839`. Designer head: PR #127 `5c9a151` (its source correction is `3784057`).
> - The six-file specification was **not** readable in the Designer's environment. This handoff follows the brief; re-check it against the specification.

### 7.1 Reusable sources (pins unchanged) and proposed additions

**Keep exactly as already proposed by Frontend at `bc92e58`:**

- `design/board-motion/figures/wardrobe.mjs` (`1c30862d…` / runtime `312c4cda…`): `dressedFigureSvg(character, skeleton, {outfit, prefix, layer})` and `outfitFor(publicLocation)`, which returns `crew`, `gown` or `prison`.
- `design/phone-kit/source/art.mjs` (`c8677076…` / runtime `713b860f…`): static `RESULT_ART` and `HACK_ART`. The side card is used only in an authorized private layer.
- Already ported at `49f0db4`: body, crew, parts, rig, gestures, motion, frame, layout, the scenes and `board.js`, plus the pinned `abilities.css`.

**Still excluded as authority:**

- `hack.js`, `vote-result.js`, `app.js`, `director.js`, `dress.js`.
- Every fixture and the stand-in server.

**Proposed new pure drawing modules.** These are new files. Each needs Integration's named-file and hash approval; there is no directory exemption.

| Module | Exports (proposal) |
| --- | --- |
| `scenes/slots.mjs` | `SLOT_IDS`; `slotsOf(room, rosterSize) → Slot[]`; `hospitalSlotCount(rosterSize)` |
| `scenes/hospital-ward.mjs` | `HOSPITAL_WARD`, with the same shape as the existing scenes: room, source, under, floor, over, props, inner, focus, layers, slots |
| `scenes/board-v2.mjs` | `SCENES_V2` (`SCENES` with the ward) |
| `figures/gestures-v2.mjs` | `GESTURES_V2` (superset); `skeletonOfV2(name)`; `IDLE_LOOPS[gesture]` keyframes |
| `figures/marks.mjs` | `detentionTagSvg({prefix})`, `deadlineBadgeSvg({last, prefix})` (frame only; words are DOM text), `awayGhostSvg(character, skeleton, {outfit, prefix})`, `pairHighlightSvg({prefix})` |
| `scenes/lighting.mjs` | `darkMaskSvg(room)`, `fixtureSvg(room, frame)`, `emergencySvg(room, frame)`, `positionMarkerSvg(n, {state})` with state `preview`, `dark` or `chosen` |
| `scenes/command-console.mjs` | `consoleSvg({release, eject})` with each state `available`, `unavailable`, `activated` or `used`; `coverSvg(open)` |
| `scenes/jail-doors.mjs` | `blastDoorSvg(t)`, `keypadSvg(state)`, `airlockSvg(t)`, `spaceSvg()`, `exteriorSvg(t)` |
| `scenes/chamber.mjs` | `CHAMBER` scene; `chamberDoorSvg(t)` |
| `fx/fx.mjs` | `impactStarSvg()`, `sparkSvg(frame)`, `shieldSvg(frame)`, `ringSvg(t)`, `holoScanSvg(t)`, `droneSvg({arms, t})`, `ecgPath(kind, t)` with kind `stable`, `unstable`, `critical` or `flat`, `pulseSvg(tone)`, `suctionSvg(t)`, `memorialSvg(character, skeleton)` |
| `phone-kit/source/command-art.mjs` | Button plates, cover, USED stamp, history entry, Chamber chip |
| `contract/films.json` | Timeline data per film: beats, durations, easing tokens, reduced variant, layer, region, audience, proposed trigger, interruption rule |

**Rules for every module:**

- **Pure and stateless.** Inputs are public character drawing data, a skeleton, a state enum, a normalized time `t` from 0 to 1, and a prefix.
- **Never** a role, faction, seat secret, phase id, deadline, audience or command.
- Frontend maps authoritative facts to state and owns all timing. Because every function can draw any `t` from the current state, a film can be unmounted at any moment and redrawn settled.

### 7.2 Anchors

**Coordinate system:**

- Scene units stay 1024 × 768, as today.
- The normalized anchor `[u, v]` is the scene units divided by `[1024, 768]`.
- Screen position: `frameScene(scene, panel)`, then `toScene(slot, point)`, both existing functions.

**Slot record (proposal):**

```js
{
  id: 'H7',            // = the authoritative slotId (Backend)
  room: 'hospital',
  rosters: [7, 8, 9],  // H8: [8, 9]; H9: [9]
  feet:   [u, v],      // figure anchor
  press:  [u, v],      // from the place gesture: stable, never from the animated pose
  marker: [u, v],      // Blackout number (default = press)
  badge:  [u, v],      // detention tag and deadline badge (berth foot)
  fx:     [u, v],      // impact and shield centre (default = press)
  depth, scale, mirror,
  gesture: 'wardLie', down: 'wardLie+still',
  front: 'berth-7-front'   // scene layer drawn over the figure
}
```

**Slot rules:**

- Slot IDs come only from the server. Never infer them from array order.
- Every fixed slot of the room is drawn in every state, empty or not.
- Hospital: berths H1–H(roster), front row first. H8 and H9 exist only in rosters that large; their places show equipment otherwise. Never changes mid-match.
- Hit areas are at least 44 × 44 at `press`, from the place gesture. **They never follow decorative motion.**
- Board band heights are a function of the viewport, the roster and the text size only, in the new tuple.

**Board-level regions.** Frontend computes these from panel rectangles.

| Region | Location | Used by |
| --- | --- | --- |
| `spine-conduit` | Down the board spine, from the Command band to the Jail panel | S6/S7 pulse |
| `command-cinematic` | Right 45% of the Command band. Excludes C1's press rectangle and the Command tag. | Chamber inset, console inset, showdown title |
| `jail-cinematic` | The Jail panel, clipped | EJECT exterior |

### 7.3 Required server inputs per scene

All of these are proposals for Backend and Integration.

| Scene | Trigger | Audience | Minimum inputs |
| --- | --- | --- | --- |
| S1 Lighting window | Window phase in every normal round | Public; selection owner-private | `{windowId, previewEndsAt, endsAt}`; `seats[].slotId`; own `{windowId, boundRoom, selectable, selectedSlotId}`; batch entries at the attack stage |
| S2 Chamber | Hack stages | Pair public; claim participants-only | `hack.{hackId, participantSeatIds, stage, stageEndsAt}`; `phase.id` per stage; private feedback per `ba1842f` |
| S3 Clone | Own state change | Owner-private | `self.phantomClone.{state, activeThroughRound}` |
| S4 Blocked | Room fact | Room-visible | `{checkpointId, seatId}` sent only to authorized occupants |
| S5 Drone | Batch entry at the Rescue stage, Injured to Healthy | Public | `seatId`, `slotId`, `checkpointId` |
| S6 RELEASE | Captain-command fact | Public | `{commandEventId, kind, affectedSeatIds}`; destinations from state; allowance |
| S7 EJECT | Captain-command fact | Public | As S6, plus `clearedSeatIds`, the off-board representation and history order |
| S8 Buttons | Own offers | Captain-private; allowances public | `{release, eject}`: `available`, `unavailable(reason)` or `used` |
| S9 Injured | State | Public | `location`, `health`, `jailed`, `slotId`, due round, `round` |
| S10 Flatline | Batch entry at the medical-deadline stage, Injured to Eliminated | Public | `seatId`, `checkpointId` |
| S11 Insider | Own knowledge | Owner-private | `knowledge.insiderCandidates` (existing) |
| S12 Results | Existing | Public / participants | `lastTally` and result per `bd4d77c`; Hack per `ba1842f` |
| S14 Showdown | Phase and batch | Public; own shot private | `legalTargets` (cross-room), batch, result |

**Excluded from every input:** actor, ability or defense-cause fields. The stage tags are public structure.

### 7.3b Per-scene specification: frames, timing, sources, preview

**Audio policy, every scene:** none by default in person. Any future sound is identical across roles and causes, and never plays for room-visible or private effects.

**Interruption, staleness and reconnect, every scene:** as section 5, S15. Settle to the current state within 80 ms. Never replay.

| Scene | Anchors | Layers / clip | Start → emphasis → impact → settled (ms) | Duration and relation to server deadlines | Sources → derivatives | Preview / acceptance |
| --- | --- | --- | --- | --- | --- | --- |
| S1 Lighting window | Every slot's `marker` and `fx`; room panels | L3 masks clipped per panel; markers L3; shared and private strip L9; L6 untouched | Markers 0 → flicker 4200 → dark 5000 → impact R → lit R+520 | The 15 000 ms window is the server's. Visuals are locked to `previewEndsAt`/`endsAt`; lights return at the outcome (cap +1500). Easing: standard and snap; impact uses `impact`. | `lighting.mjs`, `fx.mjs`, `slots.mjs` → `lighting-dark-{room}.svg`, `marker-position-{state}.svg`, `fx-spark-{1..3}.svg` | 320–430 px. Marker rectangle equals press rectangle. Blue/Red identical. A round with no request identical. Reconnect mid-dark. |
| S2 Chamber | Participants' `feet` and `press`; `command-cinematic` | Ghosts L1; inset L8, clipped to its region; private panel L9 | Highlight at declare 0 → walk-out at result 0 → door 1000 → seated 2900 → loops through talk → exit | Result stage 5000 and talk 60 000 are the server's. The entrance stays inside the result stage; the exit is nonblocking (about 1700). | `chamber.mjs`, `gestures-v2.mjs`, `marks.mjs` → `chamber-*.svg` | The inset never covers tags or offered targets. The claim card is never covered. Observers get no claim. |
| S3 Clone (private) | Private sheet portrait | L9 only | Scan 0 → duplicate 400 → resolve 900 → vanish 1300 → chip 1800 | 1800 ms; immediate effect; no server clock involved | `fx.mjs` (holographic scan, duplicate) → `clone-*.svg` | Public DOM and network log identical with or without a Clone. |
| S4 ATTACK BLOCKED | Target's `fx` and `press` | L4, clipped to the panel | Incoming 0 → shield 120 → absorb 360 → return 620 → label gone 2420 | Starts at the checkpoint; never extends a phase. | `fx.mjs` (star, shield, ring) → `fx-shield-{1..3}.svg`, `fx-block-ring.svg` | Identical for both causes. Absent on the display and for outsiders. |
| S5 Drone | Berth `fx`; ward dock anchor | L3, clipped to the Hospital panel | Alert 0 → arrival 700 → scan 1900 → pulse 2900 → recovery 3500 → departure 4600 → settled 5500 | 5500 ms, nonblocking; the next phase is never delayed. | `hospital-ward.mjs`, `fx.mjs` (drone, scan, hologram, ECG) → `drone-*.svg`, `ward-*.svg` | Identical wherever the Cracker is. Reduced variant static. |
| S6 RELEASE | C1; `command-cinematic`; `spine-conduit`; Jail door | L1, L3, L8 | Console 0 → press 500 → pulse 800 → locks 1400 → door 1900 → walk 2500 → settled 4200 | 4200 ms, inside the Captain's turn; the turn timer keeps running. | `command-console.mjs`, `jail-doors.mjs`, `gestures-v2.mjs` → `console-*.svg`, `jail-door-*.svg` | No vote UI. Starts only from the fact. Detainees unaffected. |
| S7 EJECT | C1; cinematic regions; Jail slots | L1, L3, L8 (`jail-cinematic` clip) | Press 0 → alert 900 → lockdown 1500 → airlock 2400 → ejection 3300 → exterior 4400 → closed 7200 | 7200 ms, nonblocking | `jail-doors.mjs`, `fx.mjs` (suction, debris, memorial), `gestures-v2.mjs` → `airlock-*.svg`, `space.svg`, `exterior-*.svg`, `memorial-*.svg` | Detainees remain. History ordered. Reduced variant static. |
| S8 Buttons | Captain's sheet | L9 | Available → activated → sending → used, or unavailable | 120 ms local press; Used comes from the public allowance. | `command-art.mjs` → `button-{release,eject}-{state}.svg`, `cover-*.svg`, `stamp-used.svg` | Four states distinguishable without color. |
| S9 Injured | Berth `feet` and `badge`; monitor anchor | L1–L3 | Transfer move → into berth 600 → monitor on → loops | Loops run continuously. The badge comes only from the server's due round. | `hospital-ward.mjs`, `marks.mjs`, `fx.mjs` (ECG) → `berth-*.svg`, `monitor-*.svg`, `badge-frame.svg`, `tag-detained.svg` | No client timer. 7/8/9 berths. Neutral marker. |
| S10 Flatline | Berth monitor and bed light | L3 | Critical 0 → flat 1400 → shutdown 2400 → final 3800–4800 | 4800 ms, nonblocking | `fx.mjs` (flat ECG), `hospital-ward.mjs` (bed light) | Plays only for the medical-deadline stage. |
| S11 Insider | Private sheet | L9 | Existing assembly, 1020 ms | — | Existing dossier SVGs | Removal on blur, hidden or stale. |
| S12 Results | Existing | Existing | Existing | Vote result 5000 ms; Hack 15 / 5 / 60 s | Existing | Interplay with Menu. |
| S14 Showdown | `command-cinematic`; targets' `fx` | Title L8; impacts L3; blocks L4 | Title 0–1200 → registration → batch playback | The registration window is the server's. Playback is at most 900 ms per entry, capped at 6000. | `fx.mjs`; `command-art.mjs` (title frame) | Players stay in their rooms. The winner comes only from the state. |
| S15 Idle loops | Each slot's figure | L1, art only | — | Continuous; seeded; paused when hidden or reduced | `gestures-v2.mjs` `IDLE_LOOPS` | Hit areas identical from frame to frame. |

### 7.4 Layers and privacy

**Layer order, bottom to top:**

| Layer | Contents |
| --- | --- |
| L0 | Room art |
| L1 | Figures, depth-sorted |
| L2 | Scene front layers: berth rails, table, bench |
| L3 | Public room effects and lighting masks |
| L4 | Room-visible effects (mounted only for authorized recipients) |
| L5 | The viewer's own private board marks |
| **L6** | **Hit areas: transparent, never transformed, never under L3–L5 shake** |
| L7 | Room tags and captions |
| L8 | Cinematic insets: never over L6 targets the viewer is offered, or over L7 |
| L9 | Sheets: strips, tray, Card, Menu, private Hack panel |
| L10 | Top bar and navigation: never dimmed |
| L11 | System messages |

**Clipping.** Room effects clip to their panel. Insets clip to their region.

**Mounting conditions:**

- **Private layers** mount only after Frontend's checks: current phase and exchange identity, own audience, fresh view, trusted deadline, foreground.
- They unmount on blur, hidden, pagehide, stale or audience change (#127 §11, L1–L7). Receipt recovery is kept, and reopening takes an explicit tap on a current view.
- **Room-visible effects** mount only for the current checkpoint. They are never mounted on the display or host, never replayed, and leave no DOM residue.

**Bundles and channels:**

- Every effect asset ships in the common bundle; nothing is fetched by role or event.
- No role-correlated class names, accessible names or timing.
- Audio and haptics are off by default.

### 7.5 Dependency order

1. **Designer A1:** the slot table and ward on labeled fixtures. Frontend can build anchors and hit areas against them in parallel.
2. **Backend and Integration:** accept or reject BE1–BE12 (above all BE1 and BE2). Nothing ships to players before that.
3. **Designer films:** S1 and markers, S4, S9/S5/S10, S6–S8, S2, S3, idle loops and tokens, S14.
4. **Integration pins** each delivered module by name and hash, plus the token revision and the art-version acknowledgment.
5. **Frontend integrates** each scene behind the new tuple; historical tuples are unchanged.
6. **Joint verification** (section 8), then real-device measurement.

### 7.6 Acceptance criteria

1. **Authoritative triggers.** Every film starts only from an authoritative fact for the current phase or checkpoint and the right audience. A send or receipt alone never starts one. The exception is the Clone's own immediate private activation, after acceptance and the own view.
2. **Identical alternatives.** Blue and Red Blackout, and Clone and Protection blocks, produce identical DOM snapshot hashes, CSS, timings and asset requests.
3. **Stable hit areas.** Hit areas are identical in every frame of every film; at least 44 × 44; no overlaps; none under tags. Checked at 320 × 568, 360 × 740, 390 × 844 and 430 × 932, with all occupancy cases including Hospital 7, 8 and 9.
4. **Reduced motion.** Every film has a reduced variant without travel, shake, flicker or flips.
5. **No replay.** No replay after reconnect. An interrupted film settles within 80 ms.
6. **Private and room-visible content.** Absent from the display, the host and outsiders. Removed, not merely hidden, on blur, hidden, stale or an audience change.
7. **No hidden controls or pauses.** The board, Menu, timers and navigation stay usable during films. No film changes a deadline.
8. **New tuple.** No Final Zone, no release vote, no Hospital FULL.
9. **Hospital.** 7/8/9 berths by roster; a neutral detention marker; the gown over stripes; the badge only from the server.
10. **Flash safety.** At most three flashes per second; at most 25% of the panel.
11. **Historical tuples** render exactly as today.

### 7.7 Compatibility questions, with recommended resolutions

| # | Question | Recommendation |
| --- | --- | --- |
| FQ-1 | Do `dressedFigureSvg` and `outfitFor` change? | **No.** Exact pins. Detention is drawn by `marks.mjs`. |
| FQ-2 | Where does medical detention come from? | Derive it from `location === 'Hospital' && jailed`. Backend keeps `jailed` true for detainees. No new field. |
| FQ-3 | Who assigns slots? | Backend's stored `slotId`. Client allocators serve historical tuples only. |
| FQ-4 | How many Hospital berths? | `seats.length` (7–9) at match start; fixed for the match. |
| FQ-5 | What sets band heights? | Viewport, roster and text size only, not occupancy, in the new tuple. |
| FQ-6 | Event listener or view differences? | View differences plus checkpoint ids. Room-visible facts arrive as per-player items. Play only when the previous state was observed live. |
| FQ-7 | Do `RESULT_ART` and `HACK_ART` change? | No. Direct commands never use the vote result. The Chamber is a separate public module. |
| FQ-8 | Where does the Chamber appear? | `command-cinematic`, collapsing to a chip when the viewer's own UI opens or a target is offered. |
| FQ-9 | What do participants' board slots show during the talk? | The away ghost with its badge. The hit area is kept and occupancy is unchanged. |
| FQ-10 | Which slots get Blackout markers? | Every fixed slot in every room, numbered by slot order, styled identically. Pressable only in the eligible Disabler's bound room. |
| FQ-11 | When do the lights return? | Darkness holds until the round's outcome is published, capped at 1.5 s after `endsAt`. All rooms return together. |
| FQ-12 | Audio and haptics? | None by default in person. Any future sound is identical across causes. |
| FQ-13 | How are characters off the board represented? | A new explicit location value in the new tuple, plus an ordered history. Backend decides. |
| FQ-14 | How are assets loaded? | Everything in the common bundle; no conditional fetches. |
| FQ-15 | What about historical tuples? | Unchanged rendering, keyed by ruleset tuple, never mixed. |
| FQ-16 | What about #116's change to the pinned `abilities.css`? | Move it into `setup.css` before adoption. |
| FQ-17 | How are idle loops controlled? | Through the token revision; gated by visibility and reduced motion; never moving hit areas. |

### 7.8 Frontend keeps owning

- Current phase and exchange identity.
- Audience.
- Fresh view.
- Trusted deadline.
- Foreground checks.
- Private-content concealment.
- Receipt recovery.

The proposed modules contain none of this, which is what lets Frontend unmount or settle them at any moment.

**End of the Frontend handoff.**

---

## 8. Preview and verification plan

| Area | Cases |
| --- | --- |
| **Small phones and sizes** | 320 × 568, 360 × 640/740, 375 × 667, 390 × 844, 393 × 852, 414 × 896, 430 × 932; display 1280 × 720 and 1920 × 1080. With 7, 8 and 9 players. Hospital at 0–9 occupants; every other room at 0–5. |
| **Safe areas** | Simulated insets (top 47/59, bottom 34) on every viewport, plus real devices (notch, Dynamic Island, Android gesture bar). Tags, the top bar, navigation and the Chamber chip stay inside the safe area. |
| **Enlarged text** | 130% and 200% (browser zoom and OS dynamic type on devices). Menu, strips and tags reflow; anchors, markers and hit areas keep their geometry; the positions summary stays readable. |
| **Stable targets** | Measure every slot's press rectangle (≥ 44 × 44, inside its panel, no overlap, not under a tag): in every room and state; on every frame of every film, captured at 30 fps (rectangles identical while shake plays); during darkness (marker rectangles equal slot press rectangles); while the Chamber inset is docked or collapsed. |
| **Reduced motion** | The OS setting and an in-app switch, with a mid-film change. Each reduced variant shows no travel, shake, flicker or flip. Automated flash audit on captured frames: at most 3 per second, at most 25% of the panel. Loops off. |
| **Interrupted playback** | Hide, blur or pagehide mid-film. A newer state mid-film (the placement walk during the drone). A phase change during the Chamber entrance. Menu opened and closed during the vote result. An unknown receipt during a Captain command (no film). A Rescue and a flatline in the same checkpoint. EJECT immediately after a Chamber exit (the region hands over and the older film settles). |
| **Reconnect** | A fresh client against a continuous client: identical slot IDs and board, and no impact, drone, flatline, EJECT, Chamber entrance or Clone film replayed. Timers come from trusted deadlines. A reconnect in the middle of darkness shows the true remaining time. |
| **Private-content removal** | Blur, `visibilitychange` to hidden, pagehide, a stale phase or exchange, an audience change, a seat moved. The Hack panel, Clone art, Disabler selection strip, Insider board and Undercover notes leave the DOM. Command recovery is kept. Reopening only by an explicit tap on a current view (L1–L7, B1–B6). |
| **Disclosure (two- and three-client harness)** | Blue against Red Blackout; Clone against Protection block; room occupant against outsider against display; Cracker in Room A, Room B or self-rescue; pair publicity; no role words in public DOM or accessible names; identical network logs across roles. |
| **Performance** | Frame timing on a low-end Android device and an iPhone SE class device; SVG node counts per film; memory during a 60 s Chamber loop. |
| **Assistive technology** | VoiceOver and TalkBack: outcome announcements, the positions summary, marker names in the dark, focus never moved by a film. |

**Labeling.** Browser emulation is labeled emulation. Real-device results are labeled measured. **Neither proves multiplayer correctness or human balance.** Fixtures are labeled test-only and are never production authority.

---

## 9. Checks performed versus planned or not run

**Performed in this review (all read-only):**

- **Worktree:** `git status`, `log` and `rev-parse` on the worktree: clean at `5c9a151`, equal to origin.
- **Worktree list:** primary checkout, ten worktrees and one scratch tree.
- **`git ls-remote --heads origin`:**
  - 83 heads, with no specification branch.
  - Every preserved branch at the same SHA as its local copy.
- **Fetch:** `git fetch` of nine refs (working trees untouched).
- **Ancestry:** `abb6839` is not an ancestor of `origin/main`.
- **Paths:** `git diff --name-only abb6839..HEAD` shows only Designer paths (769 files).
- **Search for the specification:**
  - A filesystem search found no specification directory or files.
  - The 12 most recently updated GitHub issues and a semantic search found no specification.
- **Reading:**
  - The files listed in section 2.
  - Node one-liners that read JSON contracts and manifests, without writing anything.
- **Pin comparison:** SHA-256 of `abilities.css` in #116 is `c35301a2…`, against the pinned `cfcc1e29…`.
- **The brief:** extracted from this session's transcript into the scratchpad, to read it whole.

**Not run:**

- **Not needed, because nothing changed:**
  - Builds, tests, `npm run verify`, captures or prototype runs.
- **Not possible yet:**
  - Reading the specification packet, and mapping C-1 to C-11 onto G/Q.
  - Device, emulator or assistive-technology tests: there is no artwork or implementation to test yet.
  - Frontend or Backend acceptance of any proposal.
- **Not authorized by this assignment:**
  - Publishing an artifact.
  - Commenting on GitHub.

**PR #127.** Unchanged: still a draft, CI green after one re-run, subscription active, no new events.

**Nothing in this review is evidence of multiplayer correctness or human balance.**
