# Phone interface pack

`mothership:dev-only` · a design proposal for owner review, 9 November 2026 · **synthetic fixtures only**

The complete phone interface of the Planet game, from the owner's playtest feedback. Every screen, tab and important state has its own numbered sheet, and there is a clickable prototype. The overview, decisions and checks are in [docs/design/phone-ui.md](../../docs/design/phone-ui.md); the Frontend handoff is in [docs/design/phone-ui-handoff.md](../../docs/design/phone-ui-handoff.md).

| Path | What it is |
| --- | --- |
| `prototype/` | The editable source: `index.html` (the clickable prototype; `?s=<screen>&…` draws one state), `kit.css` (the shared components, tokens 0.5.0), `screens.css`, `icons.mjs` (the icon family), `ui.mjs` (components), `art.mjs` (the game's own art and placement, read-only), `fixtures.mjs` (synthetic), `screens-*.mjs` (every screen) |
| `sheets/` | `catalog.mjs` (the numbered sheets and their frames), `sheet.html` (one sheet), `contact.html` (all of them) |
| `assets/` | Reusable exports: `icons.svg` (sprite) and `icons.json` (names, accessible labels, hashes), written by `design/tools/phone-ui-assets.mjs` |
| `review/` | The rendered sheets (`sheets/*.jpg`), the contact sheet, `checks.json` (every frame measured) and `inputs/` (two review images from PR 197, with provenance) |

```sh
python3 -m http.server 8000      # then open http://localhost:8000/design/phone-ui/prototype/index.html
node design/tools/phone-ui-render.mjs        # every sheet, the contact sheet, checks.json (CHROME_PATH)
node design/tools/phone-ui-assets.mjs --check
node --test packages/design-tokens/test/phone-ui.test.mjs
```

Nothing in the game imports this directory. It reads the game's drawing modules and art and changes none of them. A picture here is desktop Chromium at a phone's CSS size, not a device check.
