# Role stage and role card: Designer's runtime component

**Version:** `role-stage-0.1.0` and `role-card-0.1.0`. **Status (15 November 2026):** the interface is approved by the Lead Designer with the decisions below, and built: the component, its preview, probe, agreement with the pack, check and test, on the shared kit (`component-kit-0.2.0`) and the phone shell. It waits for the Lead's last review, then Frontend's on #4. It is not in the game yet: Integration first admits its files with the shell's graph. It is not a release.
- **Controls:** Ready, Skip film and Show role are kit buttons under the kit's control policy; the Ready stamp is the kit's accent pill.
- **The film:** Frontend's existing player plays it in `stage.film`. In the film's view the shell draws no bar and runs its stage edge to edge, so the shell's toast and banner sit over the film.
- **The canvas:** the shell's `backdrop: 'canvas'` in every view, so behind the bar's glass and below the stage the screen is the pack's phone canvas (`#10141C`), as sheets 17 and 18 sample it. The check reads a pixel outside the art in every card view.

**What it is:** the private 30-second role stage on the player's own phone, and the role card it shows, as the phone pack draws them. It is #222 item 6 (PHONE-PARITY). The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**Covers:**

| Sheet | States |
| --- | --- |
| 17 | 0:01 and 0:12, the card with "Your film starts in 0:19", Ready dimmed; 0:20, the 700 ms crossfade into the film; 0:26, the film; 0:30, "Hide your phone, then tap Ready", Ready usable |
| 18 | Concealed ("Role hidden", Show role); Reduce motion; missing art ("Picture unavailable · Your role is below") and missing film ("Film unavailable · your card stays up until Ready"); rejoined at 0:25 ("Rejoined · the stage carried on"); Ready · waiting ("6 of 9 ready", the Ready stamp on the card) |
| 31 | The card itself, face and back (hidden), fitted to its space: the Card sheet mounts the same card |

**Comparison parts** (`phone-ui-native-compare.mjs --list`): `role-card` (sheets 17, 31; differs today), `role-ready` (sheet 17; differs today). `role-film` and `boarding` are unchanged: the films are Motion & Cinematics', accepted in #266. The `card` part (sheet 31's sheet) belongs to the Card sheet's component, which mounts this card.

**What it does not cover:** the film's picture and captions (Motion & Cinematics', `design/pregame-films/`); boarding's waiting screens (sheet 19, my next item); the Card sheet's frame, segments, Knowledge and Resources (Gameplay UI).

## Files (proposed)

Designer's, runtime-safe, in `design/phone-ui/components/role-stage/`:

| Path | What |
| --- | --- |
| `role-card.mjs` | `mountRoleCard()`, `checkRoleCard()`, `ROLE_CARD_DEFAULTS`, `ROLE_CARD_VERSION`, `CARD_WORDS`, `personVariable()`, `deviceVariable()` |
| `role-card.css` | Every card style, under `.ms-own-card` (a new root class: today's game styles `.ms-role-card`, so the two never overlap) |
| `role-stage.mjs` | `mountRoleStage()`, `nextRoleStageInput()`, `stageNote()`, `ROLE_STAGE_DEFAULTS`, `ROLE_STAGE_VERSION`, `STAGE_WORDS`, `CROSSFADE_MS`, `CROSSFADE_REDUCED_MS` |
| `role-stage.css` | Every stage style, under `.ms-role-stage` |
| `preview/` | Development only: the preview on the pack's synthetic fixtures, the probe (`probe.mjs`) and the agreement with the pack (`agree.mjs`, against `prototype/screens-pregame.mjs`'s `roleCard()` and `role` screen) |
| `review/` | The check's captures and `check.json` |

**Uses unchanged:** `phone-shell/phone-shell.mjs` (the top bar, the toast and the reconnecting banner: the stage mounts a shell inside itself, so there is one top bar in the game), `icons.mjs`, and the shared kit, `kit/kit.mjs` and `kit/kit.css` (Ready, Skip film, Show role and the stamp, and the control policy). Both stylesheets start with `@import url("../kit/kit.css");`, and both roots carry `ms-kit`.
- **Show's eye is 44 px,** as sheets 18 and 31 draw it: the pack's `.cardback .ic` also reaches the eye inside its Show button. The card sizes it through its own part (`.ms-rc-back .ms-rc-show`), and the kit is unchanged.
- **Placing kit controls:** the components place them through their own parts only, at least three classes deep, so the place holds whichever stylesheet imports `kit.css` last. The art loads through the art bundles' existing variables: `--ms-asset-piece-crew-card-cN` (the person, `card-cN.svg`) and `--ms-asset-device-<id>-held` (the device; the Engineer's `--sw-asset-sw-device-engineer`). No new picture.

