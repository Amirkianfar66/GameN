# Bars & Icons Control

A private test page where the owner reviews every bar and every icon on a phone, and marks each one OK or Change.

The owner asked for it on 18 November 2026:

> What I want from you is to provide me a control system for all bars and Icons working with sheets and Test views on phone

And, the same day, after the first version:

> I need the control system to be more organized for example the bar tab devide to bottom bar and Top bar or other bars if we have , also Icons devide to sub parts , also I need the Size of them the background of them if they have everything should readable related to them

- **The page:** [Bars & Icons Control](https://claude.ai/artifact/NxRTWzpGGTqnZ2Sv86ovvq). It is private: only the owner, and people the owner shares it with, can open it.
- **Its source:** `design/phone-ui/control/`, dev-only. It is not the game and not a release.
- **Owner of the page:** Designer, the Bars & Icons builder.

## What it shows

Everything on the page is drawn by the runtime files the game imports: the phone shell, the kit and the icons' one source. Nothing is redrawn for the page.

The page has three sections. Bars and Icons are divided into sub-parts, each with its own view and address.

| Section | Sub-parts | What each holds |
| --- | --- | --- |
| **Bars** | Top bar (20 states) · Bottom bar (14) · Other bars (8: the target bar, the banners, the chip, the toast) · Sheets (8) · Whole phone (3) | Each state is a strip of the phone at the phone's own width, with its name, the size of its bar and the phone pack's sheet number. |
| **Icons** | Navigation (8) · Game actions (26) · People and places (8) · Phases (7) · Before the match (3) · Controls (27) · Drawn twice (31) · Other drawings (8) | The icons of `design/phone-ui/components/icons.mjs`, at rest and selected, on dark glass and on paper. The last two list the game's own drawings that are still on screen, beside the icon that replaces each. |
| **Status** | — | The owner's marks, and the version and pull request of each part. |

**The test view** opens from any strip: the whole phone, live. The shell fills the screen, with the room scene (Room B) in its room area. A control has a switch for every input of the shell: the bar, the clock, Promises, the tabs, the round button, the target bar, the chip, the banners, the toast, the sheet, the connection, the text size. The bars' own buttons answer taps.

**The text size** switch sets the page root's font size, as the game does, so every phone on the page takes the Large (150 %) or Largest (200 %) text, and every size on the page is read again.

**What is a stand-in:** a sheet's content, the private talk's capsule and the films are other builders' components. The page labels each one and draws only its frame.

## Sizes, backgrounds and colours

Every number on the page is measured from the live component (its box and its computed styles), by `design/phone-ui/control/specs.mjs`. None is copied from a stylesheet, so each is what the game draws at the current text size.

**For a bar.** Each strip shows the size of its bar beside its name, and a list, "Sizes and colours", of its parts. The first state of a sub-part has the list open. For each part the list gives what applies:

| Line | What it says |
| --- | --- |
| Size | Width × height in px, beside the part's name |
| Shown at | Its strength, when it is dimmed |
| Tap area | The larger area that takes the tap, where there is one |
| Background | The fill, with a swatch, its hex value, its opacity and the kit's name for it; a gradient's first and last colour; "A picture"; and the blur of a glass surface |
| Border | Its width, its sides and its colour |
| Corners | The radius, or "A circle", or "Fully round ends" |
| Text | The words, their size and weight, and their colour |
| Icon | Which icon of the one source, its form, its drawn size and its colour |

The test view's control has the same list for everything it shows.

**For an icon.** Each icons sub-part states what every icon shares: a 24 × 24 px grid with 2 px kept clear, a 1.8 px round line, the colour of its control, and no background of its own. Under the grid, "Where the bars draw them" lists each place a bar draws one of those icons: drawn as the bar draws it, with its size, its colour and the ground behind it. An icon's own view adds its line width, its selected form, its line in the source and the components that use it.

**How the icons' places are found:** each of the 53 states is mounted once, off screen, and its icons are read. A still phone is brought to rest first, so a sheet or a toast is read arrived, not part-way in.

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

**After the Lead's review of the first version** (18 November), two changes, looked at again at 390 × 844:
- a whole-phone strip shows the phone's outline on the page's ground, with words that read, and says to tap it;
- the test view's floating controls fold to the screen's edge five seconds after their last use, clear of the room. The one button left unfolds them.

**The second version** (the owner's second request, 18 November), looked at at 390 × 844, at 430 × 932 with the Largest text, and at 1440 × 900 in the dark theme:
- every sub-part of Bars and Icons opens from its chip and from its address;
- a strip's size and its parts' readouts match the bar drawn above them, and change with the text size;
- each icons sub-part lists the places the bars draw its icons, each drawn in its own colour on its own ground;
- no page error, no console error and no sideways scroll.

**Not checked:** a physical phone, Safari, a screen reader. The page's own controls on the real page with the owner signed in are for the owner's first look.

## Limits

- The switches can make a combination the game never shows.
- Names, seats and places are the phone pack's synthetic fixtures.
- On a phone the page runs inside the host's frame, so the bars are true size and the phone's height is the frame's.
- The room behind the bars is today's Room B. The new painted rooms come with their own brief.
