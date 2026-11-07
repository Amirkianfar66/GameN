# Crew consumer release review

The consumer in PR #196 connects the approved nine-character restyle to the exact Planet `design-0.7.0` tuple. It preserves the historical drawing branch for `design-0.6.0` and the earlier V1 profiles. No creation default, gameplay rule, server timer or Firebase configuration changes here.

## Authority and release evidence

- Designer source: PR #193, `8cee39d89798390d03c2a4a9fe457fa6de387bda`.
- Registration baseline: merged PR #195, `a1ad3e541f3b7ea0789b4ec2f2dd777c7764f414`.
- Exact consumer commit and all production hashes: [consumer approval](crew-consumer-approval-2026-11-07.json).
- The 17 drawing copies and frozen rig remain unchanged. New artwork still uses tokens 0.5.0 and the three registered scoped bundles.

The published `design-0.6.0.json` is unchanged. Its three superseded consumer files are retained by their original content hashes under `design/releases/historical-blobs/`. A separate, independently pinned compatibility record permits only the reviewed current bytes at those paths. Changing the current consumer, losing the historical bytes or editing the approval fails validation. This does not permit arbitrary future code or alter historical artwork.

The initial, unpublished `design-0.7.0` registration manifest is preserved at `design/releases/registration-snapshots/design-0.7.0.json`. The current candidate adds the reviewed consumer inventory and binds its approval. The drawing fence uses an additive supplement for the updated native adapters and release validator; earlier approval files and drawing hashes remain intact.

## Consumer review

The review covers exact tuple dispatch, uniformly loaded asset bundles, selected-root scoping, public character identity, unique SVG references, retained mounted figures, continuous poses, private Clone cleanup, app/device reduced motion, background handling and disposal. A role or faction cannot select public character artwork. Existing actions, logical slots and timing stay authoritative.

Integration identified two corrections after the first consumer checkpoint: the app's Reduced preference must reach every crew mount, and disposal must clear the owned artwork selector. Frontend's follow-up also identified a detached private Clone card retaining event listeners. The reviewed correction retains ownership of that card independently of DOM lookup, so replacing its parent cannot lose the cleanup handle. The actual setup/running dispose-and-reuse check preserves unrelated host attributes; the Clone transition leaves zero crew listeners. Frontend reran all 900 tests successfully.

## Validation and limits

The registration merge passed all nine CI jobs. Frontend's initial consumer reported 900 passing tests, type checks, six viewport/motion capture sets and a 35-second review video. Those original captures used an excluded review harness; they are not proof that the final guarded release was validated.

The Integration finalization passed 47 focused release/fence checks, 223 tooling tests, 277 design tests, source integrity and the guarded hosted build. The 47 focused checks and source integrity were repeated after the final Frontend cleanup at `722b770027bfc1c9e9210e759b9ed7fc67b2bd34`. Exact output validation accepted nine files for design-0.5.0 and 27 each for design-0.6.0/design-0.7.0.

Independent browser validation on that consumer used the ordinary guarded build with synthetic authority: six viewport/motion combinations, 30 current screenshots and six historical screenshots, unchanged slot/name geometry, valid SVG references and no extra asset request when opening the private card. Six app/device motion cases and two actual app/renderer dispose-and-reuse cases passed in isolated Chromium runs. A concurrent browser run failed two full-motion resume assertions; the isolated rerun passed. This timing sensitivity is recorded and does not establish phone performance. [Machine evidence](crew-consumer-verification.json) distinguishes runs and limits. Final CI remains required.

Physical Android/iPhone startup, frame/input timing, memory and sustained-run measurements remain unperformed. Designer acceptance of the actual consumer captures is pending. No deployment or new-match artwork activation is recorded by this review.

## Separate opening and role films

The three requested flows are distinct:

1. Two-second `Game N / by Plan B` branding before the lobby.
2. A private ten-second role film after the role card is revealed, inside the existing thirty-second reading minimum. Completion and Skip cannot confirm Ready.
3. Ten-second public boarding after the minimum reading period and all players Ready, before Round 1. A separately pinned server setup stage must own its start/end; a delayed server response cannot start a player's game locally.

Designer PR #189 at `bbc7bf246f47315f088b3218bf872f53d2b7a8b3` contains the role-film correction candidate. PR #190 at `27083865d5e0bc489a55ab98bc78cfd1eaea941c` contains the app intro and boarding previews. Neither is mounted by this crew consumer. Both character-based films still import the earlier cinematic crew renderer, and the role films also reference earlier portraits. Adoption needs an explicit update to the approved restyle and a separate runtime/source review. Synthetic review movies must not ship as character-dependent runtime films.

Backend verified that boarding is not implemented in the current session contract or `startIfReady`. Its proposed `setupFlowVersion: 2` boundary is separate from the art release. Existing matches retain their saved setup behavior, and artwork activation must not implicitly enable boarding.