Tooling: `design/tools/role-stage-check.mjs`; test: `packages/design-tokens/test/role-stage.test.mjs`.

## Mount, update and dispose

```js
import { mountRoleStage } from '…/design/phone-ui/components/role-stage/role-stage.mjs';
import '…/design/phone-ui/components/role-stage/role-stage.css';
// role-stage.mjs imports role-card.mjs and the phone shell; import their CSS as well.

const stage = mountRoleStage(host, input, handlers);
stage.film;                  // the element the film plays in: mount the film player here (stays for the stage's life)
stage.layout();              // { size, bars: { top, bottom }, card: { width, height }, film: { width, height } }
stage.update({ ...changes }); // each key given replaces that key; the rest stay
stage.suspend(); stage.resume();
stage.dispose();             // safe twice; afterwards nothing fires and layout() is null
```

```js
import { mountRoleCard } from '…/role-stage/role-card.mjs';
const card = mountRoleCard(host, cardInput);   // fills its host, fitted with container units (sheet 31)
card.update(cardInput); card.dispose();
```

- **The host:** the element the pre-game screen fills, positioned and sized by Frontend. The stage appends one child, `.ms-role-stage`, which fills it, full-bleed (the film runs under the status bar, as sheet 17 draws it).
- **Each mount is independent:** a new match, setup or seat is a new mount after disposing the old one.
- On update, Ready, Skip film and Show role keep their elements and focus through clock ticks and label changes.

## Inputs

