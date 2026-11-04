# Sky Rush Adventure — RC7 optional path guide

5 November 2026, Asia/Dubai. Separate public review, not final child/device/security acceptance.

Public hub: https://thafarmaaitah.github.io/Bouncing-/review/v29-rc7/index.html
Tested candidate: `d02b751178bc29a041f198cfe205c4902bf18ced`.
Publication commit: `8000be541227e1c0d568526588ef1d14ed774cff`.
Original RC6 baseline: `98856342a2f2c13227145865e079d780f2a37db7`.
Concurrent preserved main: `37859cfcf915d37fe7980090bc6d730977179703`.

## Delivered

Both existing stages have a Show next platform checkbox on Start/Pause. It defaults off in each newly opened stage and is not stored. When enabled, a static white ring and small downward indicator mark the next route platform. The indicator follows moving platforms, hides when its target has collapsed, and points back along the existing route toward an earlier missing star. It is a direction hint, NOT a predicted safe landing or collision-free route. The child must still move, jump and avoid obstacles.

Three setbacks since the current checkpoint trigger a help suggestion. Help is not enabled automatically and does not interrupt play. Shield-assisted respawns count as setbacks. The guide does not change speeds, jump formulas, collisions, platform positions, lives, Dash or the course. No additional level was introduced.

Once help is used in a started attempt, that attempt remains guided even after disabling it. A guided five-star finish can earn Star explorer, but not Clean run, Time finisher or a best-time record. Previously earned badges are retained. A fresh attempt with the guide off restores ordinary eligibility. Restart/Pause provide access to the checkbox; replay retains the current checkbox choice, whereas opening the other stage starts it off.

The six-badge progress schema remains unchanged, with new RC7-only storage keys. Old-version progress and times remain separate and are not imported or deleted. No guide setting, identity, model or gameplay event history is added to storage. The existing local model session, validation, same-origin/source message checks and privacy controls remain. No private V4.1 asset was loaded or published; no geometry/material edit was made. The local-model validator and large-tablet-control stylesheet are byte-identical to RC6.

## Preservation and concurrent work

The tested candidate adds exactly 14 files under `review/v29-rc7/`. While tests ran, another commit added `review/v29-rc6/ipad-acceptance.html` to main. After the first ref-update attempt returned a server error, main was reread, the new commit inspected, and its tree retained. Publication uses the exact tested RC7 Git blobs on top of that new tree, with both histories recorded as parents. A non-forced update with the new expected SHA succeeded. No existing file was modified or deleted; the new RC6 acceptance checklist, all previous versions and the original homepages are preserved. Test code and this report stay on the review branch, outside the published game folder.

## Executed verification

Successful hosted-browser run: https://github.com/thafarmaaitah/Bouncing-/actions/runs/41907395042
Artifact: https://github.com/thafarmaaitah/Bouncing-/actions/runs/41907395042/artifacts/13359989525
ZIP SHA-256: `5924ba54a8e2285f12575b2d97ec19a1298187f012a39952ef197391cd50ff83`.

Browser: hosted Google Chrome 156.0.8078.47, driven by Playwright 1.56.1 on Linux with software rendering. Not a physical iPad or iPhone.

- **12/12 rule checks passed**: target selection, return toward missing stars, secret-branch return, invalid inputs, guided badge restrictions, earlier-award preservation and Practice exclusion from timed rewards.
- **4/4 browser scenarios passed**, at touch-enabled 390x844, 844x390, 1024x650 and 768x1024. Each includes session/character regression and guide checks. They verify guide defaults and native checkbox activation, no automatic player motion, moving-platform target tracking, hidden collapsed targets, reverse guidance, irreversible guided status within a round, record protection, fresh unassisted eligibility, independent Storm rules and optional help after three setbacks. Existing model continuity, selective record deletion, parent pause/manual Resume, result/replay/next flows, invalid/external model rejection and original control sizes are exercised. No JavaScript or dependency errors were recorded.
- **4/4 real-time native-keyboard full routes passed** using the existing route controller. Practice has the guide off; Time Challenge has it on. Each stage finished with five stars. These use read-only state observation and ordinary movement/jump, not teleportation, forced score or accelerated time.

| Route | Guide | Lives left | Respawns | Award behavior |
|---|---|---:|---:|---|
| Lava / Practice | Off | 2 | 2 | Explorer yes; Clean and Time no |
| Storm / Practice | Off | 3 | 0 | Explorer and Clean yes; Time no |
| Lava / Time Challenge | On | 3 | 0 | Explorer only |
| Storm / Time Challenge | On | 3 | 0 | Explorer only |

Do not describe all four routes as fall-free. Lava Practice recovered from two setbacks, including shield protection. The runtime source remained unchanged during testing.

The focused browser scenarios use explicitly test-only score/position/setback fixtures injected into local HTTP responses, and a synthetic triangle GLB rather than private V4.1. Those fixtures are absent from shipped files. The four full-route cases are separate evidence without gameplay-state mutations. The phone and tablet path-guide screenshots were visually reviewed.

## Environment attempts retained, not counted as game passes

Original attempt https://github.com/thafarmaaitah/Bouncing-/actions/runs/41906274373 built the source and passed rule checks, but its browser installation stalled and was cancelled at the job time boundary; browser and full-route steps were skipped. This supplies no WebKit runtime pass.

An exact candidate package was preserved in run https://github.com/thafarmaaitah/Bouncing-/actions/runs/41906994562 . Its 14 source files were matched by SHA-256 after download. A local Chromium 144/Xvfb fallback could create WebGL, but navigation to its local HTTP server was blocked by browser administrator policy. All four local scenarios stopped at navigation and are not game-runtime results. No policy was disabled. Testing moved to the permitted hosted existing-Chrome run above, without changing the candidate.

## Public HTTPS verification

Successful run: https://github.com/thafarmaaitah/Bouncing-/actions/runs/41908211674
Artifact: https://github.com/thafarmaaitah/Bouncing-/actions/runs/41908211674/artifacts/13360408841
ZIP SHA-256: `858393deb405a7ef3f88cc4e71574a901220d6ae44db8f4706818984a3025c8e`.
Finished 4 November 2026 at 20:37:04 UTC (5 November, 00:37:04 Dubai).

**40/40 public files** returned HTTP 200 and matched the publication commit exactly: all 14 RC7 files plus 26 earlier pages/dependencies, including the concurrently added RC6 acceptance checklist.

**2/2 uninstrumented public Chrome sessions** passed, one per stage through the hub. Actual HTTPS engine/canvas loading, guide selection, Start/timer, JUMP, Pause, guide-off/manual Resume, retained guided-attempt notice and End session were exercised. No test API was present. No page errors were recorded and observed HTTP requests were same-origin GETs. The live Pause/guide screenshot was visually inspected. These are public startup checks, not complete live route playthroughs.

## Limits

No new WebKit/Safari runtime verification, physical iPad/iPhone, actual V4.1 loading/appearance/performance, long-session review, child-enjoyment study or independent security certification was completed in this release. Earlier WebKit evidence applies to earlier releases only. No absolute safety or final acceptance is claimed. Hosting access logs remain outside this review.

## One user check

Open the RC7 hub in Safari, select Lava Rush, enable Show next platform before Start playing (or through Pause). A ring/indicator should show the next route platform while the child controls movement. At completion the result should identify a guided attempt. To make a new unassisted record, use Restart, turn the guide off and Start playing. RC6 and earlier links remain unchanged.
