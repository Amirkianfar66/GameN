# Insider investigation board — browser-simulation evidence, 11 October 2026

This directory is the evidence for [insider-board.md](../../insider-board.md) (issue [#99](https://github.com/Amirkianfar66/GameN/issues/99)). The board shown is the **interim treatment**, pending the Designer's.

**How it was made.** The capture runs the release's own screen, controller, host, styles and art in the board simulation (`apps/game/dev/board/`). The simulation feeds them synthetic views that are checked against the protocol 2 schemas. All names are synthetic.

**What it does not cover.** This is Chromium device emulation at scale 1. No physical phone, backend, emulator or multiplayer run is involved, and none is claimed.

## Command

With `npx vite --config apps/game/dev/board/vite.config.mjs` serving `127.0.0.1:5178`:

```sh
CHROME_PATH=/path/to/chrome node apps/game/dev/capture-insider-board.mjs docs/frontend/evidence/insider-board-2026-10-11
```

- [facts.json](facts.json) has **18 measured steps, 0 with problems**. [capture-log.txt](capture-log.txt) is the run's log.
- Every phone step checks:
  - that the page does not scroll and nothing overflows sideways;
  - that the board toggle is at least 44 px tall;
  - the step's own expectations, listed below.
- The shared display is not a phone, so page scroll is not checked there, as in the board capture.

## Steps

At **320×568 and 390×844**:

| Step | Checked |
| --- | --- |
| `card` | The card opens with the toggle closed. No player is drawn, and the set is not written in the card |
| `board` | One tap shows three players in seat order (1 Ada, 2 Ben, 4 Dev). Each player and the role group lie inside the visible card. The roles are Undercover, Alien, Cracker; the toggle is expanded; focus is on the board heading, which is in view below the card's heading. No role word appears outside the card |
| `escape` | Escape closes the board, with focus back on the toggle and the toggle collapsed |
| `blurred` | With the board open, the window loses focus. The card closes and no board hook stays in the page |
| `reopened-card` | Reopening the card does not reopen the board |
| `stale` | With the board open, the simulation's listener goes stale. Board, toggle and sentence are gone, and the stale banner shows |

At **doubled reader text** (`Page.setFontSizes` standard 32, before load), 320×568 and 390×844:

| Step | Checked |
| --- | --- |
| `text-card` | As `card`. The toggle text wraps |
| `text-board` | The card scrolls inside itself. The top and bottom of every player, and of the role group, can each be scrolled into view, with nothing cut off sideways. The board heading is in view below the card's heading when the board opens |

Then:

| Step | Checked |
| --- | --- |
| `320x568-long-names-board` | Twelve-character names (`WWWWWWWWWWWW`, `Maximiliana`, `Konstantinos`) end in an ellipsis inside their columns. No element overflows visibly |
| `display` (1280×720) | The shared display, built from the public view. No board hook, toggle, sentence or role word |

## A defect the capture found and the fix

The first doubled-text capture of the committed code showed the board's top hidden under the card's sticky heading. The board is taller than the card at that size, so `scrollIntoView({ block: 'nearest' })` aligned the board's top with the card's edge, behind the heading.

The capture now checks that the board heading is in view below the card heading. Without the fix that check fails in two steps, `320x568-text-board` and `390x844-text-board`; with the fix it passes everywhere. The fix: after scrolling, the host scrolls the card back by any amount the sticky heading covers.

## Pre-existing findings, outside this change

Both are visible in this run and in [Integration's 9 October evidence](../board-recovery-2026-10-09/README.md):

- The stale banner's signal icon overlaps its "Reconnecting…" line at 320×568.
- At doubled text, the dock's Board and Actions labels touch.

They are left for a separate focused fix, so that this change stays reviewable on its own.

## Images

| Image | What it shows |
| --- | --- |
| [320x568-card.png](320x568-card.png), [390x844-card.png](390x844-card.png) | The card with the closed toggle above the role card |
| [320x568-board.png](320x568-board.png), [390x844-board.png](390x844-board.png) | The open board |
| [320x568-blurred.png](320x568-blurred.png), [390x844-blurred.png](390x844-blurred.png) | After losing focus: the board view, with the card and board closed |
| [320x568-stale.png](320x568-stale.png), [390x844-stale.png](390x844-stale.png) | A stale view: no board and no toggle |
| [320x568-text-card.png](320x568-text-card.png), [390x844-text-card.png](390x844-text-card.png), [320x568-text-board.png](320x568-text-board.png), [390x844-text-board.png](390x844-text-board.png) | Doubled reader text |
| [320x568-long-names-board.png](320x568-long-names-board.png) | Long names |
| [display.png](display.png) | The shared display |
