# Icons: one source

Every icon in the game comes from one file: [`design/phone-ui/components/icons.mjs`](../../../design/phone-ui/components/icons.mjs), the icon family `phone-ui-icons-1.x`.

The owner, 18 November 2026, giving the Designer team an agent for the bars and the icons:

> Icons means all Icons

The decision is recorded in [owner-decisions.md](../owner-decisions.md). This page covers:
- what counts as an icon;
- the source and its style;
- its copies and the one known clash;
- the older icon sets and where they still show;
- every icon of the family.

The test `packages/design-tokens/test/icons.test.mjs` keeps this page, the copies and the components honest.

- **Owner of the source:** Designer, the Bars & Icons builder. The Lead Designer reviews each change, and the owner approves every look.
- **Version:** `phone-ui-icons-1.2.0`, 79 icons. 1.2.0 adds the open painted form for the panels (`iconPaintedSvg(name, { open: true })`: the line drawing itself painted, nothing filled but a dot; the owner, 19 November 2026: "No background now, go ahead"), and changes no icon and neither earlier painted form. Before it: `phone-ui-icons-1.1.0`. The icons are unchanged since the phone pack of 9 November 2026; 1.1.0 adds [a painted form](#the-painted-form) of them (the owner, 18 November 2026).

## What counts as an icon

An icon is a small glyph that names a control, a tab, a state or a mark. For example:
- the top bar's Promises and ⋮;
- the tabs and the round button;
- the target bar's Cancel;
- an action's tile;
- a board tag's office;
- a row's chevron;
- a warning.

Every one of them comes from the source, by name.

Pictures are not icons. A film's frames, a painted panel, a role card's art, a room's furniture and a stamp's frame stay with their art and its release. Art may not stand in for an interface icon: where a screen needs an icon, it draws the family's.

## The source and its style

**The style:**
- a 24 × 24 grid, with 2 px of clear margin;
- 1.8 px round-capped, round-joined strokes in `currentColor`. A few parts are drawn heavier: `check` at 2.2 and `close` at 2.
- **The selected form:** the parts marked `fill` are filled, as a phone fills a selected tab's symbol. The parts marked `knock` are then cut out in `var(--ic-knock)`, the colour behind the icon.

**Every icon has an accessible name,** its `label`. An icon never carries meaning alone: the words go beside it, or in the control's own accessible name.

**The icons are original drawings for Game N.** No third-party icon set is used. No icon draws a role, a team, a faction or any hidden fact.

**The source's exports:**
- `ICONS`: name → `{ label, group, parts }`;
- `ICON_NAMES`, in the family's order;
- `ICON_FAMILY_VERSION`;
- `ICON_PAINTED` (1.1.0): the few shapes a painted icon adds to its line drawing, by icon name;
- `iconSvg(name, { filled, size, title, className })`: one icon as an SVG string. It is decorative (`aria-hidden`) unless `title` is given.
- `iconSprite()`: the whole family as `<symbol id="ic-<name>">` and `"ic-<name>-filled"`.

**Its users** are every Designer component:
- the kit (by name: its builders' `icon` input and `kit.icon()`);
- the phone shell, the room scene and the board tags;
- the role card and the entry parts;
- the panels, Actions and the rest.

They import it as `../icons.mjs`. The game takes it through each component, and Integration admits it once, in the room connection's source boundary.

## The painted form

**The owner's decision, 18 November 2026.** With a picture of the game's bottom bar:

> This is what i am thinking of bottom bar

And on its draft, drawn in the real bar:

> I am ok with this new bar

So from `phone-ui-icons-1.1.0` the family has a painted form, for the game's bottom bar ([the phone shell's page](phone-shell.md#the-painted-tiles)). No icon is changed: the 79 line drawings are as they were, and each pinned copy still agrees with the source.

**Where it is drawn:** `design/phone-ui/components/icon-paint.mjs`, beside the source. It is a runtime source and imports `icons.mjs` and nothing else.

| Export | What it draws |
| --- | --- |
| `iconTileSvg(name, { className, id, paint })` | The icon as a tile: the crew portrait's own frame (the same path, white rim, shadow and vignette), a warm orange ground, and the icon's drawing in cream over a brown line |
| `iconPaintedSvg(name, { className, id, paint })` | The drawing alone, painted in orange over a brown line, for a coloured ground such as the round button's amber |
| `TILE`, `TILE_FRAME_PATH`, `ICON_PAINTS` | The tile's box and half-size, its frame's path, and the two paints' names (`cream`, `ember`) |

**How an icon is painted:**
- **From its own line drawing,** so it keeps one silhouette. The parts are laid down three times: a soft shadow, the brown line a little wider than each part, then the paint. Parts the selected form cuts out (`knock`) are drawn as brown lines on the paint.
- **By hand, for one icon.** Panels is painted as three stacked sheets, the lowest the deepest. Their shapes are `ICON_PAINTED.panels`, in the source: the top sheet is the icon's own filled part.
- **Every icon of the family paints,** though only the bottom bar's are drawn in the game today: `board`, `room`, `actions`, `panels`, `card`, `pass` and `vote`.

**What a painted icon never is:**
- **A second drawing of an icon.** `icon-paint.mjs` writes no icon's path. The guard below scans it like any component.
- **A sign of a player.** The tile's ground is one fixed orange. The functions take an icon, a class, an id and a paint, and no colour, seat, character, role or team.
- **A picture file.** It is an inline SVG with its own ids, no inline style and no outside reference, so a page with a strict policy draws it.

**Decorative:** a painted icon is `aria-hidden`, as a line icon is. The control it sits in names itself with its words.

**Why `ICON_PAINTED` is beside the entries and not on them:** a copy of the family holds each entry exactly as the source does, and the Food release's copy is pinned. A new field on the Panels entry would make that copy differ.

## Copies

The test finds copies by what they hold, not from a list: any icons module, sprite or manifest of the family under `design/` or `apps/game/`.

**What each copy must do:** draw each icon it holds exactly as the source does, its parts, its name and its `iconSvg` output. A copy may hold fewer icons than the source, so the source can grow while a copy is frozen. Redrawing an icon a frozen copy holds fails the test until Integration refreshes that copy's pin.

| Copy | What it is | Frozen by | Until |
| --- | --- | --- | --- |
| `design/phone-ui/prototype/icons.mjs` | the pinned pack's icons | the Food consumer source (`docs/integration/food-consumer-source-2026-11-13.json`) | Integration lifts the Food pins; then it re-exports the source |
| `design/phone-ui/assets/icons.svg`, `icons.json` | the pack's sprite and manifest, generated from the prototype by `design/tools/phone-ui-assets.mjs` | the prototype | they are generated from the source once the prototype re-exports it |
| `apps/game/hosted/planet/food-icons.mjs` | the Food release's copy | the Food consumer source | stays with the frozen Food release |
| `design/phone-ui/components/food/food-icons.mjs` (#303, not yet merged) | the Food component's copy | — | #303 imports `../icons.mjs` in a follow-up, once #303 and #261 are both on `main` |

**Until Integration lifts the Food pins,** the pack's sheets (`design/phone-ui/sheets/sheet.mjs`) and `phone-ui-assets.mjs` keep reading the prototype copy, which the test holds equal to the source.

**Not copies:** `design/releases/**` holds frozen release bytes, historical evidence of pinned releases. They are never refreshed, so they are not held equal.

## Exceptions

The test finds an icon drawn inside a Designer component (`design/phone-ui/components/`, previews and reviews aside) by its size, not its look: a 24 × 24 viewBox, or one of the family's path strings, outside the source. It reads each component's scripts, stylesheets and SVG files, its `assets/` folder included, so an icon shipped as a file is found too. Art is not flagged. One exception is listed:

| Exception | Where | Why |
| --- | --- | --- |
| The round button's Voted badge: a check, `M6 12.6 10 16.6 18.4 8`, amber at stroke 3 on an ink disc | `phone-shell/phone-shell.css`; the same rule is in the pinned pack's `kit.css` and Food's `food-kit.css` | It is the pack's own rule (sheet 38), drawn pixel for pixel. Drawing it from `check` would change its stroke. |

## The one known clash: the game's own icons

`apps/game/hosted/planet/phone-controls.mjs` is Frontend's own icon set. It uses a 24 grid and a single 1.8 px path per icon, with no selected form, and draws about 30 icons differently from the family.

**Where it shows, on #307's `99c20a18`:** checked at 390 × 844 (below). It draws inside the sheets' contents, which the game keeps until release 3's components connect:
- Actions' tiles;
- the Panels list, Navigation, the Hospital panel, Promises and the Captain's commands;
- the pre-match Settings button.

**What retires it, in two steps:**

**1. Release 3, the match screens** (the Gameplay UI builder's, on `claude/designer-connect-match`):
- **Actions' tiles (#310, release 3's first step):** #310 draws them with Actions' part from the family.
- **The Panels list (#296) and the Captain's commands (#302).**
- **Every other use, after #310,** keeps `phoneActionIcon`, `phonePanelIcon` or `labelPhoneControl` until its component connects (`render.mjs` lines on #310's head `42902655`):
  - the Card sheet's offers (`:160`) — the Card sheet, #270;
  - Promises (`:184`) — #297;
  - the Blackout's dark sheet (`:250`) — Actions (#273), to be confirmed with the Gameplay UI builder;
  - the Panels list (`:252`) — #296;
  - Navigation (`:259`) — the office decisions, #300;
  - the Hospital panel (`:265`) — #306;
  - the Captain's plates (`:272`) — the Captain console, #302;
  - Actions' other offers (`:275`): the Officer's appointment and block (#300), the ballot (#267) and the declaration (#293).
**2. Release 4, before the match:** the pre-match Settings button (`app.mjs:69`). The pre-game screens are Codex's since 18 November (#311), and their connection is #308.

The test does not check `apps/game/`, which is Frontend's area. This page lists the clash until it ends.

## Older icon sets, superseded for the phone

These stay as they are for their pinned releases and records. Nothing new uses them, and the family supersedes them for the phone.

**What shows on screen.** The Planet app was checked at 390 × 844 on #307's `99c20a18`:
- art from `main` at `64e55516`;
- Frontend's phone harness, built as `design/tools/shell-connection-check.mjs` builds it, under the production headers;
- 21 scenarios, 180 screens: each scenario's start, the Board, Actions, Card and Panels, each panel, Promises and ⋮;
- 9 pre-match states, 57 screens: the role reading in each setup flow, choosing a character, the host's room, the shared display and the end. Each was taken at its start, 2.5 s and 5 s later, and after its buttons.

On each screen, every visible picture was listed and named by the custom property that defines it.

| Set | Where it is | What it looks like | Shows in the Planet app |
| --- | --- | --- | --- |
| The comic board markers, `design-0.2.0` | `design/exports/public-board/` and `player-ui/` (marker-captain, -health, -jail, -self, -turn; icon-location; icon-connection-stale; icon-private; icon-action-shot; pip-resource; tokens), from `design/source/markers`, `cards/ui-icons.svg` and `board/room-icons.svg` | 32 grid, ink baked in, strokes 2.2–2.6, ink and paper badges | **No.** The app imports `comic.css` (`app.mjs:16`) and `phone.css` (`app.mjs:22`), but nothing on screen draws these. `phone.css:112`'s `icon-private-closed-paper` is the role card's back, `.phone-role-back`, which only the earlier app's `role-confirmation.js` and `setup-controls.js` draw. |
| The ability icons, `abilities-0.7.0` | `design/abilities/assets/icon-action-*.svg` | 32 grid, ink baked in, strokes 1.4–3.6 | **No.** |
| Phone feedback | `design/phone-feedback/source/icons.mjs`, `ports/icons.mjs` and `assets/icon-*.svg` | 24 grid, 1.9 stroke, amber baked into the SVGs | **No:** no runtime file loads them. |
| The library art's icons | `apps/game/candidates/planet-library/*.css`, from `design/tools/library-assets.mjs` | 48 or 32 grid, multi-colour, strokes 1–5 | **Yes**, see below. |
| Glyphs inside films | the Captain's command plates (`commandIcon()`, `apps/game/hosted/board-v2-drawing/captain-fx.mjs:80`; `design/room-drawing/runtime/captain-fx.mjs:92` on #262) | a padlock (Release) and the eject sign (Eject), ink and colour baked in | **Yes**, see below. |

**The library icons that show,** each a clash like the game's own icons:

| Piece | Where it shows | The family's | Replaced by |
| --- | --- | --- | --- |
| `of-badge-blocked`, 16 × 16 | on the blocked person, in the room and on the Board (`render.mjs:333`, `planet.css:68`) | `block` | the board tags (#298), which draw the office and the block from the family |
| `of-glyph-officer`, 12 px | in the Officer's badge on the Board (`planet.css:70`) | `officer` | the board tags (#298) |
| `pr-kind-jail-vote`, `pr-kind-meet-a`, `pr-kind-meet-b`, 24 × 24 | each promise's kind, in the Promises sheet (`library.decoratePromise`) | `jail`, `room` (the meetings), `captain`, `officer`, `block` | the Promises component (#297) |
| `pr-seal-pending`, `pr-seal-not-fulfilled`, 24 × 24 | each promise's seal, in the Promises sheet | none: #297 shows the status as a pill, with `check` when fulfilled | the Promises component (#297) |
| `wn-lintel-a-b`, `wn-lintel-a-hospital`, 24 × 24 | each window's heading, in the Windows sheet (`render.mjs`, `renderWindows`) | `window` | the Windows component (#299) |
| `en-code`, 24 × 24 | the final Code's line, in the end result | `code` | the end scene (#271) and its Roles list (#304); not yet in a test release |
| `wn-station`, 28 × 17 | each window's place, in the room and on the Board (`planet.css:69`) | `window` | the Windows component (#299) with the room scene; not yet scheduled |
| The Captain's plates (`board-v2-film-captain-plate-*`), 358 × 46 | behind the Captain's Release and Eject tiles in Actions, beside the game's own icon on the same tile | `release`, `eject` | not by #302: the Captain console keeps the film's plates as its art, so their padlock and eject sign stay, while its confirm's "who" block shows the family's icons. That is a second clash. It ends only with the later proposal below. |

**Library pieces that show and are art, not icons:**
- the end banner (`en-banner-red`);
- the Hospital console (`hp-console`);
- the Navigation panel and its ship marker (`nav-panel`, `nav-ship`);
- the role file's props (`lib-ship-cartridge-sealed`, `lib-viewfinder`);
- the Engineer's device on the role card (`sw-device-engineer`);
- the Hospital rescue film's small frames.

**What the check is not:** desktop Chromium, not a phone; the harness's scenarios, not a live match.

**Planned moves, approved by the Lead on 18 November:**
- **The office badge** (`planet.css:68` and `:70`) moves to the family's `officer` and `block` when the board tags (#298) connect.
- **The Release and Eject glyphs in the room films:** a later proposal, only when the room films (#262) next change. They would be drawn from the family, coloured inside the plate. The before and after go to the Lead and the owner first. Until then the films keep `commandIcon()`, and the Captain console shows both drawings.
- **#303's copy** moves to `../icons.mjs` once #303 and #261 are both on `main`.

## Every icon of the family

**The columns:**
- **Line:** the line in `icons.mjs` where the icon is drawn.
- **Selected form:** whether `filled` changes it, and whether it has knocked-out lines.
- **Used by:** the components whose runtime files name the icon. It comes from a search over the open Designer branches on 18 November 2026, so a name passed through a look table can be missed. The test checks the name, group, accessible name and line, not this column.
- **Pack:** whether the pinned pack's `ui.mjs`, `art.mjs` or `screens-entry.mjs` also names it.

| Icon | Group | Accessible name | Line | Selected form | Used by | Pack |
| --- | --- | --- | --- | --- | --- | --- |
| `board` | navigation | Board | 22 | filled, knock-out | actions, phone-shell | yes |
| `room` | navigation | Room | 23 | filled | phone-shell, promises | yes |
| `actions` | navigation | Actions | 24 | filled | card, phone-shell | yes |
| `pass` | navigation | Pass | 25 | filled | actions, host-room, phone-shell | yes |
| `vote` | navigation | Vote | 26 | filled, knock-out | phone-shell, vote | yes |
| `card` | navigation | Card | 27 | filled, knock-out | phone-shell, role-stage | yes |
| `panels` | navigation | Panels | 30 | filled | phone-shell | yes |
| `menu` | navigation | Settings menu | 31 | outline only | phone-shell | yes |
| `shoot` | action | Shoot | 34 | outline only | actions, card |  |
| `protect` | action | Grant Protection | 35 | filled, knock-out | actions |  |
| `rescue` | action | Rescue | 36 | filled, knock-out | actions, card |  |
| `supply` | action | Supply | 37 | filled, knock-out | actions |  |
| `scan` | action | Scan | 38 | filled, knock-out | actions, card, hacker |  |
| `code` | action | Submit final Code | 39 | filled, knock-out | actions, hacker |  |
| `shipHack` | action | Hack Spaceship | 40 | filled, knock-out | actions |  |
| `suppress` | action | Suppress navigation | 41 | filled | actions |  |
| `blackhole` | action | Activate Blackhole | 42 | outline only | actions, phone-shell |  |
| `clone` | action | Activate Clone | 43 | filled | actions |  |
| `blackout` | action | Request Blackout | 44 | outline only | actions |  |
| `position` | action | Choose a position | 45 | filled | actions, room-scene | yes |
| `release` | action | Release | 46 | filled, knock-out | captain-console |  |
| `eject` | action | Eject | 47 | filled | captain-console |  |
| `appoint` | action | Appoint Officer | 48 | filled | none found |  |
| `block` | action | Block movement | 49 | outline only | office-decisions, promises | yes |
| `direction` | action | Choose tie direction | 50 | outline only | office-decisions |  |
| `acknowledge` | action | Acknowledge direction | 51 | filled | office-decisions |  |
| `talk` | action | Private talk | 52 | filled | actions, phone-shell |  |
| `declare` | action | Declare side | 53 | filled, knock-out | private-talk |  |
| `panel` | action | Hospital panel | 54 | filled, knock-out | actions, hospital-panel, panels |  |
| `promise` | action | Promises | 56 | filled | card, phone-shell, promises | yes |
| `window` | action | Windows | 57 | filled, knock-out | panels, windows |  |
| `draw` | action | Draw | 58 | filled, knock-out | none found |  |
| `show` | action | Show | 59 | filled | host-controls, role-stage, windows |  |
| `hide` | utility | Hide | 60 | outline only | card, host-controls, role-stage |  |
| `move` | action | Move | 61 | outline only | actions, card |  |
| `skip` | utility | Skip | 62 | filled | boarding-stage, office-decisions, role-stage |  |
| `captain` | status | Captain | 65 | filled | panels, promises, vote, board-tags | yes |
| `officer` | status | Officer | 66 | filled | panels, phone-shell, promises, board-tags | yes |
| `jail` | status | Jail | 67 | outline only | promises, vote | yes |
| `hospital` | status | Hospital | 68 | filled, knock-out | panels | yes |
| `injured` | status | Injured | 69 | filled | none found |  |
| `eliminated` | status | Eliminated | 70 | outline only | phone-shell |  |
| `self` | status | You | 71 | filled | none found |  |
| `turn` | status | Turn | 72 | filled | phone-shell, room-scene | yes |
| `timer` | phase | Time remaining | 75 | outline only | host-controls, phone-shell, role-stage | yes |
| `hourglass` | phase | Waiting | 76 | filled | boarding-stage, join-room, phone-shell, play-parts, Food | yes |
| `lit` | phase | Lights on | 77 | filled | phone-shell |  |
| `dark` | phase | Dark | 78 | filled | phone-shell | yes |
| `course` | phase | Setting course | 79 | filled | office-decisions, panels, phone-shell, ship-travel |  |
| `planet` | phase | Planet | 80 | filled | office-decisions |  |
| `flag` | phase | Arrival | 81 | filled | boarding-stage |  |
| `host` | entry | Host | 84 | filled, knock-out | display-settings, host-room, main-menu | yes |
| `join` | entry | Join | 85 | filled | host-room, join-room, main-menu | yes |
| `key` | entry | Recover | 86 | filled | main-menu, recover, Food | yes |
| `copy` | utility | Copy | 87 | filled | entry-parts, host-controls | yes |
| `check` | utility | Done | 88 | outline only | actions, character-select, entry-parts, host-room, join-room, kit, phone-shell, play-parts, promises, recover, role-stage | yes |
| `close` | utility | Close | 89 | outline only | phone-shell, windows | yes |
| `chevronRight` | utility | Open | 90 | outline only | kit, phone-shell | yes |
| `chevronLeft` | utility | Back | 91 | outline only | entry-parts, phone-shell | yes |
| `chevronDown` | utility | Show more | 92 | outline only | none found |  |
| `lock` | utility | Locked | 93 | filled | hacker, hospital-panel, join-room, private-talk, promises, vote | yes |
| `settings` | utility | Settings | 94 | filled | main-menu | yes |
| `players` | utility | Players | 95 | filled | actions, character-select, panels | yes |
| `rules` | utility | Rules | 96 | filled | panels |  |
| `retry` | utility | Try again | 97 | outline only | actions, host-controls, phone-shell, windows |  |
| `warning` | utility | Warning | 98 | filled, knock-out | actions, host-controls, kit, room-scene | yes |
| `info` | utility | Information | 99 | filled, knock-out | actions, card, character-select, kit, phone-shell, role-stage | yes |
| `offline` | utility | Offline | 100 | outline only | host-room, join-room, main-menu, phone-shell | yes |
| `bot` | utility | Bot | 101 | filled, knock-out | host-controls, host-room | yes |
| `display` | utility | Shared display | 102 | filled | host-room, join-room | yes |
| `phone` | utility | Player phone | 103 | filled, knock-out | join-room | yes |
| `motion` | utility | Reduce motion | 104 | outline only | display-settings |  |
| `textSize` | utility | Text size | 105 | outline only | none found |  |
| `sound` | utility | Sound | 106 | filled | none found |  |
| `leave` | utility | Leave | 107 | outline only | end-roles |  |
| `history` | utility | History | 108 | outline only | none found |  |
| `inbox` | utility | Offers | 109 | filled, knock-out | promises |  |
| `plus` | utility | Add | 110 | outline only | kit, promises | yes |
| `minus` | utility | Remove | 111 | outline only | kit | yes |

## Adding or changing an icon

**Adding an icon:**
- Draw it in the source only, in the style above, with an accessible name and a group.
- It is a minor version (the next is `phone-ui-icons-1.2.0`), with a row here.
- Draw it only when a released screen needs it. Two icons that older sets have, and the family lacks, wait for that: the Engineer's "capture" and "showdown".

**Redrawing an icon:**
- It changes its look, so it needs the Lead's agreement and the owner's approval first.
- The test then fails on every frozen copy that holds the icon, until Integration refreshes that pin.

**Removing or renaming an icon** is a major version.

**Before any of these:** draw the icon beside its neighbours on the pack's sheets, at both phone sizes.

## The test

`packages/design-tokens/test/icons.test.mjs`, in `npm run test:design`:
- **The source is the family:** every icon has a name, a group, parts and the 24 grid.
- **Every copy found by search agrees with the source:** the prototype, Food's copy, the sprite and the manifest today.
- **A planted copy fails** when it redraws, adds or renames an icon, or holds a sprite symbol the test cannot read. It passes when it holds fewer icons than the source. A copy under `design/releases/` is not checked.
- **No Designer component draws an icon of its own.** The Voted badge is the one exception, and it must still be needed.
- **A planted inline icon fails:** a 24 × 24 viewBox in markup, in `setAttribute`, in a CSS data-URI or in an SVG file under `assets/`, or a family path string. Art and the Voted badge pass, and so does a preview.
- **This page's table** has one row per icon, in the family's order, with its group, accessible name and line.

`packages/design-tokens/test/icon-paint.test.mjs`, in the same run (1.2.0; six tests, the sixth for the open form: every path is a line, only dots are filled, every part of the line drawing is there):
- **The family is 1.2.0** with the same 79 icons, and the bottom bar's icons are drawn as the pinned pack draws them.
- **The tile's frame is the crew portrait's own:** the same box and half-size, the path the crew drawing builds from its own numbers, and the frame, rim and shadow as three shipped portraits carry them.
- **Every icon paints** as a decorative drawing with its own ids, the same each time, with no inline style, script, link or outside picture.
- **A tile's ground is one fixed colour** and takes none from its caller. Every colour in a painted drawing is the tile's ground, its frame, or one of the two paints.
- **The painted shapes live in the one source,** and `icon-paint.mjs` writes no path of its own.
