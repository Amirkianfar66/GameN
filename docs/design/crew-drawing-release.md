# Crew drawing release: the approved crew for runtime adoption (DSN-REQ-17)

**From:** Visual and Motion Designer (issue [#4](https://github.com/Amirkianfar66/GameN/issues/4)). **For:** Frontend (the port, dispatch and lifecycle) and Codex Integration (registration, pins, bundles). **Release:** `crew-drawing-1.0.0`, the drawing for the candidate art release `design-0.7.0` with crew tokens `0.5.0`. **Base:** `main` at `d2933b08eff0e5bd00cfbdf1730b81a007f1c646`, which contains the owner-approved pilot (PR #191, merge `5f1a1ce97570ddc3304b7b286ddd8ebbc3d8b0be`) and crew (PR #192, merge `d2933b08eff0e5bd00cfbdf1730b81a007f1c646`). **Date:** 7 November 2026.

The owner approved the restyled crew of nine on 7 November 2026 ([owner-decisions.md](owner-decisions.md), [character-pilot.md](character-pilot.md)). The appearance is settled. This release packages it so that Frontend can port exact reviewed sources with permitted import rewrites, and Integration can register it.

It changes no gameplay, rule, skeleton, gesture, walk, easing, timeline, layout slot, place or public character id. It deploys nothing.

Where everything is: [design/crew-drawing/README.md](../../design/crew-drawing/README.md). In short:
- `source/` is the drawing to port.
- `assets/` holds the baked exports, with `assets/manifest.json`.
- `release-candidate.json` is the machine-readable handoff.
- `review/` holds review media, never imported.
- `design/character-pilot/` is the prototype the owner reviewed. It is **not** part of the release, and nothing in the runtime may import it.

**Corrected after Integration's review of `6bba3884`.** Integration's review on PR #193 found two live-update gaps. Both are fixed, without changing the drawing:
1. **A moving figure is now posed in place.**
   - `crewPoseFrame` and `applyCrewPose` take the rig's continuously sampled skeleton: the walk, and the exit and arrival blends.
   - They set the attributes of the same mounted elements and never redraw the traced art.
   - Nothing is quantized and nothing is cached per pose.
2. **The back of Mira's hair and Echo's locs is live.** `crewFrame` carries it, and `applyCrewFrame` sets it.

The review's other points are taken in below:
- the Frontend [adoption inventory](https://github.com/Amirkianfar66/GameN/blob/6bac45545b428de60f060c6dcbeccb9a3dcc8ef5/docs/frontend/character-restyle-adoption-inventory.md) and [agreed performance budget](https://github.com/Amirkianfar66/GameN/blob/6bac45545b428de60f060c6dcbeccb9a3dcc8ef5/docs/frontend/character-restyle-performance-budget.md) (`6bac4554`);
- the app icons for portrait UI;
- portraits with their own updater;
- exact-release dispatch;
- retiring the old film drawings from the new bundle only;
- the artwork's provenance.

## Contents

1. [What to look at](#what-to-look-at)
2. [Inventory, reconciled with Frontend's](#inventory-reconciled-with-frontends)
3. [Runtime exports and their hashes](#runtime-exports-and-their-hashes)
4. [Porting and dispatch](#porting-and-dispatch)
5. [Drawing API](#drawing-api)
6. [Mounting](#mounting)
7. [Updating a mounted figure](#updating-a-mounted-figure)
8. [Motion](#motion)
9. [Views, clothes and health](#views-clothes-and-health)
10. [Baked art, CSS properties and provenance](#baked-art-css-properties-and-provenance)
11. [Tokens 0.5.0 and the art-release candidate](#tokens-050-and-the-art-release-candidate)
12. [Performance budget, reconciled](#performance-budget-reconciled)
13. [Checks performed](#checks-performed)
14. [Limitations and open items](#limitations-and-open-items)
15. [After the port: the Designer's review](#after-the-port-the-designers-review)

## What to look at

| File | What it shows |
| --- | --- |
| [`review/preview-full.mp4`](../../design/crew-drawing/review/preview-full.mp4) | 12 s, silent, in three parts. **Idle:** the nine blink, each on their own schedule, and drift; Mira's hair and Echo's locs follow. **A move:** the game's exit, walk and arrive (900 ms), sampled continuously and posed in place. **Places, views and health:** the Hospital gown, the Jail's suit, Injured, Eliminated, looking down, turned away. Drawn through the release's mounting interface. |
| [`review/preview-reduced.mp4`](../../design/crew-drawing/review/preview-reduced.mp4) | The same clock with reduced motion. Poses and blinks stay. Drift and hair swing stop. A move is placed with the game's 80 ms fade instead of walked. |
| [`review/compare.png`](../../design/crew-drawing/review/compare.png) | Today's drawing and the release's, surface by surface, at the game's sizes. Covers the board, work and back views, the Hospital and the Jail, health, the walk at the capsule's size and the phone kit's vote stage. Also every crop of the cards, the standees, the films' effects, and the app icons at full size and at 64 and 44 px. |

## Inventory, reconciled with Frontend's

Frontend's [adoption inventory](https://github.com/Amirkianfar66/GameN/blob/6bac45545b428de60f060c6dcbeccb9a3dcc8ef5/docs/frontend/character-restyle-adoption-inventory.md) (`6bac4554`) is the consumer map. The table below gives what the release supplies for each of its rows. The two agree: where this document first listed fewer entry points (taken from the code alone), the inventory's are used.

| Frontend's surface | What the release supplies | Who adopts |
| --- | --- | --- |
| Shared drawing core (`scene-drawing/*`) | 17 sources to port to `apps/game/hosted/crew-drawing/`. The rig's `body.mjs` and `wardrobe.mjs` are read unchanged at their `design-0.6.0` pins, and the rest of the rig (gestures, motion, parts) stays as it is | Frontend ports; Integration pins |
| Scene board and move ghost (`scene-board.mjs`) | `dressedFigureSvg` and `outfitFor`, with the same calls. Mounting gives every instance and layer its own prefix; moves are posed in place | Frontend, under exact-release dispatch |
| Board V2, the current Planet board (`board-v2-scene.mjs`, `planet/render.mjs`, `board-v2-host.mjs`) | The same. In its place, a figure takes `crewFrame`; when its pose JSON changes during a blend, `crewPoseFrame` updates it in place instead of redrawing it | Frontend |
| Capsule poses and transitions (`board-v2-capsule.mjs`, `capsule-figures`, `capsule-film`, `capsule-scene`) | The same drawing for sitting, listening, down and back, walk, entry, talk and return. A character mounted at home, in the capsule and in a film at once needs three prefixes | Frontend |
| Native films (`board-v2-films.mjs`, `captain-figures`, `clone-fx`) | The drop-in's figures take the runtime's `memorialSvg`, `outlineSvg` and `halftoneSvg` (tested). Body and front layers. The 27 baked crew drawings in the films art are to be retired | Frontend |
| Phone kit (`phone-kit.mjs`, `phone-kit-art.mjs`, `claude-phone-kit.css`) | Figures for the vote stage. The app-icon portraits for `.pk-who` | Frontend maps |
| Character selection (`planet/app.mjs`, `planet.css`; historical `setup-controls.js`, `.crew-option`) | **The app-icon portraits**, required for portrait UI: `assets/portraits/portrait-c1.svg` … `c9` | Frontend maps and frames |
| Crew lists and own role cards (`planet/app.mjs`, `planet/render.mjs`, `comic-shell.ts`) | The app-icon portraits. The cards, in the old card's box with the face where the old one was, where a surface needs the card's format | Frontend maps |
| Ability portraits and chips (`ability-art.ts`; `ability-art`, `ability-drawing`, `private-card` and `comic-layout` stylesheets) | The app-icon portraits, fitted inside the existing frames (Frontend's framing) | Frontend |
| Static portrait exports and bundles (`export-recipes.json`, `exports.mjs`, `comic-assets.mjs`) | The export recipe for the new art: `design/tools/crew-drawing-export.mjs` with `assets/manifest.json`. The manifest gives each export's SHA-256, box, anchors, the property it replaces or proposes, and its provenance. Integration builds the uniform bundles | Integration |
| Character-bearing baked art and media | Cards, standees, held devices and portraits redrawn. The 27 film crew drawings to retire. The five Planet library videos and posters show no character (checked frame by frame) | Integration, Frontend |

Two notes, from the inventory's rendering strategy:
- **The prototype is not part of the release.** Its showcase walk (stride 22), wave and idle are not part of it either; this release's motion adds only blinks, drift and the hanging hair to the rig's movement.
- **A figure's view comes from the existing skeleton.**

## Runtime exports and their hashes

Full records: `design/crew-drawing/release-candidate.json` (sources, ports, the live interface, dependencies, consumers, provenance) and `design/crew-drawing/assets/manifest.json` (SHA-256 `17b0d9d058dc47cd724a0d4035098877a3ab4238ab67606bba3bcab43e2288dc`). The tokens candidate `packages/design-tokens/src/tokens-0.5.0.json` has SHA-256 `cfd8604611196fa6799367e1b438570ec96e914f937859199629317a4ac8ac5d`. The release follows `design/releases/design-0.6.0.json` (SHA-256 `eeb4a88c7b71166a1c9782231ccd7fa81931cb50eed112e3d6153a862751bec4`).

**Sources to port** (17 files). The runtime SHA-256 is that of the port: the source with its first line removed and its imports rewritten.

<!-- sources:start -->
| Source (`design/crew-drawing/source/`) | Source SHA-256 | Runtime file (proposed) | Runtime SHA-256 | Imports rewritten |
| --- | --- | --- | --- | --- |
| `crew.mjs` | `ac1634f0ac43a8c0a8e1b3adf0cd2803b983d7c2c868f0497724e108795ff043` | `apps/game/hosted/crew-drawing/crew.mjs` | `108685e795f20100e9fdbba4d03d15a9825487d761a469e6cbf62a2a8697d0c0` | none |
| `ink.mjs` | `48c881a03cfbfaf383aedacc2d8f91818279655b3737416d93f36373b95be34d` | `apps/game/hosted/crew-drawing/ink.mjs` | `53787159af457c1c4e41cc9ce7567f14b154149fcdbe986b27b6aae3b8f2966e` | none |
| `heads/vega.mjs` | `ee61eaad800b04631ab4dbbfffda62dc792bcef8c876f7504a2d44e478165656` | `apps/game/hosted/crew-drawing/heads/vega.mjs` | `99bf51b375c60b857fd71a36433b84e1a4e767da6366752aa08ed1277ed8c4ff` | none |
| `heads/rigel.mjs` | `803a3c768d8eb21634d0a3f37953fb4788008f471bd7f4a14f1526aa76289898` | `apps/game/hosted/crew-drawing/heads/rigel.mjs` | `ec5b2197530c581d8eaa7dbb1152ad795c7118993f6f374108f09f2fcbc5cf5f` | none |
| `heads/lyra.mjs` | `dc9271377889eaf171812ef306c5fc30bc2467b26f0100e60188c6aac5cd7ab7` | `apps/game/hosted/crew-drawing/heads/lyra.mjs` | `39e6609847417994edf7c17ce25e46a0d9a349654cb02790e7b7f5a20ffa44d1` | none |
| `heads/atlas.mjs` | `1909d4a10c5bc28f4e7e44406c8f06d5130dd287bfde8fb3f153070fd5fe0cd1` | `apps/game/hosted/crew-drawing/heads/atlas.mjs` | `33e1c9250ab863bfa3cf9cddc40275b296938b4c8fa3c82db8abf68d1943b268` | none |
| `heads/orion.mjs` | `a37e4340d38f46d5c618746f424e7992339645b0f63e27d887b04d29cce5151e` | `apps/game/hosted/crew-drawing/heads/orion.mjs` | `7c0a2053f250ba030fe4aac4cb16e7334ec5b14379cc8333f61498d2e4fd25b5` | none |
| `heads/nova.mjs` | `4380e7e76071ba74f6db2f69600ba239fa13d3907b914523704191dcadf5338f` | `apps/game/hosted/crew-drawing/heads/nova.mjs` | `cf3304025eb6243d2aacfaaece05d027c5733569b671b6463e71972c531c43d6` | none |
| `heads/juno.mjs` | `b9da5c07018ff73f7f222e056b8d7236eb2034b8cfc48ff7d56a6b4ca89942cb` | `apps/game/hosted/crew-drawing/heads/juno.mjs` | `4aa9f9600b1413ee8e2d55923be0ccfbe0c94e6624e438ecb435c5a46fe9e0ad` | none |
| `heads/mira.mjs` | `21244acd174f1728b405c28086a0c9df50f89a214f8ff00d076397e7b3ccd523` | `apps/game/hosted/crew-drawing/heads/mira.mjs` | `8e410ed0422df3a8da91109d7770637680da7e3d2bb53b323c38314a14b8da69` | none |
| `heads/echo.mjs` | `3c8f99652e244b9f8c6b98f13f21249795c4fd106dfb5485695558488d5b0abf` | `apps/game/hosted/crew-drawing/heads/echo.mjs` | `8f11f3764ce45676f11d5d56bae0ef6d72c081a888245696e1455c799a023a15` | none |
| `head.mjs` | `c03fb04cafc1b3d27d8fc5e7edfbf8b2fc8969ab370f9d92d8f8b65bac996891` | `apps/game/hosted/crew-drawing/head.mjs` | `d4ac83d8782c3e03938b4ea70888491db701c5dfcfde0b994db7fbed92d66290` | none |
| `figure.mjs` | `d61e1ee54161829fcb812b72e57c965523de6da6c84702ee848a84372fc23a90` | `apps/game/hosted/crew-drawing/figure.mjs` | `fcaa9fd62acb2f2a0378c63605ab52450cced0d10591c2ca786af422f6c0f968` | `../../board-motion/figures/body.mjs` → `../scene-drawing/body.mjs` |
| `wardrobe.mjs` | `5ce2a7530cfb7d3cfc41153d29a33894ed4a74afbd9b88cb30a6e38d9eadca17` | `apps/game/hosted/crew-drawing/wardrobe.mjs` | `d1de51191efb793ae484fe5a0ef9b10e530b43ea2e227aa093d07cf6ce25fa9b` | `../../board-motion/figures/body.mjs` → `../scene-drawing/body.mjs`, `../../board-motion/figures/wardrobe.mjs` → `../scene-drawing/wardrobe.mjs` |
| `motion.mjs` | `405f22b75eb027d4408c3d0d9c5f328f01711e8363f69e7517ee7fa4160dd280` | `apps/game/hosted/crew-drawing/motion.mjs` | `fe753aa1be111f99e98ef146e0c648d1f9e6b3f9726e312ca38bcc3be040c5fe` | none |
| `mount.mjs` | `cdd0b23ab769f5dafcbc78f73fd484ff0b4bfcb640e0eea8b86652d07ccd895c` | `apps/game/hosted/crew-drawing/mount.mjs` | `bd0a00e7cc8c3d2d898cfb0be745233730550d3eb4212d10faa2332caa0206d8` | none |
| `portrait.mjs` | `06839757ada8939295b626e6c142935fa0db69bda266f05230fd9ad50d2dfac7` | `apps/game/hosted/crew-drawing/portrait.mjs` | `4026cd28a4234f45345a25fa9bb59705dbff58f38ecb4321408b36fca395adf5` | none |
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

## Porting and dispatch

- **The rule.** A runtime file is its source with the first line `// mothership:dev-only` removed and the import specifiers below rewritten. Nothing else changes. `portOf()` in `design/tools/crew-drawing-export.mjs` is the rule as code; `runtimeSha256` is its result.
- **Rewrites:**
  - `'../../board-motion/figures/body.mjs'` → `'../scene-drawing/body.mjs'`
  - `'../../board-motion/figures/wardrobe.mjs'` → `'../scene-drawing/wardrobe.mjs'`

  Every other import is relative inside the release (`./`, `./heads/`).
- **Where:** `apps/game/hosted/crew-drawing/`, with `heads/` inside it. Integration accepts the directory and the exact-copy and import-rewrite scheme in principle. The drawing-port fence lists it once Integration pins the corrected sources.
- **The fence's other rules hold.** No port has a string literal naming a prototype, and no port's text contains `board-motion` or `design/abilities` once ported (tested on every file).
- **Exact-release dispatch, not replacement** (Frontend owns it):
  - A match pinned to `design-0.6.0` or earlier keeps drawing with today's `scene-drawing/crew.mjs` and `wardrobe.mjs`. A match on the new release draws with the release's.
  - The calls are the same: `dressedFigureSvg`, `outfitFor` and `CREW`.
  - `release-candidate.json` lists the five shared consumers and the two modules each reads today.
  - Historical releases, catalogs and matches keep their pins.
- **Dependencies.** The release depends on the rig's `body.mjs` and `wardrobe.mjs`, at the hashes `design-0.6.0` pins. It reads `FRAME`, `ORDER`, `OUTFITS` and `outfitFor` from them and never changes them.

## Drawing API

From `wardrobe.mjs` (the drop-in for the rig's):

- `dressedFigureSvg(c, sk, { outfit = 'crew', prefix = 'f', layer = 'body', inline = true, header = '', motion = {}, art = null, live = false })` takes the rig's arguments and returns what the rig's returns: one SVG in the rig's frame (`viewBox -90 -40 300 300`, floor at 233).
  - `c` may be the release's `CREW` entry or the rig's: a rig entry is matched by its call sign.
  - Three options are new: `motion` (the head's blink, drift and hair), `art` (shared heads) and `live` (hooks for frames).
- `outfitFor(location)` and `OUTFITS` are the rig's own, re-exported: what is worn where is unchanged.
- `figureSvg(c, sk, opts)` is the crew suit, as the rig's `figureSvg`.

From `crew.mjs`:
- `CREW` lists the nine by public id, with the rig's call signs and flags, plus the new drawing's colours.
- `CREW_ORDER`, and `crewMember(c)`, which resolves a rig or release entry.
- `SUIT` (the suit's tones) and `CREW_DRAWING_VERSION`.

From `portrait.mjs`:
- `crewPortraitSvg(c, { prefix, motion, size, art, live })` is the approved app icon.
- `crewPortraitFrame(c, motion)` is its own updater; see [below](#updating-a-mounted-figure).
- `crewCardSvg(c, { prefix, motion, art })` is the card, in the old card's box `8 0 84 96`, with the face where the old card had it.
- `crewStandeeSvg(c, { prefix, motion, art })` is the card in today's stand and clamp, in `0 0 96 120`, with today's anchors (`STANDEE_ANCHORS`).

From `mount.mjs`: `crewArtDefs`, `CANONICAL_PREFIX`, `withPrefix`, `poseKey`, `crewFrame`, `applyCrewFrame`, `crewPoseFrame` and `applyCrewPose`.

From `motion.mjs`: `crewMotion`, `blinkAt`, `idleDrift`, `hairFollow`, `hasLids`, `hasHangingHair`, `isStill` and `STILL_DRIFT`.

## Mounting

- **One prefix per mounted instance and layer.** Every id a figure defines starts with its `prefix`: clip paths, patterns, gradients and, with inline art, its head. Every reference to one (`url(#…)`, `href="#…"`) uses the same prefix.
  - Give every inline figure, front layer, capsule, portrait and film instance its own. Include a renderer-instance counter and a mount counter, not only the seat, character or event. Two simultaneous boards, or a character at home, in the capsule and in a film, would otherwise share ids.
  - Two figures with different prefixes share no id (tested).
- **Templates, namespaced at mount.** A placed pose (a gesture in a place) can be drawn once under `CANONICAL_PREFIX` and kept in a cache keyed by `poseKey`.
  - At mount, `withPrefix(template, prefix)` gives it the instance's own prefix. It renames every id and every reference together, and the result equals drawing it under that prefix (tested for every gesture, both layers, shared and inline art).
  - Bound the cache (for instance to the board's figures), and clear it with the board.
  - Never cache a continuously sampled skeleton: those are posed in place.
- **Shared heads.** `crewArtDefs({ ref = 'crew-art', ids })` returns a hidden SVG whose `defs` hold each traced head once, as `crew-art-cN`.
  - Put it once in each document root that mounts figures: the page, each shadow root and each iframe. That document is the shared art's one owner.
  - Draw with `art: { ref: 'crew-art' }`. Each figure is 30 to 62 KB smaller, and its head is a `<use>`.
  - A figure whose SVG text is rewritten afterwards must keep inline art: the films' `memorialSvg`, `outlineSvg` and `halftoneSvg` recolour and rename what is in the text.
- **Two layers, as today.** `layer: 'front'` draws what passes in front of furniture, for a skeleton with `hasFront(sk)`. Each layer is its own SVG with its own prefix.
- **Live.** Draw a figure that will be updated with `live: true`. Its head, lids, lashes, hanging hair and the back of hanging hair then carry hooks (`data-crew-head`, `data-crew-lid`, `data-crew-lash`, `data-crew-hang` and `data-crew-back-hair`), and an inline head is marked `data-crew-art`.
- **Mirroring** stays the runtime's CSS `scaleX(-1)` on the figure's element.
- **Disposal.** On unmount or identity change, remove the figure's elements and drop its template references.
  - `applyCrewPose` keeps the elements of each mounted root in a `WeakMap`, so a removed figure leaves nothing behind.
  - Bounded template caches, observers, animation handles and listeners are the adapter's, and are released with it.

## Updating a mounted figure

A figure is mounted once. Every frame afterwards changes attributes only, and the traced art is never serialized, parsed or mounted again.

| The figure | Call each frame | What changes |
| --- | --- | --- |
| In its place (same skeleton) | `applyCrewFrame(svg, crewFrame(c, sk, motion))` on each layer | The head's place, tilt and drift; the lids; the hanging hair; from behind, the back of Mira's hair and Echo's locs |
| Moving (a new skeleton each frame: the walk, an exit, an arrival) | `applyCrewPose(svg, crewPoseFrame(c, sk, { outfit, layer, prefix, art, motion }))` on each layer | Every attribute of the same elements that a fresh draw of that pose changes: limbs, torso, clothes, shading, the head's place and its own motion |
| Its pose changes structure (`applyCrewPose` returns -1) | Mount it again from the current pose | Where the rig switches what cannot be blended (the view, the drawing order, what a hand holds): at most once per exit or arrival, at its middle, and never during the walk |
| A portrait | `applyCrewFrame(svg, crewPortraitFrame(c, motion))` | Its lids and hanging hair. A portrait's head has its own hook, so a figure's `crewFrame` never moves it |

- **Continuous, not quantized.** The game samples `walkPose((elapsed - 120) / 225)` and `sample()` of its exit and arrival keys with continuous times. `crewPoseFrame` takes exactly those skeletons; there is no rounding of the phase or of the blend time.
- **Measured structure:**
  - The walk keeps one element structure all the way. 8,316 consecutive samples, across all nine characters, three outfits and the limp, changed it zero times.
  - An exit or an arrival changes it at most once.
- **Equal to a fresh draw.** After either update, the mounted figure serializes exactly as a fresh mount of the same pose and motion. Tested in Node for every frame of the walks, blends, views and portraits above, and again in desktop Chrome (below).
- **The traced art is never redrawn.**
  - With shared art the figure holds a `<use>`.
  - With inline art the figure holds its art once, and a pose frame draws only its mark (`data-crew-art`). The pose frame contains none of the traced paths (tested).
  - Element identity and ids stay the same through a walk (tested).

```js
import { applyCrewFrame, applyCrewPose, crewArtDefs, crewFrame, crewPoseFrame } from './crew-drawing/mount.mjs';
import { crewMotion, hairFollow, isStill } from './crew-drawing/motion.mjs';
import { dressedFigureSvg } from './crew-drawing/wardrobe.mjs';

document.body.insertAdjacentHTML('afterbegin', crewArtDefs());          // once per document root
const ART = { ref: 'crew-art' };

function mount(node, c, sk, { outfit, layer, prefix, motion }) {        // its own prefix: instance, layer, mount counter
  node.innerHTML = dressedFigureSvg(c, sk, { outfit, layer, prefix, art: ART, live: true, motion });
}
function frame(node, c, sk, { outfit, layer, prefix, moved, motion }) {   // every animation frame
  const svg = node.firstElementChild;
  if (!moved) return applyCrewFrame(svg, crewFrame(c, sk, motion));
  if (applyCrewPose(svg, crewPoseFrame(c, sk, { outfit, layer, prefix, art: ART, motion })) < 0) mount(node, c, sk, { outfit, layer, prefix, motion });
}
// motion = crewMotion(now, c.id, { reduced, still: isStill(gesture), follow: moving ? follower.step(dt, x, y) : null })
```

The review page draws its motion stage this way (`design/crew-drawing/review.mjs`).

**Desktop timings** for the ways to draw a frame. These are from Chrome on the render machine: script and DOM time with layout forced and paint not included, the walk sampled at 60 Hz. They are not phone measurements.

| Nine figures, one frame | ms |
| --- | --- |
| Today's rig: nine walking, each rebuilt every frame (as comic-motion does) | 15.18 |
| The release: nine walking, each rebuilt every frame (not the way to draw it) | 65.6 |
| The release: nine walking, posed in place (crewPoseFrame, applyCrewPose) | 31.35 |
| The release: one walking (a move), posed in place | 3.15 |
| The release: nine in their places, the head's own motion (crewFrame, applyCrewFrame) | 0.76 |

- **Usual case.** In the game, only a seat that moves is posed, usually one at a time. Posed in place, a walking figure costs about 3.2 ms a frame here. Most of that is the ink drawing of its pose.
- **Worst case.** Nine walking at once cost about twice today's nine rebuilds. Rebuilt, they cost about four times today's.
- **Already done.** The drawing code was made about twice as fast for this release with the same output: a digest of 2,485 drawings is unchanged.
- **Further levers**, without changing the drawing, if a phone needs them:
  - pose only the moving figures;
  - build the first pose of a move when the move is known, not on its first frame;
  - draw a figure's front layer only while its skeleton has one.

## Motion

All of it is drawn on the head; the body's movement is the rig's.

- **Blinks** (`blinkAt`, inside `crewMotion`):
  - Irregular, every 2.4 to 4.6 s, 170 ms each: quick to close, slower to open.
  - Each character has their own schedule from the public character id alone, so the nine do not blink together (tested).
  - `seat` gives a second figure of the same character another schedule.
- **Echo** has no lids: Echo's eyes are behind the visor, so a blink draws nothing and no lid hooks exist (tested).
- **Idle drift** (`idleDrift`): the head moves a little and tilts; the body stays still.
- **Hanging hair:** only Mira's hair and Echo's locs hang below the jaw (`hasHangingHair`).
  - At idle, the ends answer the drift half a second late.
  - On a move, `hairFollow(id)` is a damped spring. Each frame, call `step(dtMs, x, y)` with the head's position in the figure's units, the figure's travel included. It returns `{ sway, lift }`: the ends trail the head, overshoot a little and settle (tested).
  - When the figure is mirrored, give it positions in the mirrored frame, as the review page does.
  - Pass the result to `crewMotion` as `follow`.
  - From the front and looking down, the hanging hair is one transform. From behind, it is the back of the hair's paths, which `crewFrame` and `crewPoseFrame` both carry.
- **Reduced motion** (`reduced: true`, from the person's setting or `prefers-reduced-motion`):
  - Every meaningful pose and every blink stay; the drift and the hair's swing stop (tested for all nine).
  - `crewMotion` reads it every frame, so switching it while mounted takes effect on the next frame, and the hair returns to its neutral pose (tested from the front, looking down and from behind).
  - The game's own reduced motion is unchanged: no flight, a move placed with an 80 ms fade.
- **A character gone still** (Eliminated: the rig's `down`, `slumpDesk`, `slumpBench`, or any gesture marked `+still`): `isStill(gesture)` is true, and `crewMotion(…, { still: true })` moves nothing.
- **Cadence:** drive frames from `requestAnimationFrame` while the board is visible, and stop when the document is hidden. Blinks and drift are pure functions of time, so a resumed board picks up where the clock is.

## Views, clothes and health

- **Views** come from the skeleton (`sk.view`), as today:
  - `front` is the three-quarter view; its eyes open and blink.
  - `down` looks down, with the lids lowered.
  - `back` is turned away: no face and no lids, the back of the hair.
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

## Baked art, CSS properties and provenance

Swap each set whole, all nine, in the new release's bundles; historical bundles stay as they are. Integration builds them from `assets/manifest.json`, whose `replaces` names the shipped file and property of each.

| Set | Files | For | Anchors |
| --- | --- | --- | --- |
| App icons | `assets/portraits/portrait-c1.svg` … `c9` | **Portrait UI, as the owner requires:** selection, crew lists, own cards, ability portraits and chips, the phone kit's avatar. Frontend owns mapping and framing. Proposed property `--ms-asset-crew-portrait-cN` in public-board | A 128 × 128 box, the superellipse frame of half-size 54, its rim and shadow. Legible at 64 and 44 px (the comparison sheet) |
| Cards | `assets/cards/card-c1.svg` … | `--ms-asset-piece-crew-card-cN`, where a surface needs the card's format | Box `8 0 84 96` and `faceCenter` [48, 38], both kept. The eyes sit inside the 30 px face crop (`50% 22% / 175%`) for all nine (tested) |
| Standees | `assets/standees/standee-c1.svg` … | `--ms-asset-piece-crew-standee-cN` | Box `0 0 96 120`. Origin [48, 104], tag [48, 116] and the marker slots are kept: today's stand and clamp, new card |
| Held devices | `assets/roles/device-<role>.held.svg` (nine) | `--ms-asset-device-<role>-held` (roles bundle) | The sleeve and glove change from the old suit's grey `#C6CDD4` to the new suit's canvas `#DCCDB2`. Nothing else changes (tested byte for byte) |

- **The films art catalog's 27 crew drawings** (`memorial-cN`, `outline-cN`, `halftone-cN` in `apps/game/hosted/board-v2-film-art/`) are built into the films stylesheet, but no runtime file reads them.
  - `board-v2-films.mjs` sets only the Captain's pulse head, emergency, suction, debris and plate art, and the four-bed ward's scenes and lighting. The films draw each character live.
  - **Retire them from the new release's films bundle after Frontend's consumer check**, as Integration decided. Historical releases, catalogs, files and hashes stay as they are and verifiable.
  - `release-candidate.json` (`filmArt.ifKept`) keeps the recipe that would redraw them.
- **Provenance.** It is recorded in both records (`provenance`).
  - **The faces are traced from the game owner's own drawings** (images the owner provided on 7 November 2026), by `design/tools/character-pilot-trace.py`.
  - The source crops are `design/character-pilot/faces/source/*.png`. They are public with the owner's permission and never shipped.
  - Bodies, clothes, frames and grounds are drawn in code.
  - `design/exports/asset-manifest.json` states that no traced image was used. That statement describes those earlier exports and does not apply to this release's art.

## Tokens 0.5.0 and the art-release candidate

- **`packages/design-tokens/src/tokens-0.5.0.json`**, the crew token candidate (`proposal_for_evaluation`, supersedes 0.4.0). `index.ts` still exports 0.4.0; adopting 0.5.0 at each selected-release consumer is Integration's.
  - Every 0.4.0 key keeps its name and shape; `color.crew` keeps `{ field, accent, skin }`.
  - Changed, each listed in `revisedFrom040` with its reason: all nine skins (traced); the fields and accents of Atlas, Nova, Mira and Echo; the stated nearest-field distances.
  - Added: `color.crewSuit` and `color.crewHairByCharacter`. `color.crewHair` is kept unchanged for the rig's drawing.
  - The nearest character field to a team accent is now Juno's, at 36 (Nova's pink was 26). The nearest to amber is still Rigel's yellow, at 14.
- **The art-release candidate** is `design/crew-drawing/release-candidate.json`, for `design-0.7.0` with tokens `0.5.0`, as Integration named them.
  - Final registration, the approved drawing-source pins, the fence and the shared manifests are Integration's. They follow the corrected-source review, and none of them is changed here.
  - Historical releases (`design/releases/`) are untouched.

## Performance budget, reconciled

The [agreed performance budget](https://github.com/Amirkianfar66/GameN/blob/6bac45545b428de60f060c6dcbeccb9a3dcc8ef5/docs/frontend/character-restyle-performance-budget.md) (`6bac4554`) holds. Every number in it is a target, and every phone result is Frontend's to measure on the named devices. A tier is a device with its effects level and frame rate: the normal iPhone (iPhone 13, normal effects, 60 fps) and the low-end Android (Galaxy A13, lower effects, 30 fps).

What the release contributes, measured here (not on a phone):

| Budget item | Agreed target | What the release brings |
| --- | --- | --- |
| Critical transferred assets | ≤6,000,000 compressed bytes in all | Public-board stylesheet with the new cards and standees: 1.74 MB raw for those 18 properties (415 KB gzip, 113 KB Brotli), against 118 KB raw today (4.9 KB gzip). The nine app icons add 0.91 MB raw (218 KB gzip). Drawing sources: about 0.5 MB raw, before the build |
| Active-animation frame time, p95 | ≤16.7 ms on the iPhone tier, ≤33.3 ms on the low-end Android tier; about 10 ms for the app's own work at 60 Hz | A walking figure posed in place: about 3.2 ms of script and DOM here. An idle board of nine: under 1 ms. Nine walking at once: about 30 ms here |
| Frame regression | ≤ baseline p95 + max(0.5 ms, 5%) | Unmeasured. One walking figure costs about 1.5 ms more than today's rebuild here (3.2 against 1.7 ms). The idle board is cheaper than any rebuild |
| Memory: heap, footprint, growth | ≤48 or 40 MiB heap and ≤8 MiB added; plateau from minute 5 to minute 30 | Heads are defined once per document; templates are bounded and cleared with the board; mounted roots are held weakly; there is no per-frame cache. Unmeasured |
| Lifecycle | No retained trees or growing handles after settle and dispose | The release keeps no global state per mount but the weak map. Disposal is the adapter's (Frontend) |
| Head geometry per frame | No per-frame heavy head serialization or full remount | Met by construction and tested: pose frames never contain the traced art, and remounts happen only where the rig switches structure |

**Unverified: Frontend owns these measurements**, on the mandatory pair: a named low-end Android in its lower-effects tier, and an iPhone in its normal tier.
- frame time;
- startup;
- memory;
- lifecycle;
- reduced-motion switching.

Desktop screenshots and timings cannot fill any device cell.

## Checks performed

Run in the branch's worktree on 7 November 2026, with Node 22.21.1 and npm 10.9.4, after `npm ci` and `npm run build`. These are the checks of the corrected head:

| Check | Result |
| --- | --- |
| `npm run check:toolchain` | Pass: Node 22.21.1, npm 10.9.4 |
| `npm run check:workspace` | Pass: 8 explicit packages; boundaries unchanged |
| `npm run check:sources` | Pass: the rule, source-lock and Canvas hashes; historical releases and runtime ports intact |
| `npm run typecheck` | Pass (pure and browser programs) |
| `git diff --check` | Pass |
| `npm run test:design` | **277 of 277 pass**: the 261 existing and 16 in `packages/design-tokens/test/crew-drawing.test.mjs` |
| `node design/tools/crew-drawing-export.mjs --check` | The 38 generated files (36 exports, the manifest and the record) are identical to a fresh draw |
| Baked exports through the correction | The 36 exports are byte-identical to the previous head's: the new hooks are drawn only on live figures |
| The faster drawing code | A SHA-256 digest of 2,485 drawings (every gesture × mark × outfit for all nine, cards, standees, portraits, live walks, the shared art) is unchanged |
| `node design/tools/crew-drawing-render.mjs` | Both previews are exactly 360 frames at 30 fps, H.264, 1920 × 1080, with no audio stream (`ffprobe`). The comparison sheet rendered, the page reported no console error, and the live checks below were recorded |
| Looked at | The comparison sheet (including the app icons at 64 and 44 px) and frames of both previews (idle, the continuous walk, places) |

What the 16 tests hold:
- the sources' first line and imports, and the ports' freedom from prototype names;
- the traced heads byte for byte;
- the drop-in's ids, signs and flags, and every gesture, outfit and mark;
- unique prefixes, shared art, and templates given each instance's prefix;
- the films' three effects;
- blinks, Echo's visor and the hanging hair;
- reduced motion and still figures;
- **a moving figure posed in place:**
  - every 16.7 ms of continuous walks for all nine, in shared and inline art and three outfits;
  - every exit and arrival from the 27 gestures, on body and front layers;
  - each equal to a fresh draw, on the same elements with the same ids, at most one remount per blend, and the traced art never in a pose;
- **the head's own motion in place:** from the front, looking down and from behind for all nine, the back of Mira's hair and Echo's locs, and reduced motion back to neutral, each equal to a fresh draw;
- portraits with their own head;
- the palette rule;
- the cards' face crop and the standees' anchors;
- the exports, their record and provenance;
- tokens 0.5.0;
- the renders' record and the browser's live checks.

Not run:
- `npm run verify` as a whole: the balance, scenario, frontend and capacity suites cover files this change does not touch, and CI runs them;
- any phone, Safari or iOS;
- any assistive technology;
- the ported runtime, which does not exist yet.

**The live interfaces in the browser** (`window.__crew.liveCheck()`, recorded in `review/renders.json`):

| Browser check (desktop Chrome) | Equal to a fresh draw | Mounted again |
| --- | --- | --- |
| Integration's reproductions (Vega walkPose 0.1 to 0.2; Mira and Echo from behind, sway 4 and lift 2, then reduced) | 5 of 5 | 0 |
| Continuous walks: nine characters, three outfits, shared and inline art, every 16.7 ms | 1404 of 1404 | 0 |
| Exits and arrivals from all 27 gestures, body and front layers, every 16.7 ms | 1304 of 1304 | 100 |
| The head's own motion from the front, looking down and from behind, and reduced motion | 135 of 135 | 0 |
| Portraits set by their own frame after a figure's | 9 of 9 | 0 |

## Limitations and open items

- **No device measurements** (above). They are Frontend's, on the mandatory pair, by the agreed protocol.
- **Nine figures walking at once** cost more than today's nine rebuilds on desktop. Whether a capsule or film that moves several at once meets the budget is for the device runs to show; the levers are listed above.
- **The runtime directory** enters the drawing-port fence when Integration pins the corrected sources.
- **The films art catalog's 27 crew drawings** are to be retired from the new release's bundle after Frontend's consumer check.
- **The review page's furniture** (a bench, a door and an IV stand) is a stand-in for the board's rooms. It is not part of the release.
- **What the owner has not looked at separately.** The owner approved the look as drawn in the pilot and crew pages. These exports are that drawing in the game's boxes. Two things follow from it that the owner has not looked at on their own:
  - the card and standee frame (the icon's superellipse in the card's box);
  - the new suit's sleeve on the held devices.

## After the port: the Designer's review

When Frontend has ported the release, Designer reviews fidelity before Integration merges the port. That review follows the budget's visual and privacy handoff. Frontend sends:
- **Captures** at 320 × 568, 390 × 844 and 430 × 932, in both motion preferences, and screenshots at the actual device viewport:
  - the board, list and selection, own card and ability portraits;
  - all nine ids, down and back, full labels and targets, hair limits, duplicate inline instances, 200% text and normal private-card concealment;
  - a move mid-walk, the Hospital and the Jail, Injured and Eliminated, a standee, a film with a memorial, and the Clone's outline and halftone.
- **A 30–45 second runtime video** (silent):
  - a nine-crew board;
  - a walk and a gesture transition;
  - Mira's and Echo's hair, from the front and from behind;
  - a capsule or film;
  - selection, list and portraits;
  - reduced motion switched while mounted.

Designer compares them with `review/compare.png`, the previews and the source renders, and replies on the port's PR with what matches and what does not.
