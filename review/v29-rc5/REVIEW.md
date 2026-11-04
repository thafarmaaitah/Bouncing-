# Sky Rush Adventure — V29 RC5 local session review

4 November 2026. Public review only, not final child/device/security acceptance.

Application source commit: `8f197e1dc49397ecce334f450fe616af12f3af14`.
Baseline: RC4 `0c43dbee3dcab7fa89d82906288f9bbf21210eb4`.

Entry point: [Open the RC5 session hub](./index.html). Use the hub, rather than a standalone stage URL, for character continuity.

## Delivered

- Existing Lava Rush and Storm Circuit run inside one tab session. Select the original approved V4.1 file locally once; the session retains its File/Blob only in memory and restores it when switching stages. No character asset is included in this public repository.
- Replay and return to stage selection retain the local character. End session or reloading the hub releases it; the app does not save it in browser storage. Best times remain until cleared.
- Parent information explains storage and network limits. Opening it pauses gameplay; closing it does not automatically resume. Delete RC5 best times affects only this version's two record keys and ends the active session.
- Imported GLB files are limited to 20 MiB and validated before parsing. Remote and relative resource references are rejected. The model loader accepts only local blob/data resources; a browser content security policy restricts page resources. Existing model positioning/scaling is retained; no character geometry or material edits were introduced.
- The game remains single-player, without chat, accounts, payments, ads or analytics scripts. This describes application scope, not a claim that the hosting provider collects no access logs.
- Existing courses, modes, physics and enlarged tablet controls are preserved. No new level or random paid reward was added.

## Executed verification

Run: [41814426777](https://github.com/thafarmaaitah/Bouncing-/actions/runs/41814426777).
Evidence: [raw JSON, exact source, test program and screenshots](https://github.com/thafarmaaitah/Bouncing-/actions/runs/41814426777/artifacts/13313668553).

**8/8 browser scenarios passed in the first executed batch**, with zero runtime or dependency errors. Chromium 141.0.7390.37 and WebKit 26.0, Playwright 1.56.1, Linux software rendering. Touch-enabled viewports: 390x844, 844x390, 1024x650 and 768x1024, in both engines. Practice and Challenge are represented.

Each case verified engine startup and unclipped controls; local GLB loading; SHA-256-identical File transfers; retained model geometry across Lava-to-Storm; retained mode; rejection of a wrong-source navigation message; malformed and external-resource-file rejection without an HTTP request and without losing the existing model; replay; stage-chooser continuity; reload and End session cleanup; no model/profile in localStorage or sessionStorage; and selective RC5 record deletion preserving an RC4 sentinel. All observed HTTP requests were same-origin GET requests.

The model in these tests was an intentionally generated triangle fixture, **not the private V4.1 girl**. Terminal state setup was injected into local HTTP module responses for focused transition tests. That test API is absent from the shipped files. These tests are not new full normal-input route completions or a real child's play session.

All **81 baseline files** were checked byte-for-byte and preserved. The application commit adds 10 files under this directory only. This README is a separate documentation addition. No old page, shared engine, original homepage or earlier release was changed.

## Preservation recovery

The first workflow passed all browser and preservation checks, then GitHub rejected the final branch save with `fatal error in commit_refs`. Its failure history remains intact. The exact hashed artifact was recovered through Git data APIs, not rebuilt or retested. Connector attempts to move main also encountered server errors; a guarded REST fast-forward preserved the expected baseline. This documentation commit requests the normal existing Pages publication. Live deployment checks are recorded separately; repository presence alone is not proof of live operation.

## Limits

No real iPad/iPhone was operated. The private V4.1 model was unavailable and its performance, materials and appearance were not retested. No independent penetration test, hosting-log audit, full multiplayer safety assessment or child enjoyment study was performed. Parent information is not an authenticated parental lock. The tab session does not promise secure erasure of browser/OS memory. Closing, reloading or navigating away from the hub can require selecting the model again. Local best times can be lost when browser data is cleared.

## One review action

Open the session hub, select Lava Rush, choose your original V4.1 file on the device and play. After the five-star finish, choose Next: Storm Circuit. The character should be restored without selecting the file again. End session should clear the character from this tab session. Previous RC4 and older links remain separate and unchanged.
