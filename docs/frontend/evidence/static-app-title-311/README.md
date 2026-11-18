## Entry title, sheet 10

The production-header phone harness opened a fresh game at `/?scenario=join`. Desktop Chromium drew the released wordmark on black as a single image in all four runs. Each pair of captures, taken after image decode and again after 1.2 seconds, was byte-identical. Both motion settings also produced the same pixels at the same viewport. The menu became interactive after 1,996–2,001 ms. Returning to the game in progress bypassed the title.

| 390 × 844 | 430 × 932 |
| --- | --- |
| ![Entry title on a standard iPhone viewport](390x844-full.png) | ![Entry title on an iPhone Max viewport](430x932-full.png) |

[Observation times and screenshot hashes](observations.json) · [Native and pack comparison record](compare.json)

| Historical sheet 10 | Native still |
| --- | --- |
| ![Historical brand artwork from sheet 10](img/intro-pack.jpg) | ![New page graphic in the phone harness](img/intro-build.jpg) |

To repeat the comparison, build the existing native phone harness with the checked artwork baseline and run `node design/tools/phone-ui-native-compare.mjs --only intro --build <phone-build> --out <output>`. For the timing check, open a fresh entry at both viewports in each motion setting. Capture the decoded title and a second frame 1.2 seconds later. Check a direct game resume separately.

The playable source was `6c296544`. The clean test checkout `20d63949` adds the private playtest tooling, including its existing JSON provenance support. The art source was `64e55516`. The older build and this candidate both logged the same blocked JavaScript capability probe under production CSP. The title image decoded in every case. Physical phones and VoiceOver are still unverified.
