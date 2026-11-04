# Sky Rush Adventure — V29 RC6 goals and local achievements

4 November 2026, Asia/Dubai. Separate public review build; not final child/device acceptance.

Application commit: `018d6067382307af98751db47ae3a99f649304b4`.
Preserved baseline: `a3e317944895d4149e76b56310e0fea04b7813af` (RC5 plus its review documentation).
Entry point: [RC6 session hub](./index.html).

## Delivered gameplay progression

The same Lava Rush and Storm Circuit now offer a small optional goal selector and a visible local achievement board. No new course or gameplay physics was added.

- Star explorer: finish the stage with all five stars.
- Clean run: finish with no fall, obstacle hit, shield-assisted respawn, or checkpoint retry in that attempt. A shield prevents a lost life but does not erase the setback for this badge.
- Time finisher: complete an eligible Time Challenge. A checkpoint retry makes the attempt ineligible. Practice never grants this timed badge.

Choose Star explorer or Clean run as the displayed goal. Time Challenge remains a separate existing play mode. All qualifying badges can be earned regardless of the selected display goal. There are three unique badges per stage, six total; repeat wins do not multiply rewards. Replay resets attempt counters. Previously earned badges remain earned after a later failure. The board marks an island as powered after its first completed five-star run; this is a progress-board change, not a new 3D level.

New result text names the earned badges and states whether they were saved. An unsuccessful Clean run can still finish the stage and continue normally. No penalty, forced restart, daily streak, purchase, random paid reward, public leaderboard or loss of earned badges for inactivity was added.

## Privacy and preservation

Progress uses one version-specific localStorage key containing only schema version and six boolean badge flags. The two RC6 best-time keys remain separate from all older versions. The parent-information dialog explains the new storage and can delete RC6 progress and times without deleting earlier versions' records. No name, profile, date, character file or gameplay-event history is stored with the badges. Storage failure is reported without stopping play. Local progress is not cloud-synced and can disappear when browser data is cleared; old-version records are not imported.

The RC5 same-tab character session, origin/source message checks, local-only model validator, content security policy and no-external-model-resource restriction are retained. No private V4.1 file was available, modified or published. The validator and tablet-control stylesheet are byte-identical to RC5. The game remains single-player without chat, accounts, ads, purchases or new analytics. Ordinary hosting requests can still be logged by the hosting provider.

All 92 baseline tracked files were checked byte-for-byte and preserved. The application commit adds exactly 12 files under `review/v29-rc6/`; this review document is a separate thirteenth addition. RC5, RC4, RC3, V28, earlier pages, the original homepage and shared engine files remain unchanged.

## Executed tests — first batch

Run: https://github.com/thafarmaaitah/Bouncing-/actions/runs/41817539343
Artifact: https://github.com/thafarmaaitah/Bouncing-/actions/runs/41817539343/artifacts/13315257947
Artifact ZIP SHA-256: `f1be9cf68977658a423dcb0ba9bbdf7836d7cc5224fdc874c06215963a92f2be`.

- 10/10 progress-rule unit checks passed: empty state, Practice exclusion from timed rewards, idempotency, incomplete-run rejection, checkpoint retry rules, eligible timed completion, unknown-stage rejection, corrupt storage, field sanitization and explicit unsaved handling.
- 8/8 browser scenarios passed: Chromium and WebKit, each at 390x844, 844x390, 1024x650 and 768x1024 touch-enabled viewports. They exercise selected goals, correct result/board badges, reload persistence, local character transfer, replay, mode and goal retention, session cleanup, private-file resource rejection, unchanged large tablet controls, selective deletion and absence of model/profile in storage. Tablet cases additionally test missing stars, game over, checkpoint retry, shield-assisted respawn, fresh and repeated wins, and blocked-storage feedback. No JavaScript or dependency errors were recorded. Observed HTTP requests were same-origin GET requests.
- 4/4 real-time native-keyboard routes passed: both existing stages in Practice and Time Challenge, each finishing with five stars and granting the expected stage badges. The route controller only observes game state; it does not teleport, grant lives, set score, or accelerate time. These four routes are separate automated cases, not a continuous child session.

The eight focused browser scenarios use test-only end-state/position setup inserted into local HTTP module responses, plus normal UI activation. The character fixture is a synthetic triangle GLB, not V4.1. The test APIs are absent from the shipped files. The four complete routes are separate evidence without those state-changing fixtures. Tests ran in Linux software-rendered browsers, not on a physical iPad or iPhone.

Screenshots of the WebKit tablet result panel and phone-sized progress board were inspected. Raw results, exact application payload, executed test adaptations and screenshots are retained in the artifact.

## Publication

The direct connector's main-ref update timed out. Main was reread before recovery; the tested commit was then saved using a guarded non-forced fast-forward without changing application bytes. This documentation commit invokes the existing Pages publishing workflow. Public HTTPS verification is recorded separately; repository presence by itself is not claimed as a live-site test.

## Still open

Physical iPad/iPhone comfort and multi-touch acceptance, actual private V4.1 appearance/performance, long-session behavior, independent security certification and child enjoyment/replay intent. The code checks do not establish these. No new stages, character redesign or final product acceptance is inferred.

## One user check

Open RC6, choose a goal, play a stage and finish with five stars. Read the new result message, then choose the stage hub and inspect its earned badges. Refresh the hub: badges should remain if local storage is available, while the private character must be selected again because its file stays only in session memory.
