# Two phone defects found while capturing the Insider board

Issue [#99](https://github.com/Amirkianfar66/GameN/issues/99) (found there) · branch `codex/frontend-phone-polish` · base `1a92f3790e45622196014cc008544fc33c359c0a` (`codex/v1-board-release`, [#95](https://github.com/Amirkianfar66/GameN/pull/95)) · 11 October 2026

Both defects are visible in the base release and in Integration's own [9 October evidence](evidence/board-recovery-2026-10-09/README.md). They are fixed here separately from the feature work in #100 and #101, so the fix can be reviewed on its own.

## 1. The connection banner's icon lay over its words

**The defect.** On a phone, a stale view's banner ("Connection lost. Showing the last known state…") drew its connection icon on top of the third line of text, at 320×568 and 390×844 alike.

**Why.** `comic.css` draws the icon (public-board art) at the start of the banner and reserves `calc(var(--ms-space-3) + 36px)` of padding for it. The phone's own banner rule in `compact-phone.css` sets `padding: .5rem` with a more specific selector, which took that room away. The icon ended at 36 px (44 px at doubled text), while the words began at 8 px (16 px).

**The fix.** `compact-phone.css` gives the connection banner back its start padding, but only while the public-board art (and so the icon) is present: `[data-art~="public-board"]`.

## 2. At doubled text, navigation labels ran into each other

**The defect.** At doubled reader text on a 320 px phone, "Actions" was 74 px wide in a 64 px fifth of the navigation, and touched "Board" (a gap of −2 px).

**The fix.** The large-text block of `board-play.css` (`max-width: 18em`, the same block that already fits the Pass button's word) changes the four labels beside Pass:

- their side padding is dropped;
- their size becomes `0.5rem`.

They still grow with the reader's text, from 10.4 px at normal size to 16 px at doubled size, but each stays inside its own button. At 390 px they already fitted; they now keep a wider gap.

## Checks added

**Capture checks.** The shared capture measurements (`apps/game/dev/capture/board-measure.mjs`, used by the board, recovery and emulator captures) now report:

- a connection banner whose icon lies over its words;
- any navigation label that runs past its button.

On the unchanged base, the existing board journey reports 3 problems: `320x568-stale-pauses` and `390x844-stale-pauses` (the icon), and `320x568-enlarged-text` ("Actions"). With the fix it reports none.

**A style test.** `apps/game/test/board-play-style.test.mjs` asserts both rules. It fails without the fix and passes with it.

## Verification

See [evidence/phone-polish-2026-10-11/](evidence/phone-polish-2026-10-11/README.md).

No change touches contracts, tokens, Designer sources, root manifests or the lockfile. Browser emulation only; no physical device was tested.
