# The Insider's file — browser-simulation evidence, 11 October 2026

This is the evidence for [insider-file.md](../../insider-file.md) (issue [#99](https://github.com/Amirkianfar66/GameN/issues/99)): the Designer's Insider file (`abilities-0.1.0`, PR [#102](https://github.com/Amirkianfar66/GameN/pull/102) at `1453500`) played in the release's own phone.

The capture runs in the board simulation, which uses the release's own screen, controller, host, styles and art. It feeds them synthetic views, checked against the protocol 2 schemas, and a scripted command desk. The simulation also loads the Designer's kit, which the hosted build does not load yet. All names are synthetic. This is Chromium device emulation at scale 1, not a physical phone, screen reader, backend, emulator or multiplayer run.

## Command

From commit `788b42c`, with `npx vite --config apps/game/dev/board/vite.config.mjs` serving `127.0.0.1:5178`:

```sh
CHROME_PATH=/path/to/chrome node apps/game/dev/capture-insider-file.mjs docs/frontend/evidence/insider-file-2026-10-11
```

[facts.json](facts.json) has **41 measured steps, 0 with problems**. [capture-log.txt](capture-log.txt) is the run's log.

## What every step checks

- the page does not scroll, nothing overflows sideways, and the card cannot be scrolled sideways;
- every control in the file is at least 44 px;
- no role word appears outside the card.

A drawn file must also pass the Designer's checks (handoff section 11):

- three snapshots in seat order (the view lists them 4, 1, 2), built alike, with frames of one size;
- each snapshot shows its seat number, and nothing on it or in its accessible name names a role or points anywhere;
- one role group, `role="img"`, with the one accessible name, the three names in the rule's order, below every snapshot;
- the string is drawn;
- the crew cards are loaded;
- at the default text size, the file is wholly in view in the card without scrolling.

## Steps

| Steps | What they show |
| --- | --- |
| `*-board` | Before the card: the kit loaded once, no file in the page, the set not written |
| `*-assembling`, `*-file` | 150 ms into the first open (animations running), then at rest after 1.1 s (none running), focus on the card heading |
| `*-inspect`, `*-escape` | Snapshot 2 pressed: its public facts in an inspect card in view, focus on it. Escape: nothing pressed, focus still on it |
| `*-show-on-board`, `*-ring-over` | The card closed, no file in the page, Player 4 ringed on the own board, focus on Card. The ring is gone after 1.6 s |
| `*-reopened`, `*-live-again` | Opening the card again, and a view confirmed again after a stale one: the file at rest, nothing assembling |
| `*-blurred` | Losing focus closes the card: no file and no role word in the page |
| `*-stale` | A view the server no longer confirms: the closed folder and its words, no role card, no file, no role word |
| `*-text-*` | Doubled reader text at 320 and 390, and twelve-character names at 320: one column inside a card that scrolls. Every snapshot, the roles and the note are reachable, no name is cut, and the inspect card is brought into view below the sticky heading |
| `320x568-long-names*` | Twelve-character names: cut only with an ellipsis, said whole by each button and by the inspect card |
| `390x844-reduced-*` | Reduced motion: no more than the fade while opening; the inspected snapshot is not moved |
| `*-no-kit` | `?kit=off`, as the hosted build draws it today: the whole file in paper, ink and words with the crew cards, the kit neither loaded nor requested |
| `390x844-{seven,disable,tray}-*` | A Cracker, a Red Disabler and a Hacker: the same kit loaded, no file in the card, and a stale card that is the same folder, byte for byte, as the Insider's |
| `display` | The shared display: no kit requested, no file, no role word |

## Defects the capture found, fixed before the commit

- **The card could scroll sideways.** While the CLASSIFIED stamp lands from 1.9× its size, it reached up to 17 px past the card's right edge. The card now clips sideways overflow. The steps record what is clipped (`sheetClipsSideways`: 10 px at 320, 16 px at 390, during the assembly only).
- **The inspect card's top was hidden.** At doubled text on 320 px, the card's top slid under the card's sticky heading. The host now scrolls it back below the heading.

## Images

| Image | What it shows |
| --- | --- |
| [390x844-file.png](390x844-file.png), [320x568-file.png](320x568-file.png) | The file at rest |
| [390x844-assembling.png](390x844-assembling.png), [320x568-assembling.png](320x568-assembling.png) | 150 ms into the assembly |
| [390x844-inspect.png](390x844-inspect.png), [320x568-inspect.png](320x568-inspect.png) | A snapshot inspected |
| [390x844-show-on-board.png](390x844-show-on-board.png), [320x568-show-on-board.png](320x568-show-on-board.png) | Show on board: the character ringed |
| [390x844-stale.png](390x844-stale.png), [320x568-stale.png](320x568-stale.png), [390x844-seven-stale.png](390x844-seven-stale.png) | The closed folder, the Insider's and a Cracker's |
| [390x844-no-kit.png](390x844-no-kit.png), [320x568-no-kit.png](320x568-no-kit.png) | Without the kit, as the hosted build draws it |
| [390x844-reduced-inspect.png](390x844-reduced-inspect.png) | Reduced motion: the inspected snapshot ringed, not lifted |
| [320x568-long-names.png](320x568-long-names.png), [320x568-long-names-inspect.png](320x568-long-names-inspect.png) | Twelve-character names |
| [390x844-text-file.png](390x844-text-file.png), [320x568-text-file.png](320x568-text-file.png), [390x844-text-inspect.png](390x844-text-inspect.png), [320x568-text-inspect.png](320x568-text-inspect.png), [320x568-text-long-names-file.png](320x568-text-long-names-file.png), [320x568-text-long-names-inspect.png](320x568-text-long-names-inspect.png) | Doubled reader text |
| [display.png](display.png) | The shared display |

Two defects visible in these pictures are fixed separately in [#103](https://github.com/Amirkianfar66/GameN/pull/103), which is not in this branch's base:

- in `*-stale.png`, the connection banner's icon lies over its words;
- in `320x568-text-*.png`, the navigation labels run together at doubled text.

## Full verification

`npm run verify` passed with exit 0 on the clean commit `788b42c`, the commit these captures come from. [verification.txt](verification.txt) keeps the run's own summary lines.
