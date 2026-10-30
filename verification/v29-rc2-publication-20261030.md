# V29 RC2 — Public review publication and verification

30 October 2026 (Asia/Dubai). Public review only; not final acceptance.

## Published URLs

- Hub: https://thafarmaaitah.github.io/Bouncing-/review/v29/index.html
- Lava Rush: https://thafarmaaitah.github.io/Bouncing-/review/v29/lava-v29-candidate.html
- Storm Circuit: https://thafarmaaitah.github.io/Bouncing-/review/v29/storm-v29-candidate.html

Publication commit: `918ac7b549f41d85f3c76087e94691cf5f4c7c3f`.
Candidate source: `969bf77e75aadc943e9b02d8800e78ad41fda65f`.
Baseline main: `e12e280ead14557881886ad90eaaef9cf2e2de14`.
[Successful Pages deployment](https://github.com/thafarmaaitah/Bouncing-/actions/runs/41062520794).

## Scope and preservation

GitHub comparison of baseline against main confirms one publication commit adding exactly three HTML files under `review/v29/`, with no modified or deleted pre-existing files. V28, Storm V5, the original adventure homepage, root index, existing engine dependencies and Pages workflow are unchanged.

Both stage files reuse the exact RC2 Git blobs. Only the separate review hub's publication notice, archived evidence link and explanation of the private character were updated. No gameplay features, levels, character geometry, materials or loader changes were made.

- Lava blob: `48317552d657b2791ce13ae9f5a10480f47f93b4`.
- Storm blob: `9b6fa19674a085425633062c726e58af372a7cdb`.
- Live Lava SHA-256: `2757996620180826fbfaf261883f3962a06a5e8770994b9f56d1fe55f4bcf110`.
- Live Storm SHA-256: `a6913446606f73729bf3096c12900a87b62c33718580bf36b249f6aefedd35de`.
- Live review-hub SHA-256: `95c97e60e5f5381783a2c7bc43e1e4c4ae2cb68eda69cd4c4891aa3242d6ed9b`.

The published tree contains no GLB, glTF or Blender file. The approved private V4.1 asset was not available to this publication test and was neither used nor uploaded. Its existing local file selector remains unchanged; without a local file the existing test marker is shown, not a replacement girl.

## Live HTTPS verification

An isolated GitHub Actions runner fetched 13 public files with certificate validation enabled. All returned HTTP 200 and matched the checked-out publication commit byte-for-byte: the three review pages, five engine/style/bootstrap dependencies, root index, original adventure homepage, V28 hub, Lava V28 and Storm V5. This checks the actual deployed site, not just repository syntax.

The test workflow is kept only on branch `review/v29-rc2-publication-check-20261030`. It checks out the pinned publication commit and does not deploy or write to main.

## Executed browser checks — keep attempts distinct

Browsers: Chromium 141.0.7390.37 and WebKit 26.0, Playwright 1.56.1, Ubuntu GitHub runner. These are software-rendered desktop test browsers with touch-enabled emulated viewports, not physical phones/iPads.

| Browser / viewport | Lava | Storm | Evidence run |
|---|---|---|---|
| WebKit, 390 x 844 | Passed | Passed | 41063432361 |
| WebKit, 1024 x 768 | Passed | Passed | 41063432361 |
| Chromium, 390 x 844 | Passed | Passed | 41063878573 |
| Chromium, 1024 x 768 | Not passed; unresolved scenario | Not passed; unresolved scenario | 41063878573 |

Six of the eight latest applicable scenario results passed. This is NOT an 8/8 pass and NOT a single complete successful run. The latest Chromium workflow remains failed because of the two tablet-sized scenarios.

Passed flows covered public engine/canvas initialization, Start and advancing timer, touch-control dimensions (at least 44 CSS pixels), no horizontal overflow, Pause/Resume, JUMP handler response, DASH/cooldown, Retry checkpoint button activation and Time Challenge reset/start. There were no JavaScript page errors or failed network requests in these flows. These smoke checks do not establish a full playthrough or comprehensive collision/reward correctness.

Chromium phone cases additionally used native two-touch input: one finger held Forward while a second pressed Pause. Timer and progress stayed frozen; after release and Resume, progress remained stable while the timer advanced. WebKit tested a primary touch, not simultaneous multi-touch.

### Failed checks and test corrections retained

1. [First run 41062840652](https://github.com/thafarmaaitah/Bouncing-/actions/runs/41062840652): 13/13 HTTP checks passed. Eight browser cases stopped at an incorrect test assertion expecting the intermediate `3D engine loaded` message instead of the actual final `3D ready.` message. The readiness assertion alone was corrected; game files did not change.
2. [Second run 41063432361](https://github.com/thafarmaaitah/Bouncing-/actions/runs/41063432361): WebKit 4/4 passed. Four Chromium cases stopped on comparing a stale pre-movement progress HUD value with its post-Resume update (0.3 percentage point difference). Source inspection confirmed the HUD is updated before movement in each fixed simulation step. The test was changed to permit only one stale step plus display rounding, then require stable progress across a further 350 ms while the timer advances. It also pressed Pause after detecting initial movement instead of using the earlier fixed hold. WebKit's passed cases were not repeated.
3. [Chromium follow-up 41063878573](https://github.com/thafarmaaitah/Bouncing-/actions/runs/41063878573): phone 2/2 passed. Tablet-sized Lava and Storm did not pass the post-Resume progress assertion: recorded progress changed from 7.4% and 5.3% respectively to 0%. The saved Lava screenshot shows `Lava fall — back to checkpoint!` and two lives. This is consistent with the test player leaving the starting platform before/around pausing and then completing its fall, but does not by itself prove that interpretation or a stuck-input bug. These two scenarios remain unresolved; they have not been relabeled as passes and the game was not modified to make the test pass.

Phone pause evidence in the follow-up: Lava timer 0.4s and progress 0.9% stayed frozen; after Resume, progress updated once to 1.2% and remained 1.2% while time advanced from 0.5s to 0.9s. Storm likewise remained at 1.2% while time advanced from 0.5s to 0.8s.

Artifacts (raw JSON and screenshots, retained by Actions for 30 days):
- [First check](https://github.com/thafarmaaitah/Bouncing-/actions/runs/41062840652/artifacts/12980966557).
- [Second check / WebKit passes](https://github.com/thafarmaaitah/Bouncing-/actions/runs/41063432361/artifacts/12981641055).
- [Chromium follow-up](https://github.com/thafarmaaitah/Bouncing-/actions/runs/41063878573/artifacts/12982336300).

## Not executed in this publication check

Physical iPhone/iPad Safari; private V4.1 loading/performance; long sessions, heat and real-device app switching; WebKit multi-touch; a new full-route/reward/low-frame-rate regression suite; child playtesting or final product acceptance. Earlier RC2 evidence is archived separately and is not counted as newly executed here.

## تجربة واحدة مختصرة على الهاتف أو iPad

افتح رابط البوابة في Safari أو Chrome، دون تثبيت برامج أو تشغيل خادم.

1. اختر Lava Rush ثم Practice. إن كان ملف V4.1 الأصلي على جهازك، اختره من Choose File؛ وإلا سجّل «الملف غير متاح» واستخدم المؤشر الموجود لفحص التحكم. اضغط Start playing.
2. قرب منتصف منصة البداية، اضغط سهم الحركة بإصبع ثم Pause بالإصبع الثاني فورًا مع إبقاء الأول مضغوطًا. يجب أن يتوقف اللاعب والعداد. ارفع الإصبعين، ثم Resume: يجب ألا تتحرك الشخصية تلقائيًا. كرر مرة ثانية؛ سجّل أي سقوط غير متوقع.
3. جرّب الحركة مع JUMP ثم DASH، والوصول إلى نقطة حفظ، ثم السقوط والعودة إليها وRetry checkpoint. سجّل التقطّع أو الأزرار العالقة.
4. أوقف اللعب قبل تدوير الجهاز، ثم استأنف في الاتجاه الآخر. ارجع عبر Review hub، وافتح Storm Circuit بوضع Time Challenge، وكرّر الحركة والإيقاف بالإصبع الثاني والقفز وDash.

أعد النتيجة بصيغة: الجهاز والمتصفح / بدء المرحلتين / الإيقاف والاستئناف / الحركة والقفز وDash / نقطة الحفظ / ظهور V4.1 أو عدم توفر الملف / أول خلل وخطوته، أو «لا يوجد».

هذه مراجعة واحدة على جهاز محدد، وليست اعتمادًا نهائيًا أو إذنًا بإضافة مزايا. لا حاجة لتغيير V28 للرجوع إليها؛ يكفي إغلاق رابط المراجعة وفتح رابطها السابق.
