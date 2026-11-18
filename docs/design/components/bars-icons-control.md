# Bars & Icons Control

A private test page where the owner reviews every bar and every icon on a phone, and marks each one OK or Change.

The owner asked for it on 18 November 2026:

> What I want from you is to provide me a control system for all bars and Icons working with sheets and Test views on phone

- **The page:** [Bars & Icons Control](https://claude.ai/artifact/NxRTWzpGGTqnZ2Sv86ovvq). It is private: only the owner, and people the owner shares it with, can open it.
- **Its source:** `design/phone-ui/control/`, dev-only. It is not the game and not a release.
- **Owner of the page:** Designer, the Bars & Icons builder.

## What it shows

Everything on the page is drawn by the runtime files the game imports: the phone shell, the kit and the icons' one source. Nothing is redrawn for the page.

| View | What it holds |
| --- | --- |
| **Bars** | 53 states in five groups: the top bar, the bottom bar, what lies over the room (target bar, chip, banners, toast), the sheet frame, and the whole phone. Each is a strip of the phone at the phone's own width, with its name and the phone pack's sheet number. |
| **Test view** | The whole phone, live: the shell fills the screen, with the room scene (Room B) in its room area. A control has a switch for every input of the shell: the bar, the clock, Promises, the tabs, the round button, the target bar, the chip, the banners, the toast, the sheet, the connection, the text size. The bars' own buttons answer taps. |
| **Icons** | The 79 icons of `design/phone-ui/components/icons.mjs`, at rest and selected, on dark glass and on paper. Below them: the game's own drawings that are still on screen, beside the icon that replaces each. |
| **Status** | The owner's marks, and the version and pull request of each part. |

**The text size** switch sets the page root's font size, as the game does, so every phone on the page takes the Large (150 %) or Largest (200 %) text.

**What is a stand-in:** a sheet's content, the private talk's capsule and the films are other builders' components. The page labels each one and draws only its frame.

## The owner's marks

Each state and each icon has two buttons, **OK** and **Change**, and a note for Change. The marks are kept in the page's own store, in the collection `marks`:

| Document | Fields |
| --- | --- |
| `bar-<state>` or `icon-<name>` | `status` (`ok` or `change`), `note`, `label`, `group`, `at` (when it was marked) |

- **Who writes:** only the page's owner and its editors. Everyone else the page is shared with can look and try, and reads the marks.
- **Who reads:** the Bars & Icons builder, with the `ArtifactData` tool, and reports each Change to the Lead Designer.
- **A mark is not a record.** A change of look still needs the Lead's agreement and the owner's approval, recorded in `docs/design/owner-decisions.md`.

## Building and publishing

```
node design/tools/bars-icons-control.mjs --out <file.html>
```

The tool bundles the page with Vite from the components themselves, and writes one file. Into it go:
- Room B's pictures (`design/room-drawing/assets`), the room's extension and the crew's portraits, as data on the CSS properties the game's bundles define;
- the source commit and the build time;
- the icons page's table (`docs/design/components/icons.md`): each icon's line and users.

The file is the page's content for the host, which adds the document around it. Publish it to the same page, so its link and the marks stay.

Build from a committed tree: the page names the commit it was built from.

## Checks

On `d0139b11`, in desktop Chromium, the built page inside the host's document skeleton:
- **Sizes:** 390 × 844 and 430 × 932, and 1440 × 900 in the dark theme.
- **Views:** Bars (every group), the test view (a turn, your turn, a sheet at the Largest text, the private talk), Icons with an icon open, and Status.
- **Result:** no page error, no console error, and no sideways scroll at any size.
- **The store:** an owner's write and read work, and a write at a viewer's level is refused.

**Not checked:** a physical phone, Safari, a screen reader. The page's own controls on the real page with the owner signed in are for the owner's first look.

## Limits

- The switches can make a combination the game never shows.
- Names, seats and places are the phone pack's synthetic fixtures.
- On a phone the page runs inside the host's frame, so the bars are true size and the phone's height is the frame's.
- The room behind the bars is today's Room B. The new painted rooms come with their own brief.
