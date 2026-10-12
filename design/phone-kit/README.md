<!-- mothership:dev-only -->
# Phone kit 0.1.0 (proposal, issue #121)

The Visual and Motion Designer's phone delivery of 12 October 2026, on top of the board-motion
prototype and the ability art at the integration baseline `abb6839`:

- **A · the shell**: navy framing, gold accents and gold room tags, a compact top bar (the round, who
  plays, the timer), and the bottom bar Board / Actions / a raised gold **Pass** / Card / Menu. Moves are
  room-tag taps, targets are taps on characters, and confirmations stay in the strip on the board, as
  before. No phone OS indicators are drawn.
- **B · the vote result**: the five seconds of `VOTE_RESULT`, public and aggregate only, for all seven
  outcomes, settled on a late join, an 80 ms fade in reduced motion.
- **C · the room clothes**: a patient's gown in the Hospital and a prisoner's striped suit in the Jail,
  for all nine characters in every gesture, by public location only.
- **D · the private Hack**: the target declares Blue, Red or Alien within 15 s, both see the claim for
  five seconds, then their full 60-second talk; private, concealed when the window loses focus, on the
  background, a stale view or an audience change, and drawn only from feedback bound to the current phase.

**Correction after review of PR #127 (same kit version; no picture, export or drawing source changed):**
`js/hack.js` draws only `hackFeedback` whose `phaseId` is the current phase's `id` and whose status and
side agree (`hackFeedbackProblem`); `../board-motion/js/app.js` conceals the private surfaces on a window
blur as on the background, and reopens them only on the player's own tap on a current view. The Hack
fields follow the contract as Frontend reviewed it at Backend's `ba1842f`, which is not on the remote.

Nothing here is owner-approved yet, in the reviewed manifest `design-0.2.0`, or a game rule.

## Where things are

| Path | What |
| --- | --- |
| `css/phone-kit.css` | The shell's look (tokens `--pk-*`), the vote result's and the Hack panel's styles. Loaded by `design/board-motion/index.html` after `board.css` and `abilities.css`. |
| `js/vote-result.js` | The vote result: model from `voteResult` and public seats, DOM, and the five-second timeline. |
| `js/hack.js` | The private Hack: the phase binding (`hackFeedbackProblem`), the model from `hackFeedback` and the view, DOM for every stage and step, and the claim's timeline. |
| `source/art.mjs` | Every picture of the vote result and the Hack (pure functions returning SVG). Editable source. |
| `../board-motion/figures/wardrobe.mjs` | The room clothes over the figure rig: `outfitFor(location)`, `dressedFigureSvg(...)`. Editable source. |
| `../board-motion/js/dress.js` | The prototype's hook that dresses the board's figures. |
| `assets/` | Generated: one SVG per picture and `manifest.json` (hashes, colors, audience, source hashes, tokens, wardrobe sheet hashes). |
| `contract/phone-kit.json` | The specification: components, inputs, anchors, hit areas, layer order, timings, reduced motion, settled and cancelled states, words. |
| `wardrobe.html` | Review sheet of the clothes: `?page=lineup` (front and back), `?page=hospital`, `?page=jail`; `&only=c1,c6`. |
| `contact.html` | The contact sheets of `review/` by group (`?group=shell|result|clothes|hack`). |
| `review/` | Generated captures, their measurements (`report.json`) and contact sheets. |

## Run it

From the repository root with Node 22.21.1 and npm 10.9.4, after `npm ci` and `npm run build`:

```sh
npm run dev:review --workspace @mothership/design-tokens        # serves design/ on 127.0.0.1
# then open /board-motion/?scenario=hack.declare  (or result.captain, clothes.waiting, …)
#      /board-motion/?scenario=board.idle&kit=0   (the same page before the kit)
#      /phone-kit/wardrobe.html?page=jail
npm run assets:phone-kit --workspace @mothership/design-tokens   # writes design/phone-kit/assets/
npm run check:phone-kit --workspace @mothership/design-tokens    # no browser
npm run flows:phone-kit --workspace @mothership/design-tokens    # clicks through the promises (Chromium)
npm run capture:phone-kit --workspace @mothership/design-tokens  # captures and measures (Chromium)
node design/tools/phone-kit-assets.mjs --sheets <dir>            # the wardrobe sheets, for an illustrator
```

The scenario picker groups them under **Vote results**, **Room clothes** and **Private Hack**; the
fixture panel's **Public facts** and **Private facts** play the vote closing, the result ending, the
Hack's windows, the partner's declaration, and Hack feedback delivered out of order (the exchange's
previous phase's, another exchange's, then the current phase's own again). Storyboard holds: `&play=result&t=<ms>` and
`&play=claim&t=<ms>` with `&freeze=1`. `&motion=reduced` for reduced motion, `&names=long` for
twelve-character names, `&safe=1` with `&chrome=0` for simulated safe areas.

Every name, seat, id (`fixture-result-*`, `fixture-hack-exchange-*`, `fixture-phase-hack-*`) and answer is synthetic. The stand-in
server answers as the fixture panel says; it decides nothing for the game.
