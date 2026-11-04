# Sky Rush Adventure — RC3 focused verification

4 November 2026, Asia/Dubai. Verification only; no application release or final acceptance.

## Frozen source and scope

Application commit: `818825185df212520ec863b50ab43f25aedc5229` (V29 RC3).
Existing harness source: `969bf77e75aadc943e9b02d8800e78ad41fda65f`.
Work is stored on `review/sky-rush-rc3-focused-20261104`, not main.
Main was compared against the application commit after testing: identical, zero changed files and zero additional commits. No V28, RC2, RC3, homepage, engine, model-loader, mode, stage or gameplay changes. No private character file or photo was uploaded.

The new tests use the existing game engine and existing test programs. Read-only state probes are inserted only into local HTTP test responses. They cannot move the player or change gameplay state. Native input is used; no teleportation, bonus lives, forced score, accelerated game time or forced completion.

## Four complete routes: 4 passed, 0 failed

Chromium 141.0.7390.37, Playwright 1.56.1, software-rendered Linux GitHub runner. Desktop keyboard input, live real-time physics, original marker avatar. These are not child or physical touch-device playthroughs.

| Stage | Mode | Finished | Stars | Lives remaining | Checkpoints reached | Falls/respawns | Unexpected pauses | JS errors |
|---|---|---|---|---|---|---|---|---|
| Lava Rush | Practice | Yes | 5/5 | 3 | 3 | 0 | 0 | 0 |
| Storm Circuit | Practice | Yes | 5/5 | 3 | 3 | 0 | 0 | 0 |
| Lava Rush | Time Challenge | Yes | 5/5 | 3 | 3 | 0 | 0 | 0 |
| Storm Circuit | Time Challenge | Yes | 5/5 | 3 | 3 | 0 | 0 | 0 |

Practice completion and Time Challenge GOLD/new-best messages were observed in their correct modes. Automated completion times around 10.8 seconds are not estimates of a child's performance. The four successful route cases were not repeated during the touch retest.

## Secondary-finger Pause and Resume

Test matrix: both stages, 1024x768, 768x1024 and 1024x650 touch viewports, two initial attempts each. Native Chromium CDP touch events were logged with trusted primary Forward and nonprimary Pause pointer events. The first direction finger remains physically held while Pause clears game input. Actual x/y/z position and game time are observed, not the lagging progress-bar percentage.

Initial executed matrix: **10 PASS, 2 FAIL due to invalid grounded-start preconditions, 0 not run**. The workflow remains marked failed; its history has not been rewritten.

The two invalid cases were Lava at 1024x768 and 768x1024. Logs show the player had already stepped off the initial platform by Pause (z=1.8083 and z=1.4333 respectively; onGround=false). Pause itself had set running=false and cleared all held game inputs. These are not valid measurements of stationary grounded Resume and are not counted as gameplay passes.

Only those two cases were rerun. The test driver removed one remote snapshot between the first and second native touches; the existing event log proves Forward was held instead. The application, real-time clock, grounded-position requirement, movement assertions and browser remained unchanged. **Retest: 2 PASS, 0 FAIL, 0 not run.** The ten previously passing cases were not repeated.

Retest measurements:

| Lava viewport | z during Pause | z after Resume observation | Lives | Input after Resume | Timer after Resume |
|---|---|---|---|---|---|
| 1024x768 | 2.1333333333 | 2.1333333333 | 3 | Empty | Advanced from 0.3000s to 0.6000s |
| 768x1024 | 2.4583333333 | 2.4583333333 | 3 | Empty | Advanced from 0.2000s to 0.5167s |

All valid measurements froze the player and timer during Pause and resumed time without unwanted planar motion or a lost life. The final evidence covers the 12 intended matrix slots across the initial run and targeted retests. This is **not a single 12/12 clean first run**. It does not retroactively turn the earlier RC2 tablet failures into passes or prove their exact cause.

## Attempts and evidence

- Preparation attempt [41782381378](https://github.com/thafarmaaitah/Bouncing-/actions/runs/41782381378) stopped before browser tests because the harness adapter matched both Start and Resume. No game test results were produced. The adapter was corrected to target only the initial Start block.
- Main executed batch [41782500148](https://github.com/thafarmaaitah/Bouncing-/actions/runs/41782500148): 10 valid touch passes, 2 invalid-precondition failures, 4/4 route passes. [Raw JSON, executed harnesses/diffs and screenshots](https://github.com/thafarmaaitah/Bouncing-/actions/runs/41782500148/artifacts/13299477954).
- Two-case retest [41782945285](https://github.com/thafarmaaitah/Bouncing-/actions/runs/41782945285): 2/2 passed. [Raw retest evidence](https://github.com/thafarmaaitah/Bouncing-/actions/runs/41782945285/artifacts/13299982090).

Artifact ZIP SHA-256: main batch `f43c5472f76795e2289344fab092aa0d3959a095f71c2c1f4ae89f06ddafbd58`; retest `7e93fe37418cd9de986f0f3ddfe52a46dadd6251e309876c997ad68df5e8f17e`.
Source-integrity checks passed in both executed batches. Lava source SHA-256 remains `1164a92846c9d98119a96bc148ec373824a2e866808f45a6d6fcd3a6f0163674`; Storm remains `c6586f6bf80cd1bd506d8d8e42eff0b9c12d047eea6bb0c9f635eeb2389c31b0`.

## Still not established

Physical iPad Safari multi-touch, comfort and real device performance; approved private V4.1 model performance/appearance in these new tests; WebKit multi-touch; child enjoyment and replay intent; a comprehensive new collision/reward/long-session suite. These tests are local runtime tests of the frozen published source, not a repeated browser test against public HTTPS. No final acceptance, feature approval or new-level permission is inferred.

## Next decision

Keep RC3 as the review build; the measured cases do not justify changing gameplay. Combine the next physical-device and supervised age-10 observations into one session, recording control comfort, two-finger Pause/Resume, ability to understand and progress, V4.1 availability and replay intent. Fix only an evidenced problem in a separate version. Do not add stages or change the character.

Existing review hub: https://thafarmaaitah.github.io/Bouncing-/review/v29-rc3/index.html
