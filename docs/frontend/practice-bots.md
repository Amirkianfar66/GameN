# Practice bots for the first V1 test

Issue [#70](https://github.com/Amirkianfar66/GameN/issues/70), based on the comic preview
`ba91910e29d6a6d6c2f225186e721df58c206f1b`. This is an integration candidate. Publication
and executed acceptance are recorded separately; this document is not deployment evidence.

## Using the host controls

1. Open the host page and create a seven-, eight- or nine-seat lobby.
2. Under **Practice bots**, choose the number of bots and press **Add bots**. The default
   reserves one seat for a human. For a solo seven-seat test, choose six bots.
3. Open a separate **Player tab**, join with the room code, and approve that player on
   the host page. Choose a public name and an available character on the Player tab.
4. When every seat is filled and the bot update has settled, press **Start the match**.
   Play from the Player tab. A separate admitted display can show the public comic board.
5. To watch a match without playing, fill all seats with bots and use an admitted display.
   End a disposable test through the host's normal confirmation controls.

Bot counts can be changed only before start. Human seats are never removed by a bot-count
change. Bot seats and practice matches are labeled on player and display screens. The
host's seat-recovery control lists human seats only.

A bot is a server-controlled heuristic player. It makes simple legal choices from its
own permitted information. It does not chat or bluff. Use it to exercise the interface
and game flow; it does not substitute for an in-person social-deduction or balance test.
The ruleset remains `in-person-v1-2026-10-06`, engine `full-game-1.0.1`, protocol 2,
with Original Powers off. The public character catalog and comic assets are unchanged.

## Client boundary and retry behavior

The host calls `v1SetPracticeBots` using the strict shared request/response schemas. A
successful reply must match the requested match, request ID and bot count. Until an
uncertain operation settles, retries keep the same request ID and count. The browser
never creates bot Auth identities, selects bot roles, submits bot actions or subscribes
to bot-private projections. Practice metadata is a separate public document at
`matches/{matchId}/practice/public`; it contains only versioning and bot seat IDs.

The public metadata feed rejects malformed, cross-match, stale, regressed and conflicting
same-revision documents. Authorization uncertainty clears its held value. A fresh missing
legacy document means no bots; an unavailable read does not. Unknown metadata blocks bot
configuration, start and new seat-recovery choices until a fresh read arrives. A successful
count request waits for the corresponding metadata revision before enabling start.

The ordinary lifecycle policy still applies: giving up an uncertain request does not
cancel it on the server. The UI says it may still arrive and asks the host to check the
roster before starting. Bot-count requests are not retained across page reloads; they
contain no game secret, but keeping all lifecycle operations durably is outside this
change. The server remains responsible for capacity, authorization and lifecycle gates.

## Executed client checks

At the client implementation checkpoint, pinned Node 22.21.1 and npm 10.9.4 passed both
TypeScript checks, the build, and **527 frontend tests** (151 presentation, 376 game).
Focused cases exercise seven/eight/nine-seat defaults, preserving human capacity,
add/remove controls, pending retries, delayed roster delivery, fresh legacy absence,
metadata quarantine, forbidden public fields, and no bot recovery choices. The new
endpoint is included in the exhaustive operation/request-schema coverage.

These are client and markup checks. They do not establish deployed bot execution,
background delivery, physical phone behavior or completed hosted games.

## Reproduce local browser acceptance

This separate harness uses the real hosted client, strict service operations and Firestore
Rules against isolated Auth/Firestore emulators. Its loopback timer calls the same bot and
deadline service methods. It is not an emulator of production Eventarc or Cloud Tasks and
must not be used as proof of cloud background delivery. Existing comic-harness ports are
left available to other review work.

With pinned Node/npm and Java 21 on PATH, run these in three terminals at this checkout:

```sh
npm run build
npx --no-install firebase emulators:start --config firebase.practice-emulators.json --project demo-mothership --only auth,firestore
```

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8590 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9599 GCLOUD_PROJECT=demo-mothership node apps/game/dev/practice/server.mjs
```

```sh
npx --no-install vite --config apps/game/dev/practice/vite.config.mjs
```

Open `http://127.0.0.1:5176/?as=host`, `?as=player` and `?as=display` in separate tabs.
These development modules reject cloud configuration and are excluded from publication.
