# Hosted client: bounded credential refresh, and saying what is happening when a device cannot read

**Issue:** [#3](https://github.com/Amirkianfar66/GameN/issues/3) · **Branch:** `agent/frontend-hosted-feedback`, on Integration's hosted preview branch `codex/v1-hosted-preview` (draft [PR #53](https://github.com/Amirkianfar66/GameN/pull/53)) at `c8856242caea349b620345349f6b59c7a87b6d7f`. Unmerged.
**Wire protocol 2 · ruleset `in-person-v1-2026-10-06`**, V1-01 to V1-21 approved, unchanged. No rule, contract or cloud configuration is touched, and nothing was deployed.

The review of 7 October names two things the hosted client should say more clearly: the device a seat was moved from stays on "Connecting" for good, and the lobby keeps its first "Connecting to the playtest…" line. Reading the code for them turned up a third, which is the reason this was done first. **All three are in the build that is deployed today** (`89f4a88`); this branch changes the source only.

## 1. A refused listener forced new credentials every second and a half

On the hosted transport every `permission-denied` from Firestore is reported as "authorization uncertain", and the next listener that is opened first forces a new sign-in token and a new App Check attestation (`listener-verification.ts`, `hosted-transport.ts`). The lobby's listeners are opened again 1.5 s after each failure, for as long as the page is open (`hosted/main.js`). Together:

- **a shared display that the host has not admitted yet** is refused the lobby by the rules, which is how it waits. It forced both tokens about every 1.5 s until it was admitted;
- **a device whose seat was moved**, once reloaded, did the same for as long as its tab stayed open;
- a phone or display whose match **the host ended before it started** never stopped asking for the view either, because the answer that settles it on the emulators ("refused") does not exist on this transport.

Each forced attestation is a reCAPTCHA Enterprise assessment and each forced sign-in token is a call to the token service. Both are metered and rate-limited by the project. I have not measured it on the deployed project and have no access to its metrics: this is from reading the code, and from a unit test that counts the calls. Ten minutes of waiting, asked every second and a half, was about 400 refreshes; it is now 2.

What changed:

- **A refresh is good for five minutes** (`CREDENTIAL_REFRESH_INTERVAL_MS`). A denial still asks for fresh credentials, but not sooner than five minutes after the last refresh that succeeded. Until then a listener opens with the credentials that refresh gave; the SDK's own renewal keeps them current. A refresh that failed does not count.
- **The lobby's listeners back off**: 1.5 s, then half as long again each time, up to 6 s, and back to 1.5 s once a listener is let in. Six seconds is therefore also the longest a display can lag behind the host admitting it.
- **A match that ended in the lobby is settled**: the second unconfirmed answer about its view is taken as there being none, which is what the emulators' "refused" says at once.

The cost of this: a person who presses "Try again" gets freshly forced credentials at most once in five minutes. In between, the device asks again with the credentials it has.

## 2. The device that cannot read says so

Since Integration's change for finding G23, a hosted device that is refused its view hides the match and keeps the identifiers of an unresolved command, without calling the seat lost. That part is right and is kept. But the screen was left exactly as it is before any view has arrived: the heading "Connecting", one line, no control, for good. On a hosted project that is what the device a seat was moved from shows, and "No access to this match" cannot be reached there at all.

Now that state has a name of its own (`access-unconfirmed`) and its own screen:

> **This device cannot read the match right now**
> The server is not letting this device read the match, so nothing of it is shown.
> This can pass, so try again. It also happens when a seat has been moved to another device: the device it was moved from is then no longer in the match. If you did not expect it, ask the host.
> [Try again]

- It states neither cause as fact, because the device is not told which it is.
- "Try again" opens the listener again. If the server lets the device read, the match comes back from the server's own view, and only from a view the server confirmed.
- Nothing else changes: nothing of the match is shown or kept on screen, the unresolved command's identifiers stay, and a refusal that is final ("No access to this match") or a failed check of the match data is not replaced by it.
- It is spoken once, at once, and focus moves to its heading, like the other screens that take the match's place.
- The lobby pages say their existing sentence when the lobby itself is refused ("The server does not let this device read the match. If its seat was moved to another device, this one is no longer in it."). On the hosted build that sentence could not appear before.

## 3. The lobby's first line goes when the page is drawn

`hosted/index.html` comes with "Connecting to the playtest…" so that something is on screen while the script loads. The page was then added after it, so the line stayed above everything, including above "Could not verify this session". The page now takes its place.

## What was run

On 7 October 2026, macOS, Node 22.21.1, npm 10.9.4.

| Check | Result |
| --- | --- |
| `npm run verify`, clean, at the head of this branch | **662 passed**, 0 failed, 0 skipped, 0 todo: 25 bootstrap and contracts, 79 engine, 46 backend, 16 tooling, 144 presentation, 352 game. That is the 651 of the branch under this one and 11 new. Production exclusion: 46 modules reachable from 2 production entries, 151 files scanned, 23 development files labeled |
| `npm run check:browser-dependencies` | Passed |
| The hosted bundle, `node scripts/prepare-hosted-preview.mjs` with a made-up configuration | **Built**, and its own exclusion check passed. The new screen's words are in the bundle. The configuration names no real project, and nothing was deployed |
| Mutation check | **11 of 11** deliberate faults caught by the tests: the state given no name; a failed data check replaced by it; the screen not its own; its control reloading; its words those of a final refusal; spoken as another screen; a denial during a refresh refreshed for at once; a failed refresh counted; the interval a second; the interval off by a millisecond; nothing refreshed after the first time. One more was an equivalent, a condition written twice, and the second copy is removed |

### Not run

- **The hosted page in a browser.** It runs only at its configured origin with a real attestation. The changes in `hosted/main.js` (the retry waits, the lobby's sentence, the first line) are checked by reading and by the bundle building, and by nothing else.
- **Anything against the deployed project**: no match, no token, no metric.
- An independent review. The change is small and its tests were checked by mutation; a second reader has not gone through it.
- Phones, people, a screen reader.

## For Integration

- **The deployed build still has all three.** Whether to publish again is yours and the owner's. Until then, a display left waiting to be admitted and an old device left open are worth avoiding, and the project's App Check and reCAPTCHA usage is worth a look.
- **`hosted-preview.md` says a definitive refusal still clears the command and denies the old session for good.** On the hosted transport no listener failure is ever classified as definitive, so that screen is not reachable there. This branch does not change that: telling the two apart needs a fact from the service, or a rule such as "refused again on a listener opened after a successful forced refresh", and either is a decision about when a command may be forgotten. I would rather you made it than I.
- **Five minutes and six seconds are my numbers**, chosen from the token lifetimes and from how long a host should wait to see a display come up. Change them if the project's quotas say otherwise; each is one constant.
- `apps/game/src/browser/listener-verification.ts` and `apps/game/hosted/` were written by Integration inside Frontend's paths. I have changed them here and say so plainly: please review those two as yours.
