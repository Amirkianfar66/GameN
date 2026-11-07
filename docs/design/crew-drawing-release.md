# Crew drawing release: the approved crew for runtime adoption (DSN-REQ-17)

**From:** Visual and Motion Designer (issue [#4](https://github.com/Amirkianfar66/GameN/issues/4)). **For:** Frontend (the port) and Codex Integration (registration, pins, bundles). **Release:** `crew-drawing-1.0.0`, a candidate after `design-0.6.0`. **Base:** `main` at `d2933b08eff0e5bd00cfbdf1730b81a007f1c646`, which contains the owner-approved pilot (PR #191, merge `5f1a1ce97570ddc3304b7b286ddd8ebbc3d8b0be`) and crew (PR #192, merge `d2933b08eff0e5bd00cfbdf1730b81a007f1c646`). **Date:** 7 November 2026.

The owner approved the restyled crew of nine on 7 November 2026 ([owner-decisions.md](owner-decisions.md), [character-pilot.md](character-pilot.md)). The appearance is settled. This release packages it so that Frontend can port exact reviewed sources with permitted import rewrites, and Integration can register it. It changes no gameplay, rule, skeleton, gesture, walk, easing, timeline, layout slot, place or public character id. It deploys nothing.

Where everything is: [design/crew-drawing/README.md](../../design/crew-drawing/README.md). In short:
- `source/` is the drawing to port.
- `assets/` holds the baked exports, with `assets/manifest.json`.
- `release-candidate.json` is the machine-readable handoff.
- `review/` holds review media, never imported.
- `design/character-pilot/` is the prototype the owner reviewed. It is **not** part of the release, and nothing in the runtime may import it.

## Contents

1. [What to look at](#what-to-look-at)
2. [Inventory: every surface that shows a character](#inventory-every-surface-that-shows-a-character)
3. [Runtime exports and their hashes](#runtime-exports-and-their-hashes)
4. [Porting](#porting)
5. [Drawing API](#drawing-api)
6. [Mounting](#mounting)
7. [Caching](#caching)
8. [Motion](#motion)
9. [Views, clothes and health](#views-clothes-and-health)
10. [Baked art and CSS properties](#baked-art-and-css-properties)
11. [Tokens 0.5.0 and the art-release candidate](#tokens-050-and-the-art-release-candidate)
12. [Performance budget](#performance-budget)
13. [Checks performed](#checks-performed)
14. [Limitations and open items](#limitations-and-open-items)
15. [After the port: the Designer's review](#after-the-port-the-designers-review)

## What to look at

| File | What it shows |
| --- | --- |
| [`review/preview-full.mp4`](../../design/crew-drawing/review/preview-full.mp4) | 12 s, silent, in three parts. **Idle:** the nine blink, each on their own schedule, and drift; Mira's hair and Echo's locs follow. **A move:** the game's exit, walk and arrive (900 ms). **Places, views and health:** the Hospital gown, the Jail's suit, Injured, Eliminated, looking down, turned away. Drawn through the release's mounting interface. |
| [`review/preview-reduced.mp4`](../../design/crew-drawing/review/preview-reduced.mp4) | The same clock with reduced motion. Poses and blinks stay. Drift and hair swing stop. A move is placed with the game's 80 ms fade instead of walked. |
| [`review/compare.png`](../../design/crew-drawing/review/compare.png) | Today's drawing and the release's, surface by surface, at the game's sizes. Covers the board, work and back views, the Hospital and the Jail, health, the walk at the capsule's size and the phone kit's vote stage. Also every crop of the cards: picker, lobby slot, phone-kit avatar, ability chip, trial cast, dossier photo and the role card with its device. Then the standees, the films' effects and the app icons. |

## Inventory: every surface that shows a character

The Frontend inventory and performance budget the request mentions did not reach this session: the message carried no attachment, and no copy is in the repository, its issues or its pull requests. This inventory was taken from the code on the base commit. It should be reconciled with Frontend's when that arrives.

| Surface | Runtime today | Drawn with | With the release |
| --- | --- | --- | --- |
| Board pieces (comic board) | `apps/game/hosted/scene-board.mjs` | `dressedFigureSvg`, `outfitFor`, `CREW` | Swap two imports; same calls |
| Board v2 scene and the capsule's figures | `apps/game/hosted/board-v2-scene.mjs`, and `board-v2-films.mjs` for the capsule film (poses from `board-v2-drawing/capsule-figures.mjs`) | the same | Swap two imports |
| Moves (exit, walk, arrive) | `apps/game/hosted/comic-motion.mjs` | the same, rebuilt every animation frame | Swap two imports; cache poses ([Caching](#caching)) |
| Films: role, Captain, medical, Clone, blackout | `apps/game/hosted/board-v2-films.mjs`, with `board-v2-drawing/captain-fx.mjs` and `clone-fx.mjs` | the same, plus `memorialSvg`, `outlineSvg`, `halftoneSvg` on the figure's text | Swap two imports; the effects take the new figures (tested) |
| Phone kit vote stage | `apps/game/hosted/phone-kit.mjs` | `dressedFigureSvg`, `CREW` | Swap two imports |
| Selection (picker), lobby slots, confirmed character | `comic-layout.css`, `phone.css` (`--ms-role-person`, `--crew-picture`, `--phone-crew`) | `--ms-asset-piece-crew-card-cN` | New cards, same property |
| Crew lists: phone-kit avatar, ability chips, trial cast, dossier photo, phase bar | `claude-phone-kit.css`, `ability-drawing.css`, `ability-art.css`, `private-card.css` | the card, cropped (`50% 22% / 175%`, contain, cover) | New cards: the face sits where the old one did (tested) |
| Role card | `comic.css` (`--ms-role-person` + `--ms-role-device`) | the card and the held device | New cards; devices with the new suit's sleeve |
| Comic board standees | `comic.css` (`--ms-piece-standee`) | `--ms-asset-piece-crew-standee-cN` | New standees, same stand, clamp and anchors |
| App icons | none today | — | New: `assets/portraits/`, or `crewPortraitSvg` live |
| Films art catalog: 27 crew drawings | `apps/game/hosted/board-v2-film-art/` (memorial, outline, halftone × 9), built into the films stylesheet | nothing reads them | **Retire** them ([below](#baked-art-and-css-properties)) |
| Planet library videos and posters | `apps/game/candidates/planet-library/*.mp4`, `*.webp` | ships, planets, the rescue drone | No characters: unchanged (checked frame by frame) |
| History and prototypes | `design/source/crew/`, `design/exports/` (old cards), `design/phone-feedback/assets/`, release snapshots | — | Unchanged: kept as history, not shipped by this release |

PR #190 (the openings, a draft) is not on the base. Any character it draws goes through the same imports.

## Runtime exports and their hashes

Full records: `design/crew-drawing/release-candidate.json` (sources, ports, dependencies, consumers) and `design/crew-drawing/assets/manifest.json` (SHA-256 `751b1ae94d45654832454e36bfbe36bbf1816a8d31d0e6372b71d0dc6b464a98`). The tokens candidate `packages/design-tokens/src/tokens-0.5.0.json` has SHA-256 `cfd8604611196fa6799367e1b438570ec96e914f937859199629317a4ac8ac5d`. The release follows `design/releases/design-0.6.0.json` (SHA-256 `eeb4a88c7b71166a1c9782231ccd7fa81931cb50eed112e3d6153a862751bec4`).

**Sources to port** (17 files). The runtime SHA-256 is that of the port: the source with its first line removed and its imports rewritten.

<!-- sources:start -->
| Source (`design/crew-drawing/source/`) | Source SHA-256 | Runtime file (proposed) | Runtime SHA-256 | Imports rewritten |
| --- | --- | --- | --- | --- |
| `crew.mjs` | `ac1634f0ac43a8c0a8e1b3adf0cd2803b983d7c2c868f0497724e108795ff043` | `apps/game/hosted/crew-drawing/crew.mjs` | `108685e795f20100e9fdbba4d03d15a9825487d761a469e6cbf62a2a8697d0c0` | none |
| `ink.mjs` | `19c4de465cce69a33f2c0018a6fa01b673f5886f7c8e699810e6c7e867b33aac` | `apps/game/hosted/crew-drawing/ink.mjs` | `96d73713f5d1ce3d7d3126c0df0d4660ea0cc1091553ebb13c6e54b7483cc7c6` | none |
| `heads/vega.mjs` | `ee61eaad800b04631ab4dbbfffda62dc792bcef8c876f7504a2d44e478165656` | `apps/game/hosted/crew-drawing/heads/vega.mjs` | `99bf51b375c60b857fd71a36433b84e1a4e767da6366752aa08ed1277ed8c4ff` | none |
| `heads/rigel.mjs` | `803a3c768d8eb21634d0a3f37953fb4788008f471bd7f4a14f1526aa76289898` | `apps/game/hosted/crew-drawing/heads/rigel.mjs` | `ec5b2197530c581d8eaa7dbb1152ad795c7118993f6f374108f09f2fcbc5cf5f` | none |
| `heads/lyra.mjs` | `dc9271377889eaf171812ef306c5fc30bc2467b26f0100e60188c6aac5cd7ab7` | `apps/game/hosted/crew-drawing/heads/lyra.mjs` | `39e6609847417994edf7c17ce25e46a0d9a349654cb02790e7b7f5a20ffa44d1` | none |
| `heads/atlas.mjs` | `1909d4a10c5bc28f4e7e44406c8f06d5130dd287bfde8fb3f153070fd5fe0cd1` | `apps/game/hosted/crew-drawing/heads/atlas.mjs` | `33e1c9250ab863bfa3cf9cddc40275b296938b4c8fa3c82db8abf68d1943b268` | none |
| `heads/orion.mjs` | `a37e4340d38f46d5c618746f424e7992339645b0f63e27d887b04d29cce5151e` | `apps/game/hosted/crew-drawing/heads/orion.mjs` | `7c0a2053f250ba030fe4aac4cb16e7334ec5b14379cc8333f61498d2e4fd25b5` | none |
| `heads/nova.mjs` | `4380e7e76071ba74f6db2f69600ba239fa13d3907b914523704191dcadf5338f` | `apps/game/hosted/crew-drawing/heads/nova.mjs` | `cf3304025eb6243d2aacfaaece05d027c5733569b671b6463e71972c531c43d6` | none |
| `heads/juno.mjs` | `b9da5c07018ff73f7f222e056b8d7236eb2034b8cfc48ff7d56a6b4ca89942cb` | `apps/game/hosted/crew-drawing/heads/juno.mjs` | `4aa9f9600b1413ee8e2d55923be0ccfbe0c94e6624e438ecb435c5a46fe9e0ad` | none |
| `heads/mira.mjs` | `21244acd174f1728b405c28086a0c9df50f89a214f8ff00d076397e7b3ccd523` | `apps/game/hosted/crew-drawing/heads/mira.mjs` | `8e410ed0422df3a8da91109d7770637680da7e3d2bb53b323c38314a14b8da69` | none |
| `heads/echo.mjs` | `3c8f99652e244b9f8c6b98f13f21249795c4fd106dfb5485695558488d5b0abf` | `apps/game/hosted/crew-drawing/heads/echo.mjs` | `8f11f3764ce45676f11d5d56bae0ef6d72c081a888245696e1455c799a023a15` | none |
| `head.mjs` | `1e02ddc6535e460f078289dd00c2b70642c6f7afcc324bea3ac90c8441ba917b` | `apps/game/hosted/crew-drawing/head.mjs` | `7e560235d95f173ac885e17b0a587c29fc60c9e705effda3149d4904fc6e353f` | none |
| `figure.mjs` | `d61e1ee54161829fcb812b72e57c965523de6da6c84702ee848a84372fc23a90` | `apps/game/hosted/crew-drawing/figure.mjs` | `fcaa9fd62acb2f2a0378c63605ab52450cced0d10591c2ca786af422f6c0f968` | `../../board-motion/figures/body.mjs` → `../scene-drawing/body.mjs` |
| `wardrobe.mjs` | `5ce2a7530cfb7d3cfc41153d29a33894ed4a74afbd9b88cb30a6e38d9eadca17` | `apps/game/hosted/crew-drawing/wardrobe.mjs` | `d1de51191efb793ae484fe5a0ef9b10e530b43ea2e227aa093d07cf6ce25fa9b` | `../../board-motion/figures/body.mjs` → `../scene-drawing/body.mjs`, `../../board-motion/figures/wardrobe.mjs` → `../scene-drawing/wardrobe.mjs` |
| `motion.mjs` | `405f22b75eb027d4408c3d0d9c5f328f01711e8363f69e7517ee7fa4160dd280` | `apps/game/hosted/crew-drawing/motion.mjs` | `fe753aa1be111f99e98ef146e0c648d1f9e6b3f9726e312ca38bcc3be040c5fe` | none |
| `mount.mjs` | `acbd90c17bf45906b4376fe270443343d31e77f9491fc6be0701b10a9a98ea35` | `apps/game/hosted/crew-drawing/mount.mjs` | `2b82c0d2b099d7426fb51a26633f03d7a462b88cc925f8969375dd3369bda427` | none |
| `portrait.mjs` | `2e6573f3ad1b9ac1493a976effe910aff4fc692c91d18b43940b6fe4a9611a61` | `apps/game/hosted/crew-drawing/portrait.mjs` | `5bed8cf83872c8680d7c334f9416296ac09f467d87e8cd6c0c0510b6972eeacc` | none |
<!-- sources:end -->

**Dependencies:** the rig's modules the release imports, unchanged and already ported.

<!-- dependencies:start -->
| Dependency | SHA-256 (pinned in design-0.6.0) | Runtime copy | Runtime SHA-256 | Why |
| --- | --- | --- | --- | --- |
| `design/board-motion/figures/body.mjs` | `9d081fc4926d07dd1d56e90bd5452ed05052a806f2d33212a1b76c8e107fc958` | `apps/game/hosted/scene-drawing/body.mjs` | `82762010294c652f13a592a3f6de9117400bc18df414557492bec47b7d84b513` | FRAME (the figure's box) and ORDER (the parts' order) |
| `design/board-motion/figures/wardrobe.mjs` | `1c30862d77ce7fa94275934467c5b596e68dbe0d41f3d102bd0c040bc5feca6f` | `apps/game/hosted/scene-drawing/wardrobe.mjs` | `312c4cda048585f9270b3de095e2dcf44dc0dadd4c73392b1206da303ae8ddc3` | OUTFITS and outfitFor, re-exported unchanged (what is worn where) |
<!-- dependencies:end -->

**Baked exports** (36 files). Review media under `review/` are not exports.

<!-- assets:start -->
| Export (`design/crew-drawing/assets/`) | Bytes | SHA-256 | Replaces (CSS property) | Box |
| --- | --- | --- | --- | --- |
| `cards/card-c1.svg` | 88,461 | `2aaa54ecdcb82bc41ad28115802579a7cfe2057656e4553d464d4197d7531b51` | `--ms-asset-piece-crew-card-c1` | `8 0 84 96` |
| `standees/standee-c1.svg` | 89,709 | `33a64e41cc77a880284241db8d65890433654ab0e9d0bfcf266ee7d5182b3489` | `--ms-asset-piece-crew-standee-c1` | `0 0 96 120` |
| `portraits/portrait-c1.svg` | 93,676 | `fd4c98883ec490d46ac7fedd71e982df797304cb95087020f40e819502e3e54b` | new: `--ms-asset-crew-portrait-c1` (proposed) | `-64 -64 128 128` |
| `cards/card-c2.svg` | 93,203 | `4bdcda99d1f878f99cc287e3dc9a1ebf272c1be5ffbb310d6136cffe918c1cfd` | `--ms-asset-piece-crew-card-c2` | `8 0 84 96` |
| `standees/standee-c2.svg` | 94,451 | `fe57bf16329768b0e31166e839f61f56c985af0d0d0399e62a8224b086c63d46` | `--ms-asset-piece-crew-standee-c2` | `0 0 96 120` |
| `portraits/portrait-c2.svg` | 98,418 | `3223b2dc2a6cc123c1ac9cd7cce192e9ab490fdee33cec543fd80502e258e80a` | new: `--ms-asset-crew-portrait-c2` (proposed) | `-64 -64 128 128` |
| `cards/card-c3.svg` | 73,565 | `89f99bea141b00cf0918504fa88813a879eb08624420b2c20378db4f4e5734ca` | `--ms-asset-piece-crew-card-c3` | `8 0 84 96` |
| `standees/standee-c3.svg` | 74,813 | `1af73d5cefc13293b4413b113ee197eb23d1a9159f24a11305a9d525dcbcb43d` | `--ms-asset-piece-crew-standee-c3` | `0 0 96 120` |
| `portraits/portrait-c3.svg` | 78,780 | `aa506742eea4186398318d2df95b3b971351dbbf51a9602bd48795b5cc962d96` | new: `--ms-asset-crew-portrait-c3` (proposed) | `-64 -64 128 128` |
| `cards/card-c4.svg` | 61,491 | `0eb3c449c91b62ecaae5ea65d5b7d8291d66dd8f313f3e01e80a5b9bfa3a0e0c` | `--ms-asset-piece-crew-card-c4` | `8 0 84 96` |
| `standees/standee-c4.svg` | 62,739 | `65ee38894f32e58a47c6e5d19c1d05b826812e72c678de5af6812b1eb662c5a0` | `--ms-asset-piece-crew-standee-c4` | `0 0 96 120` |
| `portraits/portrait-c4.svg` | 66,706 | `6d6d9947449d161a1c0e85f6503b082bc0cbce9200fdc964b0ab8fa5d7cefa62` | new: `--ms-asset-crew-portrait-c4` (proposed) | `-64 -64 128 128` |
| `cards/card-c5.svg` | 80,069 | `c321479ff18fd5d6384ae2dc41d37ba35de682c10e6a477e93987a8c156458cc` | `--ms-asset-piece-crew-card-c5` | `8 0 84 96` |
| `standees/standee-c5.svg` | 81,317 | `8491013791bc0a6ffea7b82ff0f7b678544830e2a3011cf022e4e087bff267da` | `--ms-asset-piece-crew-standee-c5` | `0 0 96 120` |
| `portraits/portrait-c5.svg` | 85,284 | `cef27f3cb26a70449e8869cd7961268997fd46d9d412f1df82343e50d14a68f9` | new: `--ms-asset-crew-portrait-c5` (proposed) | `-64 -64 128 128` |
| `cards/card-c6.svg` | 65,129 | `f2663394f46587dff30960a23833e5acf522f92282f8801e976e769fc0e9fe64` | `--ms-asset-piece-crew-card-c6` | `8 0 84 96` |
| `standees/standee-c6.svg` | 66,377 | `f96240e8192ae138d8fa77565bc5c54d8677601389d3c5d728dc35dd9a8b8316` | `--ms-asset-piece-crew-standee-c6` | `0 0 96 120` |
| `portraits/portrait-c6.svg` | 70,344 | `1c0d246d9ad4694e0b38b9a64bfa6e7ece0eecee9678d83c0f6f164d60247a1f` | new: `--ms-asset-crew-portrait-c6` (proposed) | `-64 -64 128 128` |
| `cards/card-c7.svg` | 78,015 | `18413d441f999987af27304fdacde798931ac98b61e1b3aa5e91cdaed462e0bd` | `--ms-asset-piece-crew-card-c7` | `8 0 84 96` |
| `standees/standee-c7.svg` | 79,263 | `bae28f764192127424e0d6a2935804d9ecfcc11a92b129471975be0b59ff8b7f` | `--ms-asset-piece-crew-standee-c7` | `0 0 96 120` |
| `portraits/portrait-c7.svg` | 83,230 | `a85e050f8a993a5d1011bea788821c13c5cafd386e897eeb671df33262e47e2e` | new: `--ms-asset-crew-portrait-c7` (proposed) | `-64 -64 128 128` |
| `cards/card-c8.svg` | 66,664 | `fa97839916fcf1392ebbe0c95b1bbc051d85c8afe433f4effb44ee11150f097b` | `--ms-asset-piece-crew-card-c8` | `8 0 84 96` |
| `standees/standee-c8.svg` | 67,927 | `1538e534e4f0072cf64105f2f7314638678701e64a005afecc6b95934ea47541` | `--ms-asset-piece-crew-standee-c8` | `0 0 96 120` |
| `portraits/portrait-c8.svg` | 71,899 | `9a1aa01e38dd098f3157ca05ee79703db5b1ddb82c6c3ae123fbf718502977c8` | new: `--ms-asset-crew-portrait-c8` (proposed) | `-64 -64 128 128` |
| `cards/card-c9.svg` | 71,904 | `a2b3d12f0c4f33d6a4b9a0d7f2bba1aae73e89e60468b45a16233278c70c8eb8` | `--ms-asset-piece-crew-card-c9` | `8 0 84 96` |
| `standees/standee-c9.svg` | 73,167 | `82a5d8afbc3cc8d82273335abc8d0d01488f77b01c0bde9121fec57225488c16` | `--ms-asset-piece-crew-standee-c9` | `0 0 96 120` |
| `portraits/portrait-c9.svg` | 77,139 | `ed5916f4f4b6a137862f0e061c696e58b5a26ba5fc62a6d7b2db9f3d00a84cf9` | new: `--ms-asset-crew-portrait-c9` (proposed) | `-64 -64 128 128` |
| `roles/device-alien.held.svg` | 2,065 | `b430162392aa6d555630c612613f6402f6a0ffd857edb72118f505e61ea80cec` | `--ms-asset-device-alien-held` | `0 0 120 140` |
| `roles/device-blue-disabler.held.svg` | 2,350 | `89cb324d7eb7d2cb0dcca375cacad90992a4c537ccff8fafc4c9b98bb242347e` | `--ms-asset-device-blue-disabler-held` | `0 0 120 140` |
| `roles/device-cracker.held.svg` | 2,977 | `80b480a7c49c431bebe5e9585c770892d8a7d1bf591f341f5b1168b142336c04` | `--ms-asset-device-cracker-held` | `0 0 120 140` |
| `roles/device-hacker.held.svg` | 2,648 | `188a946a2e8605c667cf8cf4e7237df4ad7f0b372370ae8cfeed73a4c0d85cce` | `--ms-asset-device-hacker-held` | `0 0 120 140` |
| `roles/device-insider.held.svg` | 2,375 | `1a09f0cb52069dbd11aaeb4999510b12f5f62db4f947e3b9e7fca3338274fbbd` | `--ms-asset-device-insider-held` | `0 0 120 140` |
| `roles/device-officer.held.svg` | 2,736 | `023c24fedea1f0718d0fd26dec384133a814b13883b9aa09c869537fdc99e801` | `--ms-asset-device-officer-held` | `0 0 120 140` |
| `roles/device-red-disabler.held.svg` | 2,342 | `df3d0bef877be503028b3f7ddd09b83905519083f53e1236c6ead52c33dcb2f1` | `--ms-asset-device-red-disabler-held` | `0 0 120 140` |
| `roles/device-supplier.held.svg` | 2,459 | `91f27b4e064e5b9ca879fa24f9c492fd3b476e58c3569dc7b957340aaa000fd2` | `--ms-asset-device-supplier-held` | `0 0 120 140` |
| `roles/device-undercover.held.svg` | 2,349 | `c5a464be85641ee96427a7ce75098a7799fe27594e0edd0ed008f437ef21d38e` | `--ms-asset-device-undercover-held` | `0 0 120 140` |
<!-- assets:end -->

## Porting

- **The rule.** A runtime file is its source with the first line `// mothership:dev-only` removed and the import specifiers below rewritten. Nothing else changes. `portOf()` in `design/tools/crew-drawing-export.mjs` is the rule as code; `runtimeSha256` is its result.
- **Rewrites:**
  - `'../../board-motion/figures/body.mjs'` → `'../scene-drawing/body.mjs'`
  - `'../../board-motion/figures/wardrobe.mjs'` → `'../scene-drawing/wardrobe.mjs'`

  Every other import is relative inside the release (`./`, `./heads/`).
- **Where:** `apps/game/hosted/crew-drawing/`, with `heads/` inside it. The drawing-port fence does not list that directory yet (`DRAWING_DIRECTORIES` in `design/tools/lib/drawing-port-fence.mjs`). Integration adds it with the port pins, or chooses another place and tells Designer, who will update the record.
- **The fence's other rules hold.** No port has a string literal naming a prototype, and no port's text contains `board-motion` or `design/abilities` once ported (tested on every file). Comments name the rig's modules by file name only.
- **The consumers.** `scene-board.mjs`, `comic-motion.mjs`, `phone-kit.mjs`, `board-v2-scene.mjs` and `board-v2-films.mjs` each swap two imports: `./scene-drawing/crew.mjs` → `./crew-drawing/crew.mjs` and `./scene-drawing/wardrobe.mjs` → `./crew-drawing/wardrobe.mjs`. The calls stay the same. The rig's own `scene-drawing/` files stay. They still give the skeletons, gestures, walk, easing and frame.
- **The dependencies** are the rig's `body.mjs` and `wardrobe.mjs`, at the hashes `design-0.6.0` pins. The release reads `FRAME`, `ORDER`, `OUTFITS` and `outfitFor` from them and never changes them.

## Drawing API

From `wardrobe.mjs` (the drop-in for the rig's):

- `dressedFigureSvg(c, sk, { outfit = 'crew', prefix = 'f', layer = 'body', inline = true, header = '', motion = {}, art = null, live = false })` takes the rig's arguments and returns what the rig's returns: one SVG in the rig's frame (`viewBox -90 -40 300 300`, floor at 233).
  - `inline: false` with `header` gives a standalone file with an XML declaration.
  - `c` may be the release's `CREW` entry or the rig's: a rig entry is matched by its call sign.
  - Three options are new: `motion` (the head's blink, drift and hair), `art` (shared heads) and `live` (attribute hooks).
- `outfitFor(location)` and `OUTFITS` are the rig's own, re-exported: what is worn where is unchanged.
- `figureSvg(c, sk, opts)` is the crew suit, as the rig's `figureSvg`.

From `crew.mjs`:
- `CREW` lists the nine by public id, with the rig's call signs and flags, plus the new drawing's colours.
- `CREW_ORDER`, and `crewMember(c)`, which resolves a rig or release entry.
- `SUIT` (the suit's tones) and `CREW_DRAWING_VERSION`.

From `portrait.mjs`:
- `crewPortraitSvg(c, { prefix, motion, size, art, live })` is the approved app icon.
- `crewCardSvg(c, { prefix, motion, art })` is the card, in the old card's box `8 0 84 96`, with the face where the old card had it.
- `crewStandeeSvg(c, { prefix, motion, art })` is the card in today's stand and clamp, in `0 0 96 120`, with today's anchors (`STANDEE_ANCHORS`).

From `mount.mjs` and `motion.mjs`: below.

## Mounting

- **One prefix per mounted figure.** Every id a figure defines starts with its `prefix`: clip paths, patterns, gradients and, with inline art, its head. Two mounted figures with different prefixes share no id (tested). Give every mounted instance and every layer its own prefix, as the runtime does today (`scene-${seat}-body`, `travel-${seat}-front`, `bv2-${seat}-${place}-${layer}`). A figure mounted twice under one prefix breaks the second's clip paths, because the browser resolves `url(#…)` to the first match in the document.
- **Two layers, as today.** `layer: 'front'` draws what passes in front of furniture, for a skeleton with `hasFront(sk)`. Each layer is its own SVG, with its own prefix.
- **Shared heads (optional).** `crewArtDefs({ ref = 'crew-art', ids })` returns a hidden SVG whose `defs` hold each traced head once, as `crew-art-cN`.
  - Put it once in each document that mounts figures: the page, each shadow root and each iframe.
  - Then draw with `art: { ref: 'crew-art' }`. Each figure is 30 to 62 KB smaller, and its head is a `<use>`.
  - A figure whose SVG text is rewritten afterwards must keep the default inline art: the films' `memorialSvg`, `outlineSvg` and `halftoneSvg` recolour and rename what is in the text.
- **Live hooks (optional).** With `live: true`, the head's group, each eye's lid and lash, and the hanging hair carry `data-crew-head`, `data-crew-lid="i"`, `data-crew-lash="i"` and `data-crew-hang`. A frame then changes attributes, not markup ([Caching](#caching)).
- **Mirroring** stays the runtime's CSS `scaleX(-1)` on the figure's element.

## Caching

The new figures are heavier than today's:

| Build of one figure (Node 22.21.1 on the render machine; not a phone) | ms | KB |
| --- | --- | --- |
| Today's rig, standing | 1.06 | 21.4 |
| Release, standing, inline art (the default) | 5.34 | 106.3 |
| Release, standing, shared art and live hooks | 4.99 | 63.3 |
| Release, a walk phase, shared art | 4.29 | 62.0 |
| Release, Hospital gown on the bench, Injured | 2.04 | 79.0 |

Rebuilding every figure every frame, as `comic-motion.mjs` does for a move, costs about five times as much script and DOM work as today. Three levels avoid it, and none changes the drawing:

1. **Heads once per document:** `crewArtDefs()` and `art: { ref }`.
2. **A pose once per mounted figure:** `poseKey(c, sk, { outfit, layer, inline, art, live })` names a drawing. Equal keys give equal markup, apart from the prefix, and the prefix is not in the key. Keep a map from key to markup per mounted figure (seat and layer), and set `innerHTML` only when the key changes.
   - **The walk:** the game samples `walkPose(phase)` with a continuous phase. Keep the phase to sixteenths, `walkPose(Math.round(phase * 16) / 16)`, so that a cycle is 16 poses per character, outfit and limp, drawn once.
   - At 60 fps a 225 ms cycle is 13.5 frames, so sixteenths show no step. The exit and arrive blends can be kept to 30 ms steps the same way.
   - Nothing else about the walk changes: stride 17, the timings and the easing.
3. **What moves, by attributes:** with `live: true`, `crewFrame(c, sk, motion)` gives `{ head, lids, hang }` for a frame. `applyCrewFrame(svgElement, frame)` sets them on each mounted layer and returns how many attributes it set. Blinks, the idle drift and the hair's follow-through then never rebuild a figure. A frame set this way equals the figure drawn with that motion: the test compares every attribute for all nine at four times.

```js
import { crewArtDefs, poseKey, crewFrame, applyCrewFrame } from './crew-drawing/mount.mjs';
import { crewMotion, hairFollow, isStill } from './crew-drawing/motion.mjs';
import { dressedFigureSvg } from './crew-drawing/wardrobe.mjs';

document.body.insertAdjacentHTML('afterbegin', crewArtDefs());        // once per document
const ART = { ref: 'crew-art' };

function show(node, c, sk, outfit, layer, prefix) {                    // when the pose may change
  const key = poseKey(c, sk, { outfit, layer, art: ART, live: true });
  if (node.cache === undefined) node.cache = new Map();
  if (node.key !== key) {
    if (!node.cache.has(key)) node.cache.set(key, dressedFigureSvg(c, sk, { outfit, layer, prefix, art: ART, live: true }));
    node.innerHTML = node.cache.get(key);
    node.key = key;
  }
}
function frame(node, c, sk, now, { reduced, gesture, follow }) {      // every animation frame
  const motion = crewMotion(now, c.id, { reduced, still: isStill(gesture), follow });
  applyCrewFrame(node.firstElementChild, crewFrame(c, sk, motion));
}
```

The review page draws its motion stage this way (`design/crew-drawing/review.mjs`). Desktop timings for nine figures (Chrome on the render machine; script and DOM with layout forced, paint not included; not a phone):

| Nine figures, one frame | ms |
| --- | --- |
| Today's rig, rebuilt every frame | 17.18 |
| Release, rebuilt every frame, inline art | 93.56 |
| Release, rebuilt every frame, shared art | 83.97 |
| Release, poses cached (walk in sixteenths), live attributes | 12.15 |
| Release, idle: live attributes only | 0.19 |

In the game, only the seats that move rebuild, usually one at a time. Their figures rebuilt every frame cost about five times today's work, and with poses cached they cost less than today's. An idle board with live attributes costs a fraction of a millisecond here. If a phone needs more:
- keep each walk pose's parsed element mounted and show one at a time, so a move parses nothing per frame;
- prepare a seat's 16 walk poses when its figure is first drawn, not on the move's first frame.

## Motion

All of it is drawn on the head; the body's movement is the rig's.

- **Blinks** (`blinkAt`, inside `crewMotion`):
  - Irregular, every 2.4 to 4.6 s, 170 ms each: quick to close, slower to open.
  - Each character has their own schedule, so the nine do not blink together (tested).
  - `seat` gives a second figure of the same character another schedule.
- **Echo** has no lids: Echo's eyes are behind the visor, so a blink draws nothing and no lid hooks exist (tested).
- **Idle drift** (`idleDrift`): the head moves a little and tilts; the body stays still.
- **Hanging hair:** only Mira's hair and Echo's locs hang below the jaw (`hasHangingHair`).
  - At idle, the ends answer the drift half a second late.
  - On a move, `hairFollow(id)` is a damped spring. Each frame, call `step(dtMs, x, y)` with the head's position in the figure's units, the figure's travel across the board included. It returns `{ sway, lift }`: the ends trail the head, overshoot a little and settle (tested).
  - When the figure is mirrored, give it positions in the mirrored frame, as the review page does.
  - Pass the result to `crewMotion` as `follow`.
- **Reduced motion** (`reduced: true`, from the person's setting or `prefers-reduced-motion`):
  - Every meaningful pose and every blink stay; the drift and the hair's swing stop (tested for all nine).
  - The game's own reduced motion is unchanged: no flight, a move placed with an 80 ms fade.
- **A character gone still** (Eliminated: the rig's `down`, `slumpDesk`, `slumpBench`, or any gesture marked `+still`): `isStill(gesture)` is true, and `crewMotion(…, { still: true })` moves nothing.
- **Cadence:** drive frames from `requestAnimationFrame` while the board is visible, and stop when the document is hidden. The blinks and drift are pure functions of time, so a resumed board picks up where the clock is.

## Views, clothes and health

- **Views** come from the skeleton (`sk.view`), as today:
  - `front` is the three-quarter view; its eyes open and blink.
  - `down` looks down, with the lids lowered.
  - `back` is turned away: no face and no lids.
- **Clothes** follow the public location through the rig's own `outfitFor`, unchanged:
  - the crew suit everywhere;
  - the patient's gown in the Hospital;
  - the banded suit in the Jail.
- **Health** marks are the rig's `skeletonOf` marks:
  - `+injured` adds the bandage, and the sling where the gesture has one (`benchSling`).
  - `+still` drops the head and closes the eyes.
  - Eliminated on the deck is `down`.

  Every gesture in each outfit, with each mark, draws a well-formed figure (tested, 243 combinations, plus front layers and the walk).
- **What is shown is unchanged:** nothing in the drawing says a role, a team, an ability or a status beyond the public health marks the rig already draws. Every colour drawn keeps at least 30 (CIE76) from each faction accent (tested).

## Baked art and CSS properties

Swap each set whole, all nine, in one change. Integration builds them into the bundles from `assets/manifest.json`, whose `replaces` names the shipped file and property of each.

| Set | Files | Replaces | Anchors |
| --- | --- | --- | --- |
| Cards | `assets/cards/card-c1.svg` … `card-c9.svg` | `--ms-asset-piece-crew-card-cN` (public-board bundle) | Box `8 0 84 96` and `faceCenter` [48, 38], both kept. The eyes sit inside the 30 px face crop (`50% 22% / 175%`) for all nine (tested) |
| Standees | `assets/standees/standee-c1.svg` … | `--ms-asset-piece-crew-standee-cN` | Box `0 0 96 120`. Origin [48, 104], tag [48, 116] and the marker slots are kept: today's stand and clamp, new card |
| Held devices | `assets/roles/device-<role>.held.svg` (nine) | `--ms-asset-device-<role>-held` (roles bundle) | The sleeve and glove change from the old suit's grey `#C6CDD4` to the new suit's canvas `#DCCDB2`. Nothing else changes (tested byte for byte) |
| App icons (new) | `assets/portraits/portrait-c1.svg` … | none: proposed `--ms-asset-crew-portrait-cN` in public-board | A 128 × 128 box, the superellipse frame of half-size 54 |

**The films art catalog's 27 crew drawings** (`memorial-cN`, `outline-cN`, `halftone-cN` in `apps/game/hosted/board-v2-film-art/`) are built into the films stylesheet, but no runtime file reads them. `board-v2-films.mjs` sets only the Captain's pulse head, emergency, suction, debris and plate art, and the four-bed ward's scenes and lighting. The films draw each character live. **Recommended:** retire the 27 from the catalog (Frontend owns it; Integration re-pins). If Integration would rather keep them, `release-candidate.json` (`filmArt.ifKept`) gives the exact recipe. Redrawn, they come to 3.96 MB against 0.81 MB today, which is why they are not baked here.

## Tokens 0.5.0 and the art-release candidate

- **`packages/design-tokens/src/tokens-0.5.0.json`**, a candidate (`proposal_for_evaluation`, supersedes 0.4.0). `index.ts` still exports 0.4.0; adopting 0.5.0 is Integration's.
  - Every 0.4.0 key keeps its name and shape; `color.crew` keeps `{ field, accent, skin }`, so `check-assets.mjs` reads it as before.
  - Changed, each listed in `revisedFrom040` with its reason: all nine skins (traced); the fields and accents of Atlas, Nova, Mira and Echo; the stated nearest-field distances.
  - Added: `color.crewSuit` and `color.crewHairByCharacter`. `color.crewHair` is kept unchanged for the rig's drawing.
  - The nearest character field to a team accent is now Juno's, at 36 (Nova's pink was 26). The nearest to amber is still Rigel's yellow, at 14.
- **The art-release candidate** is `design/crew-drawing/release-candidate.json` (`mothership.crew-drawing-release-candidate/1`).
  - It proposes `design-0.7.0` and tokens `0.5.0`.
  - Integration owns final release registration, the approved drawing-source pins, the fence and the shared manifests. None of them is changed here.
  - Historical releases (`design/releases/`) are untouched.

## Performance budget

**The attached Frontend performance budget did not arrive.** The figures below are held against the targets already in the repository ([docs/frontend/first-slice.md](../frontend/first-slice.md)):
- 60 fps for ordinary board interaction on an agreed midrange reference device;
- a usable 30 fps reduced-effects mode;
- selection feedback under 100 ms;
- critical compressed assets within the architecture's 6 MB.

They should be reconciled with Frontend's budget when it arrives.

| Measured here (not on a phone) | Today | With the release |
| --- | --- | --- |
| One figure built (Node, render machine) | 1.06 ms, 21 KB | 5.0 to 5.3 ms, 63 to 106 KB |
| Public-board stylesheet: the 18 card and standee properties | 118 KB raw, 4.9 KB gzip | 1.74 MB raw, 415 KB gzip, 113 KB Brotli |
| The whole public-board stylesheet (estimated) | 236 KB raw, 20 KB gzip | 1.86 MB raw |
| App icons, if added to that stylesheet | — | 0.91 MB raw, 218 KB gzip |

- **Levers** that need no change to the drawing:
  - Shared heads and pose caching.
  - Drawing the standee as today's stand and clamp layered over the card property instead of a second copy of the card. That halves the stylesheet's growth, and Designer can export the two layers on request.
  - Drawing app icons live (`crewPortraitSvg` with shared art) instead of baking them.
- **Levers that change bytes, not appearance**, if the device measurements call for them:
  - Relative path encoding in `ink.mjs`, and each form's outline defined once for its fill and its clip.
  - Simplifying the traced heads below a pixel. Measured: about 40 % fewer bytes at 0.2 units, but the heads would no longer be the approved traces byte for byte.

**Unverified: Frontend owns these measurements**, on a physical low-end Android phone and an iPhone:
- frame time during a move and during an idle board with nine figures;
- cold load with the new stylesheet;
- memory with nine figures mounted;
- the reduced-motion path;
- the films with the new figures.

Nothing in this document is a phone measurement. A desktop render proves nothing about a phone.

## Checks performed

Run in the branch's worktree on 7 November 2026, with Node 22.21.1 and npm 10.9.4, after `npm ci` and `npm run build`:

| Check | Result |
| --- | --- |
| `npm run check:toolchain` | Pass: Node 22.21.1, npm 10.9.4 |
| `npm run check:workspace` | Pass: 8 explicit packages; boundaries unchanged |
| `npm run check:sources` | Pass: the rule, source-lock and Canvas hashes; historical releases and runtime ports intact |
| `npm run typecheck` | Pass (pure and browser programs) |
| `npm run test:design` | **275 of 275 pass**: the 261 existing and 14 new in `packages/design-tokens/test/crew-drawing.test.mjs` |
| `node design/tools/crew-drawing-export.mjs --check` | The 38 generated files (36 exports, the manifest and the record) are identical to a fresh draw |
| `node design/tools/crew-drawing-render.mjs` | Both previews are exactly 360 frames at 30 fps, H.264, 1920 × 1080, with no audio stream (`ffprobe`). The comparison sheet rendered, and the page reported no console error |
| Looked at | The comparison sheet, section by section, and frames of both previews (idle, the walk, places), as above |

What the 14 new tests hold:
- the sources' first line and imports;
- the ports' freedom from prototype names (the fence's own `prototypeReferences`);
- the traced heads byte for byte;
- the drop-in's ids, signs and flags, and every gesture, outfit and mark;
- the walk;
- unique prefixes and shared art;
- the films' three effects;
- blinks, Echo's visor and the hanging hair;
- reduced motion and still figures;
- pose keys, and live attributes equal to a rebuild;
- the palette rule;
- the cards' face crop and the standees' anchors;
- the exports, their record and what they replace;
- tokens 0.5.0;
- the renders' record.

Not run:
- `npm run verify` as a whole: the balance, scenario, frontend and capacity suites cover files this change does not touch, and CI runs them;
- any phone, Safari or iOS;
- any assistive technology;
- the ported runtime, which does not exist yet.

## Limitations and open items

- **No device measurements** (above). They are Frontend's, on a low-end Android phone and an iPhone.
- **The Frontend inventory and budget** this request refers to were not received. The inventory here comes from the code.
- **The runtime directory** is not in the drawing-port fence yet; Integration adds it, or picks another.
- **The films art catalog's 27 crew drawings:** retire them (recommended), or redraw them by the recipe.
- **The review page's furniture** (a bench, a door and an IV stand) is a stand-in for the board's rooms. It is not part of the release.
- **The owner approved the look as drawn in the pilot and crew pages.** These exports are that drawing in the game's boxes. The new card and standee frame (the icon's superellipse in the card's box) and the new suit's sleeve on the held devices follow from it; the owner has not looked at them separately.

## After the port: the Designer's review

When Frontend has ported the release, Designer reviews fidelity before Integration merges the port. Frontend sends:
- **Screenshots** of each surface in the inventory, at 320 × 568 and 390 × 844, with today's next to them where today's still exists:
  - the board with nine, a move mid-walk, the Hospital and the Jail, Injured and Eliminated;
  - the picker, the lobby, the phone-kit avatar, an ability chip, the trial cast, the dossier photo, the role card with a device;
  - a standee, a film with a memorial, and the Clone's outline and halftone.
- **A short runtime video** (10 to 20 s, silent): idle blinks, a move with Mira and Echo, then the same with reduced motion.

Designer compares them with `review/compare.png`, the previews and the source renders, and replies on the port's PR with what matches and what does not.