| Input | Audience | What |
| --- | --- | --- |
| `status` | Phone | `'live'`, `'stale'` (reconnecting: the shell's banner, Ready refused) or `'concealed'` |
| `interactive` | Phone | `false`: every control refuses taps |
| `reducedMotion` | Phone | The game's Reduce motion; the device's is honoured as well |
| `insets` | Phone | As the shell's |
| `viewer` | Phone | The seat id. When it changes, this viewer's inputs are dropped unless the same update gives the new viewer's |
| `clock` | Public | `{ elapsedMs, filmAtMs, endsAtMs }`, from the server's interval (`startedAt`, `roleFilmStartsAt`, `endsAt`; today 0, 20 000, 30 000). Given each tick; the stage never counts down by itself. `null` while the clock is not trusted: the strip and times are hidden |
| `view` | This viewer's | `'card'` (before the film, or the film unavailable or skipped), `'film'` (Frontend is playing the film in `stage.film`) or `'after'` (the stage has ended). Frontend decides it, from the same controller that decides whether the film plays; the stage only draws the 700 ms crossfade between them (80 ms under Reduce motion) |
| `film` | This viewer's | `'pending'` (before 0:20), `'playing'`, `'missing'` or `'skipped'`: which line sits under the card |
| `card` | This viewer's | `{ role, team, facts, character, device, art }`: the role's name as the projection gives it (`privateArea.role`); `team` `'Blue' \| 'Red' \| 'Alien'` from its faction; `facts`, one to three lines of Frontend's accepted copy; `character` `c1`–`c9` from the viewer's own identity; `device`, the held device's picture id from Frontend's existing map (`planetRoleLook(...).device`), `'engineer'` where the match carries the successor art, or `null`; `art` `'ok'` or `'missing'` |
| `ready` | This viewer's | `{ mode: 'ready' \| 'done', enabled, busy, reason }`. `enabled` is the server's offer; `'done'` once the viewer's own Ready is recorded (the stamp on the card, Ready secondary and unavailable) |
| `roster` | Public | `null`, or `{ ready, total }`: "6 of 9 ready", shown once this viewer is ready |
| `toast` | This viewer's | `null`, or `{ id, text, icon }`: "Rejoined · the stage carried on" on a late return, as the shell's toast |

**Privacy:**
- `card`, `ready`, `film` and `toast` are this viewer's. Concealed, the stage drops them and draws the card back with "Role hidden" and Show role; nothing private stays in the page or for a screen reader. Given again, they come back.
- `clock` and `roster` are public and stay: the clock keeps running while concealed (sheet 18).
- The stage never receives knowledge, resources or another seat's role.

**The stage decides nothing:** it does not work out when Ready opens, whether the film plays, or a reason. `enabled: false` and `reason` come from Frontend; Ready stays dimmed (sheet 17 at 0:01) until Frontend enables it.

### The card's input (`mountRoleCard`)

`{ face: 'up' \| 'down', role, team, facts, character, device, art, stamp: null \| 'ready', back: 'stage' \| 'sheet', show: { enabled, reason } }`. `face: 'down'` is the card back ("Role hidden" and Show role, or sheet 31's "Hidden" and Show with `back: 'sheet'`), and keeps no private field. Sheet 31's Card sheet passes the same input. The card fills its host's height and is as wide as 5 : 7 allows, never wider than the host, as the pack's `.card-area` and `.card-fit` do: on a phone it fills the space (358 × 571 at 390 × 844).

## Callbacks

Each reports a tap, and only that.

| Callback | When |
| --- | --- |
| `onReady()` | Ready. Frontend sends the `ready` operation |
| `onSkipFilm()` | Skip film. Frontend stops the film on this phone only (today `controller.skip()`); the stage keeps time |
| `onShowRole()` | Show role on the card back. Frontend reveals again when it is safe |
| `onRetry()` | The reconnecting banner's Retry (through the shell) |
| `onLayout(layout)` | The stage's parts changed size |
| `onFocusReturn({ intent })` | The focused control left (Skip film when the film ends): the focus is on the stage, for Frontend to move on |

Controls follow the shell's rules: one delegated listener; refused when unavailable, busy, stale or not interactive; focus kept with `aria-disabled`/`aria-busy`; the reason as the accessible description.

## Drawn

| View | Drawn (sheet 17/18) |
| --- | --- |
| `card` | The shell's top bar: "Your role · Only on this phone", the card icon, the clock (never amber); the two-part strip under it (20 s paper, 10 s amber); the card, large; "Your film starts in 0:19"; Ready, primary and dimmed |
| `film` | `stage.film` full-bleed; the clock as a chip at the top right; Skip film at the bottom right. No top bar |
| `after` | The top bar without a clock; the card; "Hide your phone, then tap Ready"; Ready usable. After Ready: the Ready stamp on the card, "6 of 9 ready", Ready secondary and unavailable |
| Concealed | The card back, "Role hidden", Show role; the clock and strip keep running; Ready refused |
| Missing art | The card's picture area: "Picture unavailable · Your role is below"; the text card stays |
| Missing film | The card stays through 0:30, "Film unavailable · your card stays up until Ready" |
| Skipped | The card, "Film skipped on this phone · the stage keeps time" |
| Stale | The shell's banner and Retry; Ready refused, described by "Controls return when the match is current" |
| Larger text | The card scales with container units; facts drop to one line, then none, as the pack's container queries. The card area ends where the foot begins: the pack's 120 px over the bottom at the Standard text, higher as larger text grows the note and Ready, so the note never runs into the card (measured from the foot; the fix of 16 November) |

## Frontend's connection

1. Mount the stage once while the setup is `reading` on the player's own phone; dispose on any exit.
2. Map `PlanetSessionModel`: `clock` from `setupClock` and `setup` (`startedAt`, `roleFilmStartsAt`, `endsAt`); `view` and `film` from the pregame controller's `sample()` and `skip()`; `card` from `ownRole` and the own member's `characterId`; `ready` from the own member's `ready` and the `ready` offer; `roster` from `members`.
3. Mount the existing film player (`pregame.mjs`'s scene and captions, with the runtime films) in `stage.film`. Its full-screen dialog and its own Skip are replaced by the stage's chrome: the stage's Skip film reports `onSkipFilm()`, which calls today's `controller.skip()`.
4. Leave no other Ready, role card or setup header active beside it.

## Decisions (the Lead Designer's review of `1b5a0289`, 15 November 2026)

The interface is approved with these decisions:

1. **The film player is Frontend's existing one:** the player that plays the films #266 restored (`apps/game/hosted/planet/pregame.mjs`, with the runtime films), mounted in `stage.film`. Motion & Cinematics does not rebuild the role films now. The stage owns the chrome only: the clock chip and Skip film.
2. **No ⋮** during the stage, as sheet 17 draws it.
3. **The facts are Frontend's accepted copy.** The pack's drafts stay in the preview only.
4. **The 20/10 split is always the server's:** `roleFilmStartsAt` → `clock.filmAtMs`, never constants. The probe draws an 18/12 split to prove the strip follows what it is given; a hard-coded 20/10 fails it.
5. **The toast over the film:** the shell takes `bar: null` and `edge: true` (#265). In the film's view the stage gives the shell `bar: null, tabs: null, edge: true`, and the film mounts in the shell's stage, edge to edge.
   - The shell's overlays (the toast, the reconnecting banner) keep the bar's place with or without a bar: the rejoined toast sits over the film, under its clock chip, as sheet 18 draws it.
   - The two `late` captures pass.

Also approved: the card's `device` from Frontend's `planetRoleLook(...).device` (one table), the `.ms-own-card` root, and Show's 44 px eye in the card's own part.

## Checks run on this version

**The fix of 16 November:** at the Largest text (200 %), the note under the card ran 16 px into the card's bottom, at both sizes; at the Large text (150 %) it touched it. The card area's bottom was the pack's fixed 120 px while the foot grew with the text. It now follows the foot, measured (`role-stage.mjs placeCard`): the larger of 120 px and the foot's top. At the Standard text nothing moves, and the agreement with the pack still holds to half a pixel. The check adds the 0:12 card at the Large and Largest text, and every card view asserts the note starts at or below the card.

On the clean commit named in `review/check.json` (the shell and kit at `05e2d1d0`, kit 0.3.0, with the shell's `backdrop`; the check on the shared `component-check.mjs`):
- **Tests:** `packages/design-tokens/test/role-stage.test.mjs` 9 of 9 (the check's record; the runtime-safe graph with the kit, scoped styles that place kit controls only through their own parts, the pack's words, the art's properties and Frontend's device map, the inputs' refusals, privacy, the line under the card); `test:design` 391 of 391; `test:tooling` 337 of 337; `check:toolchain`, `check:workspace`, `check:sources`, `typecheck` pass; `check-assets.mjs` 15 passed.
- **`node design/tools/role-stage-check.mjs`:** the preview bundled by Vite and served with the hosted game's production headers (SHA-256 `424e5dec8d595ac44d179f0e22f7bb42d51a1e84f8c7982676606e850754dcbb`, the same as the shell's and the room scene's).
  - **Captures:** twelve states of sheets 17 and 18, and the 0:12 card at the Large and Largest text, at 390 × 844 and 430 × 932, and sheet 31's card face up and hidden: **30 of 30 pass**. The card area's bottom is 120 px at the Standard text, 142 px at the Large and 164 px at the Largest, with the note below the card in every card view. In the film's view the stage gives the shell `bar: null`, `tabs: null` and `edge: true`: the film runs edge to edge, as sheet 17 draws it, and the rejoined toast sits over it, under the film's clock chip, as sheet 18 does (decision 5).
  - **The lifecycle probe:** 16 of 16 (15 as the page comes, 1 with the device's Reduce motion): focus (Show ending returns the focus to the card), refused taps, reconnecting, privacy, the clock and an 18/12 split, the film's element, the shell's bar leaving only under an opaque film and returning before it fades with the card held still, layout, dispose and motion. Deliberate breaks fail it: concealment keeping the card, a new viewer keeping the last one's, a hard-coded 20/10 split, the bar leaving before the film is opaque.
  - **The agreement with the frozen pack** (`screens-pregame.mjs`'s role screen beside the stage, the same moment): **9 of 9 cases** agree to within half a pixel in every part (the bar, the clock, the strip, the card, its picture, person and device, its words, the card back, the line, Ready's place and availability, the stamp).
  - **Page health:** no page errors, no failed requests, no unexpected policy report.
- **Not run:** physical phones, Safari, screen readers, frame rate and the real app's connection.

## Not in this version

| What | Waiting on |
| --- | --- |
| Frontend's review and connection | The Lead's review of this interface, then #4 |
