# Food review: hash final written output

Development-only source **`641c3b6275053ede11a307a23c7209673c844ccb`** corrects the excluded Food review build's output record. All 30 native inputs remain byte-identical to candidate **`8ffce95a0cfe92facc75d8cf0a86f3686608f176`**. The existing [focused Designer packet](food-supply-chrome-ownership-2026-11-14.md) remains the runtime review; no layout, words, controllers, game behavior or served visual asset changes here.

The previous provenance plugin hashed asset sources during `generateBundle`. Final output checking found that the connected CSS was later written as 256,469 bytes, SHA-256 `41f184dca038cbd69dbca51d09be55323ccacbcb2d973ec1cb128025787914fc`, while the earlier record described 256,481 bytes and SHA-256 `dec5a480ad3cc860d8a4b24b59247d53d2473af2cfa3dc925ecf4eab7dc08688`. The earlier asset row was inaccurate. The correction records actual disk bytes in a final `writeBundle` hook; it does not manually replace the stale hash.

Both builds ran from clean source 641 after the change. An independent final file inventory includes JavaScript, CSS, HTML and static assets, excluding only the provenance record from served-byte equality. Every such file has exactly the same path, byte length and SHA-256 as the actually served 8ff build captured before rebuilding. **Only `food-review-provenance.json` changed.** All rows in each corrected asset record now match the final disk files; all recorded source-module hashes match current source.

| Review build | Source modules | Accurate asset rows | Unchanged final served files | Provenance SHA-256 |
| --- | --- | --- | --- | --- |
| Component/full-app synthetic |202|71|74|`1a52fbba50cda5137d5dfc780a76ef6b4f38c82e33c2c96ad6c928ab4488ad74`|
| Connected, no synthetic entry |197|69|70|`e4461f3a7702493e85db65b28bb94d10d3c662da08554b545b1070f8d9250c5f`|

The connected build remains at `/private/tmp/gamen-food-connected-preview`; provenance is `/private/tmp/gamen-food-connected-preview/food-review-provenance.json`. The source worktree is `/private/tmp/gamen-frontend-food-supply`. The component build remains at `/private/tmp/gamen-food-preview`. Native 8ff is unchanged, and the official Backend d5 API was neither changed nor restarted.

The original 122 evidence-file identities and original manifest `54dddde19d6332f22ef00901bc976ae187230c89c8d4aa54ab508af1a94c728d` were reverified unchanged. Their original provenance is preserved as evidence of what was recorded at that time. This supplement supplies the corrected final record and the independent byte comparison. Browser captures/tests were not repeated because every served file is identical; this check is specifically final output identity, not a new browser or connected acceptance run.

[Original 8ff final file inventory](evidence/food-supply-provenance-finalization-2026-11-14/original-8ff-final-files.json), [final source/output verification including JS](evidence/food-supply-provenance-finalization-2026-11-14/final-file-verification.json), [component build](evidence/food-supply-provenance-finalization-2026-11-14/component-build.txt), [component provenance](evidence/food-supply-provenance-finalization-2026-11-14/component-build-provenance.json), [connected build](evidence/food-supply-provenance-finalization-2026-11-14/connected-build.txt), [connected provenance](evidence/food-supply-provenance-finalization-2026-11-14/connected-build-provenance.json), [supplement hashes](evidence/food-supply-provenance-finalization-2026-11-14/manifest.json).

Renewed focused Designer approval and real connected acceptance remain open. Backend's next bounded seven-player timing diagnostic has a separate identity and does not replace acceptance. The unresolved pre-admission heartbeat stage remains unresolved. No phase timing, deployment, activation or physical-device claim is added.
