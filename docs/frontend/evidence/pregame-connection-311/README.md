# Pre-game connection review

Candidate `39961a80` uses artwork from `64e55516`. The screenshots below show the actual Planet app with synthetic sessions under the staging response headers. Desktop Chromium ran at both iPhone viewport sizes. Physical iPhones, Safari and VoiceOver still need a device check. [Checks, header values and image hashes](checks.json)

| Player sees | 390 × 844 | 430 × 932 |
| --- | --- | --- |
| Recovered seat after retrying the original request. Continue enters the match. | [Recover](guarded/390x844-recovered.jpg) | [Recover](guarded/430x932-recovered.jpg) |
| The server's refusal in the character grid's existing notification. | [Character choice](guarded/390x844-character-refusal.jpg) | [Character choice](guarded/430x932-character-refusal.jpg) |
| A face-down card and a busy Ready button until the server answers. Show role is disabled. | [Ready pending](guarded/390x844-ready-pending.jpg) | [Ready pending](guarded/430x932-ready-pending.jpg) |
| The masked host recovery code. The checks also close and conceal the revealed sheet, inspect its discarded content, and reopen Host controls. | [Host controls](guarded/390x844-host-code.jpg) | [Host controls](guarded/430x932-host-code.jpg) |

At both sizes the brand film drew on entry and stayed dismissed on return from Host setup. The private role and boarding films rendered in their server intervals. Skipping the role film kept Ready under server control, and skipping boarding kept the phone in the boarding stage until the server started the match.

The comparison tool drew five pack and app pairs for `recover`, `characters`, `role-ready`, `settings` and `host-controls`. Its comparison server uses its own headers. The eight captures above and the twenty phone-checker states used production headers. [Entry](comparison/stages/01-start.jpg) · [Character and role](comparison/stages/02-pregame.jpg) · [Settings](comparison/stages/03-panels.jpg) · [Host controls](comparison/stages/04-system.jpg) · [Comparison record](comparison/compare.json)

To repeat the standard phone check, build the workspace in a clean checkout of the candidate, set `GAMEN_PHONE_ART_BASE` to a clean checkout of the artwork commit, and run the command below. The tool prints the local harness directory. Pass that directory to `design/tools/phone-ui-native-compare.mjs` with the five part IDs above.

```sh
node design/tools/pregame-connection-check.mjs --only recover,host-abort,stale,role-ready,boarding --keep
```
