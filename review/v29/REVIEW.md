# Sky Rush V29 — isolated review candidate (29 Oct 2026)

**Status: CANDIDATE ONLY. NOT RELEASED.** This is a **new reimplementation**, not a recovery of a lost V29 artifact. Repository search found no V29-named commits or branches before this work. V28 source files were found and preserved.

## Provenance and preservation
- V28 Lava: `sky-rush-lava-obby-v28-stable.html`, original blob `777056c1a2a35b8c3edf47e3ea45f70d44a1f0e5`.
- V28 Storm: `sky-rush-storm-circuit-v5-stable.html`, original blob `804b7d1e039314ab092250386b88ea2c8a91aefe`.
- V28 original validation: `docs/sky-rush-v28-validation.md`.
- Candidate branch: `review/sky-rush-v29-input-timing`. No changes to `main`, public adventure hub, approved V4.1 GLB, stage content, Practice or Time Challenge logic.
- Candidate files: `review/v29/lava-v29-candidate.html` and `review/v29/storm-v29-candidate.html`.
- Existing local V4.1 file input and approved model geometry are unchanged. No new stage or feature.

## Change diff — exactly two defects
1. **Second-finger movement stop:** per-direction pointer-ID ownership (`active` Set), release only the matching pointer, keep `pointerDirs` and keyboard-direction reconciliation. Suppress native touchmove/contextmenu on the controls to reduce gesture interception. No jump/Dash game rule changed.
2. **Low-FPS timing and movement:** replace variable/clamped per-render simulation step with a 60 Hz fixed-step accumulator, max 0.25s backlog and 15 catch-up steps. Render once per animation frame; advance simulation clock, movement, jump, hazard cycles, Dash and game timer by identical fixed increments. Reset accumulator on Pause/Resume. Very long stalls >250 ms are deliberately discarded to avoid unsafe catch-up bursts; this is not a real-time multiplayer clock.

## Executed checks (non-browser)
- Both candidate module bodies parse with JavaScript Function constructor after removing static import statements: **PASS (2/2)**.
- Source invariants: per-pointer ownership, touchmove suppression, fixed step, pause accumulator reset, separate rendering: **PASS (2/2)**.
- Deterministic accumulator model, 4 simulated seconds at 15/30/60/120 FPS: **240 updates, 4.00000 simulation seconds, 26.0 distance units at 6.5 units/s in all four cases**.
- Pointer-state model: press direction pointer 1, press/release second pointer 2, direction 1 remains active; releasing pointer 1 clears it: **PASS**.
- **NOT EXECUTED:** real browser integration tests, touch-device two-finger test, low-FPS GPU/browser tests, complete gameplay regression, actual iPad/phone, V4.1 visual verification. Source parsing and simplified deterministic models are not evidence of end-to-end gameplay correctness.

## Review and rollback
- Review the candidate files and this report in the isolated branch, not GitHub Pages. GitHub Pages on `main` has **not** been changed.
- Review diff against V28 originals. To reject, leave `main` untouched and disregard/delete this review branch; no rollback of production is required.
- If approved later, run browser and physical-device acceptance before any public deployment. Do not merge or publish based only on the checks above.

## One consolidated phone/iPad acceptance session (after browser tests)
Open a **private preview of the candidate** (not yet available; requires a review environment), press Start, hold Forward with finger 1, press/release Jump and Dash with finger 2 repeatedly; verify Forward never stops until finger 1 releases. Repeat while frame rate is throttled, then Pause/Resume; compare movement over 10 seconds, game timer, cooldown, crumble timing, checkpoint, Practice/Challenge records and Restart. Record device/browser and any errors. **Blocker:** no private browser preview or physical-device execution is available in this run. No public URL should be used for this candidate before approval.
