# Food Supply static art candidates

Issue #235, design #231 at `9bb497948861521030c37a8d2c60a6318f1745c9`.
These 37 unimported SVG files are prepared for the additive `design-0.9.0`
allocation. Integration has not admitted a runtime manifest or native renderer.

The room back is an exact source copy. The 36 operator files freeze the nine
public characters at both stations, alive and out, using the source's exact
poses, placement and cab clipping. Existing approved portraits are reused.

Source and output identities are in
`docs/frontend/food-supply-art-adoption.json`. Reproduce or check them with
Node 22.21.1:

```sh
node apps/game/dev/phone/food-art-export.mjs --check
node apps/game/dev/phone/food-art-export.mjs --write
```

The exporter imports the offline drawing graph only. The Task simulator,
fixtures, rules, practice bots and review media are excluded from the native
adoption. No production entry point imports these candidates.
