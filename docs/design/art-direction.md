# Mothership — Board and card art direction

**Version:** 0.2 · **Status:** Design proposal for the evaluation slice.  
This document specifies intended presentation. No artwork, renderer benchmark or user approval is implied.

## Visual concept

A cutaway spacecraft printed like a graphic novel: dark ink silhouettes, warm paper highlights, painted industrial surfaces and selective halftone. Room silhouettes and readable player numbers take priority over decorative detail. Use restrained depth and a fixed oblique camera; rotation is optional exploration, never required to understand a move.

The public palette is charcoal, paper and muted steel. Amber identifies interaction focus, not faction or danger. Blue, Red and Alien accents appear only in an authorized private view or an explicitly permitted reveal. No faction-coded silhouettes, uniforms, trails or location lighting on the live public board.

Use painted shading first, with a small number of dynamic effects proposed for profiling. Halftone belongs in selected illustration areas, never behind small text. Render card text, action controls, status labels and timers in DOM. Perspective-distorted text must not be the only readable copy.

## Surfaces and layout

| Surface | Layout and behavior |
| --- | --- |
| Private phone, 320–599 CSS px | Phase/timer strip; current location summary; scrollable actions; bottom action dock; separate private role drawer. One expanded card at a time. |
| Player tablet/desktop, 600+ CSS px | Board overview beside readable action/detail panel. Larger space does not grant additional information. |
| Shared table display | Board centered, numbered player roster beside it, phase/timer above. Reflow roster below at narrow widths. No private controls. |
| Host | Lobby/session controls in ordinary DOM panels; host status grants no additional role visibility. |

Proposed breakpoints are content tests, not device detection. Preserve safe-area insets. At larger text sizes, stack cards and allow page scrolling; never shrink critical instructions to fit a decorative frame.

The board includes Room A, Room B, Command Room, Hospital and Jail. Show the Final Zone only at its authorized phase. Give each zone room for all nine neutral tokens by grouping/reflowing, without implying room capacity. Distinguish health, Jail and Captain with separate labeled markers. Captain retains the title marker after leaving Command; any immunity feedback requires authorized current location data.

Do not draw definitive Captain routes or automatic Hospital/Jail exit arrows while those rules remain unresolved. Spatial artwork does not establish adjacency. Movement destinations come from the authorized action view, not geometric proximity.

## Cards and interaction

Use a proposed 5:7 illustration/card frame, with flexible-height DOM details. Card hierarchy: action name, availability, effect summary, resource count, primary command. Role identity and private knowledge remain in a closed private drawer, with a deliberate reveal/hide control. Automatically hiding it on backgrounding is a convenience, not screenshot protection.

| State | Required feedback |
| --- | --- |
| Available/selected | Label plus outline; slight lift optional |
| Targeting | Numbered eligible targets and a complete tap path; dragging optional |
| Confirmation | Explicit target and consequence from approved copy |
| Pending | “Submitting…”; prevent a second command while retaining recovery |
| Accepted | “Registered” when queued; never depict damage before resolution |
| Spent/unavailable | Distinct label and authorized reason; keep explanatory access |
| Reconnecting | Preserve context, mark stale information and restore from server view |

The Officer card must communicate one shot total, available from Round 1 when eligible. Do not reintroduce the archived faction-identification step. Standard Hack request and conversation are separate states; there is no ordinary private chat. Only the supplied audience view decides whether a Protection cue can appear.

## Type, color and accessible feedback

`design-tokens.json` defines proposed numeric values and semantic colors. Use a system sans stack for body copy in the first slice, condensed system headings where available, and original vector lettering for the eventual masthead. All final font files need documented licenses and loading fallbacks. Body starts at 16 px with 1.5 line height; labels at 14 px; timers use tabular figures.

Use paper text on dark panels, ink text on paper cards, and ink text on amber controls. Faction accents need a text label; they are not small-text colors by default. Acceptance targets are 4.5:1 for normal text and 3:1 for large text/essential non-text indicators, verified against actual compositing. Focus outlines remain visible above the canvas. Interactive targets are at least 44 CSS px in this design.

Provide keyboard operation, named controls, logical focus return and a DOM list equivalent for actionable board information. Announce meaningful phase/result changes, not every countdown second. Avoid flashing effects. Mute, reduced motion and low-effects options remain accessible during play.

## Motion and audio

The user requested expressive comic motion graphics on 26 September 2026. Follow [motion-direction.md](motion-direction.md) for the proposed cue library, three levels of emphasis, first motion-gallery deliverable and event/disclosure constraints. Panel reveals, ink trails and impact lettering are part of the intended visual language; exact treatments and timings remain evaluation proposals.

Proposed motion timings: 120 ms selection, 220 ms card transition, 450 ms public move, up to 900 ms cosmetic comic beat. Reduce motion to a short crossfade or direct change, without camera travel or screen shake. Animations cannot spend the next player's turn or decide game outcomes.

Audio requires an explicit user gesture to initialize; Frontend owns browser handling. Offer separate music/effects controls and textual equivalents. Public cues follow public events only. Phones produce no role-specific or secret-action sound; a private confirmation can still be audible to neighboring players. Long ambience remains optional.

## Asset and Frontend handoff

Use editable layered sources under `design/source/`, review exports under `design/review/`, and approved runtime exports under `design/exports/`. Proposed IDs follow `board-room-a`, `token-neutral`, `card-officer`, `fx-public-impact`; filenames add variant and content hash. Keep text out of textures. Provide GLB geometry, optimized textures, SVG interface icons and browser-compatible audio exports, with fallback formats agreed with Frontend.

Proposed scene convention: +Y up, floor X/Z, one authored unit equals one grid unit; token origin at its floor contact. Document pivots, anchors, bounds, UV sets and material channels. Start textures at 1024 px; justify 2048 px only through visible need. Frontend owns compression, runtime memory budgets and tested quality tiers.

Every asset manifest entry carries stable ID, version, path, dimensions/bounds, anchor, variants, source, rights and bundle. Load role artwork in a uniform shared bundle; fetching only a dealt role or hidden action can disclose identity. Public token shape and material stay identical across roles.

For every component/event supply its audience, data fields, input, pending/result states, copy, animation, reduced-motion equivalent and missing-asset fallback. Frontend animates only authorized presentation events with safe IDs; never inspect private engine state to decide effects. Backend must first specify private disclosure recipients and reveal timing. Until resolved, affected effects remain clearly labeled fixtures.

Review the slice on real phones and a shared display for readability, touch accuracy, secret leakage, motion comfort and asset cost. Record device and conditions; unresolved checks stay pending. A visual review cannot certify multiplayer correctness or balance.
