# Sky Rush Adventure — V28 stability repair

Date: 28 October 2026 (Asia/Dubai).

Status: **Runtime-tested development build. Physical phone/iPad acceptance and age-10 playtesting remain open.**

## New, separate versions

- [Adventure hub V28](https://thafarmaaitah.github.io/Bouncing-/sky-rush-adventure-v28.html)
- [Lava Rush V28](https://thafarmaaitah.github.io/Bouncing-/sky-rush-lava-obby-v28-stable.html)
- [Storm Circuit V5](https://thafarmaaitah.github.io/Bouncing-/sky-rush-storm-circuit-v5-stable.html)

These are derived repairs of Lava V27 and Storm V4. They retain the existing two
routes, stars, checkpoints, secret islands, power-ups, Practice and Time Challenge.
No new stages were added. All **49 pre-existing tracked files** were compared
byte-for-byte with baseline commit `dad10fd49edb784eaa168f3f3d99a03484078a3e` and
remain unchanged, including the original adventure hub and all older versions.

## Why V27 did not start

Both current stage modules contained this consecutive declaration:

```js
const dashTrail=[];const dashTrail=[];
```

The browser rejects the module with
`SyntaxError: Identifier 'dashTrail' has already been declared` before scene
creation or control bindings run. The published V27 page was opened in a live
Chrome browser: the error was observed, there was no game canvas, and clicking
JUMP had no effect. The unmodified source was also executed in the regression
suite to reproduce the same failure.

Earlier history had the opposite ordering error: the trail array was populated
before its declaration. The current repair keeps exactly one declaration,
before the first use, in each new file.

Storm V4 also dereferenced a missing `#modeHelp` element when its mode changed,
and read a Storm best-time key while writing the Lava key.

## Repairs

1. Correct initialization in both stage modules and restore Storm's mode help.
2. Ship the existing **Three.js 0.160.1**, GLTFLoader and its utility dependency
   with the project. New builds use explicit relative imports; they do not need
   the external CDN or import-map support. The upstream MIT license is included.
3. Add independent startup/error feedback and Reload, plus recovery handling for
   WebGL context loss. The game pauses until the player resumes after recovery.
4. Add Start and Pause/Resume. The timer waits for Start. Backgrounding/blur
   clears held controls and pauses. Simulation time is monotonic across pauses,
   avoiding the earlier clock reset that could break crumbling-platform timing.
5. Track touch pointer IDs separately from keyboard directions. Simultaneous
   direction/jump/Dash input and pointer cancellation are handled. Keyboard
   arrows do not scroll the page during play; form controls keep their own keys.
6. Cancel the active Dash and held input on respawn. Restart restores the initial
   facing direction. Dash keeps its existing short burst and cooldown.
7. Keep flags attached to their moving checkpoint platform. Match secret-island
   borders to its collision surface. Prevent below-platform pickups/hazard hits.
8. Use separate new record keys, `skyRushLavaBestV28` and `skyRushStormBestV5`,
   preserving older-version records. Practice never writes a competitive best.
   A manual checkpoint retry marks that Time Challenge attempt as a retry run;
   it can finish but cannot replace a best time. Restart creates a fresh attempt.
9. Fit portrait/landscape controls to narrow screens, keep visible interactive
   controls at least 44 CSS pixels tall, remove pad-row overlap, and account for
   safe-area insets. Error feedback remains visible in landscape.

## Approved girl V4.1

The exact approved file, `Girl_3D_Repair_V4_1_Normals_CANDIDATE.glb`, was loaded
through the actual local file input during browser testing. Its bytes were not
changed. The V4.1 change-handler block in both new stage files is byte-identical
to its predecessor; no mesh, face, hair, clothing, normals or material edits were
made. The original uniform scene scale/position logic is retained.

The approved GLB stays outside the public repository and is not uploaded by the
game. The marker is hidden when the file successfully loads. Players still
choose the file locally in either stage.

The file contains one static mesh and **no skeleton or animation clips**.
Therefore, this release does not claim transferred rigged limb animations. Its
342,340 triangles make physical-device performance testing particularly relevant;
the mesh has not been simplified under the appearance-lock requirement.

## Executed tests

### Chromium regression suite

**30 passed, 0 failed, 0 not run**, Chromium **151.0.7922.34**.

The suite includes uninstrumented WebGL startup, actual keyboard/button input,
movement, jump, Dash/cooldown, pause/resume, module-download failure with visible
Reload recovery, context loss/restoration, exact V4.1 local loading, and eight
stage/orientation touch cases. Chromium touch tests use multi-touch input with
separate pointer IDs and cancellation, observing the actual movement and jump.

Specific collision/reward tests use explicitly labeled test-assisted positioning
to reach moving/crumbling platforms, checkpoints, shield/speed crates, the secret
gem, and the finish. These tests execute the real game simulation and handlers;
they are not presented as unassisted complete playthroughs. Practice recovery,
the five-star finish requirement, retry-run exclusion, separate competitive
records and persistence across reload were exercised.

The harness instruments only responses served by its local test server when
requested with `?skytest=1`. Deployed files contain only a comment marker, with
no gameplay test API.

### Full route completion using normal inputs

A separate automated controller completed both routes in Practice with actual
Space/arrow-key input. It used read-only position/platform observations to choose
inputs. It did not teleport, change score/lives, grant invulnerability or force
completion.

| Result | Lava Rush V28 | Storm Circuit V5 |
|---|---:|---:|
| Reached finish through the complete route | Yes | Yes |
| Stars | 5/5 | 5/5 |
| Lives remaining | 3 | 3 |
| Checkpoints reached | 3 | 3 |
| Observed falls/recoveries | 0 | 0 |
| JavaScript errors | 0 | 0 |

These were desktop Chromium runs with the existing marker. Their automated
completion times are not estimates of a child's or human player's performance.

### Mobile/iPad layout checks

The new Lava V28 page was rendered, started and visually/structurally checked in
both **Chromium 151.0.7922.34** and **WebKit 26.5** at all five sizes below.

| Emulated viewport | Chromium | WebKit |
|---|---|---|
| 320 × 568 | Passed | Passed |
| 390 × 844 | Passed | Passed |
| 844 × 390 | Passed | Passed |
| 768 × 1024 | Passed | Passed |
| 1024 × 768 | Passed | Passed |

All ten combinations produced a rendered canvas and usable Start action, no
JavaScript page errors or horizontal overflow, visible controls at least 44px
tall, and a 5px gap between pad rows. The gameplay suite additionally tests both
stages at phone 390 × 844 / 844 × 390 and iPad 820 × 1180 / 1180 × 820 sizes.

### WebKit gameplay suite

**30 passed, 0 failed, 0 not run**, WebKit **26.5**. The engine rendered the
actual 3D course. Movement, jump, Dash, pause, platforms, checkpoints, rewards,
mode/record isolation, failure recovery, context recovery and the original V4.1
file loading passed. Mobile WebKit checks used actual touchscreen taps; simultaneous
multi-touch and touch cancellation were exercised in Chromium, not claimed for
WebKit. These results do not substitute for physical iPad Safari testing.

## Evidence and reproduction

- [Browser test harness](../tools/test-sky-rush-v28.mjs)
- [Chromium results](./validation-v28/chromium.json)
- [WebKit results](./validation-v28/webkit.json)
- [Continuous route input results](./validation-v28/continuous-routes.json)
- [Chromium layout measurements](./validation-v28/layout-chromium.json)
- [WebKit layout measurements](./validation-v28/layout-webkit.json)
- [Phone gameplay screenshot](./validation-v28/lava-phone.png)

Install Playwright and its browser binaries in a development environment, then:

```sh
node tools/test-sky-rush-v28.mjs --browser chromium --output /tmp/sky-rush-chromium
node tools/test-sky-rush-v28.mjs --browser webkit --output /tmp/sky-rush-webkit
```

To include the approved private asset, add `--character /absolute/path/to/the/original.glb`.
Without it, that specific test is reported as not run. `--executable` can select
an installed browser binary. The harness can also run uninstrumented deployed
startup checks with `--suite smoke --base-url https://thafarmaaitah.github.io/Bouncing-`.

## Not executed / acceptance still open

- Physical iPhone/Android phone and iPad Safari testing, including browser chrome,
  real safe areas, device heat/memory, long sessions and actual app switching.
- Hardware performance/frame pacing with the unchanged V4.1 mesh. Software-rendered
  test browsers do not certify a real-device frame rate.
- A complete human playthrough with touch controls and the approved girl.
- Supervised playtesting with children aged 10. No child enjoyment, replay-rate,
  independent completion-rate or production reliability claim is made.
- Rigged limb animation transfer; the approved asset has no rig/animation clips.

The next acceptance step is to play both existing routes on physical phones and
iPad in portrait/landscape, then observe age-10 players learning the controls,
recovering from falls and choosing whether to replay. Record blocking faults,
help required, completion and replay intent. **Additional levels remain gated
on stability and that playtest evidence.**
