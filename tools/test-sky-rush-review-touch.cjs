#!/usr/bin/env node
'use strict';
/**
 * Current V28/V5 versus isolated V29 review-candidate input regression.
 *
 * node tools/test-sky-rush-review-touch.cjs --browser chromium --output /tmp/sky-touch
 * --browser chromium|webkit|both  --target baseline|candidate|both
 * --stage lava|storm|both         --case <name substring>  --executable <browser path>
 *
 * The server adds a read-only probe only to ?skyTouchTest=1 responses. It does
 * not rewrite imports, move the player, call gameplay actions, or change files.
 * A real-time native multi-touch Pause reproducer is separate from input cases
 * whose Playwright clock is installed and paused AFTER actual engine startup.
 * Chromium multi-touch uses CDP Input.dispatchTouchEvent (trusted browser events).
 * Legacy-path cases mask window.PointerEvent before application initialization;
 * they exercise native touchstart/cancel, not a historical physical browser.
 * WebKit has no equivalent multi-touch driver here: those cases are NOT_EXECUTED.
 * Its short mouse/keyboard/primary-tap checks run in real time, without a clock
 * handoff; the controlled-time multi-touch cases are Chromium-only.
 * PASS for a baseline-defect reproduction means the expected defect was seen;
 * observedGameBehavior and baselineDefectReproduced explicitly record that failure.
 * No physical phone/iPad, OS backgrounding, or child playtest is claimed.
 */

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const { createServer } = require('node:http');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const key = process.argv[i];
  if (!key.startsWith('--')) throw Error(`Unexpected argument: ${key}`);
  if (key === '--list') args.list = true;
  else {
    const value = process.argv[++i];
    if (!value || value.startsWith('--')) throw Error(`Missing value for ${key}`);
    args[key.slice(2)] = value;
  }
}
const root = path.resolve(__dirname, '..');
const output = path.resolve(args.output || '/tmp/sky-rush-review-touch');
const stages = [
  { id: 'lava', baseline: 'sky-rush-lava-obby-v28-stable.html', candidate: 'review/v29/lava-v29-candidate.html' },
  { id: 'storm', baseline: 'sky-rush-storm-circuit-v5-stable.html', candidate: 'review/v29/storm-v29-candidate.html' },
].filter(s => !args.stage || args.stage === 'both' || args.stage === s.id);
const engines = !args.browser || args.browser === 'both' ? ['chromium', 'webkit'] : [args.browser];
const targets = !args.target || args.target === 'both' ? ['baseline', 'candidate'] : [args.target];
assert(stages.length, 'Unknown --stage');
assert(engines.every(e => ['chromium', 'webkit'].includes(e)), 'Unknown --browser');
assert(targets.every(t => ['baseline', 'candidate'].includes(t)), 'Unknown --target');

const probe = `
window.__skyTouchProbe = Object.freeze({snapshot() {
  return {running,hasStarted,runTime,simTime,won,lives,onGround,vy,jumpBuffer,
    keys:[...keys],keyboardDirs:[...keyboardDirs],pointerDirs:[...pointerDirs],
    position:{x:player.position.x,y:player.position.y,z:player.position.z},
    dashUntil,dashReadyAt,message:msg.textContent,hidden:document.hidden,
    renderedFrames:renderer.info.render.frame,overlayVisible:!readyOverlay.hidden};
}});
`;

const cases = [
  { name: 'real-time-secondary-pause', touch: true, realtime: true, pause: true, fn: secondaryPause },
  { name: 'controlled-secondary-pause-resume', touch: true, pause: true, fn: secondaryPause },
  { name: 'forward-plus-secondary-jump', touch: true, fn: jumpWhileHeld },
  { name: 'forward-plus-secondary-dash', touch: true, fn: dashWhileHeld },
  { name: 'keyboard-touch-independent-release', touch: true, fn: keyboardAndTouch },
  { name: 'same-direction-two-finger-release', touch: true, fn: sameDirection },
  { name: 'native-touchcancel-clears', touch: true, fn: cancelClears },
  { name: 'active-lostpointercapture-clears', touch: true, fn: lostCapture },
  { name: 'forced-legacy-touchstart-secondary-pause', touch: true, legacy: true, pause: true, fn: secondaryPause },
  { name: 'forced-legacy-touchcancel-clears', touch: true, legacy: true, fn: cancelClears },
  { name: 'ordinary-mouse-keyboard-primary-tap-pause', fn: ordinaryPause },
].filter(c => !args.case || c.name.includes(args.case));
assert(cases.length, 'No cases match --case');

if (args.list) {
  console.log(JSON.stringify({ engines, targets, stages, cases: cases.map(({ fn, ...rest }) => rest) }, null, 2));
  process.exit(0);
}

const modulePaths = [process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, root].filter(Boolean);
const playwright = require(require.resolve('playwright', { paths: modulePaths }));
const result = {
  startedAt: new Date().toISOString(),
  methodology: {
    source: 'Local HTTP serving of unchanged repository files; read-only module-scope snapshot probe inserted at the existing test hook.',
    realTime: 'Fresh native Chromium multi-touch held-Forward plus secondary Pause sequence; real animation frames and wall time, without Playwright clock.',
    controlledClock: 'Actual engine imports, canvas creation, and at least one real render complete first. Playwright clock is then installed and paused while the game is still at Ready. Native input handlers run normally; only explicit runFor advances game frames.',
    touch: 'Chromium CDP Input.dispatchTouchEvent with native trusted pointer/touch events; records isPrimary, pointerId, capture events, and action-state snapshots.',
    legacy: 'Forced fallback: window.PointerEvent is undefined before application startup, then the same native Chromium touch driver exercises touchstart/touchend/touchcancel.',
    webkit: 'Ordinary mouse, keyboard Escape/Enter, and primary touchscreen-tap checks use real wall time, without Playwright clock. Unsupported multi-touch cases are explicitly skipped.',
    captureLoss: 'Native touch first gains capture; releasePointerCapture is called explicitly, followed by native touchMove to deliver lostpointercapture. This is a scripted capture-loss scenario.',
    baselineStatus: 'PASS means the stated assertion succeeded. For baseline Pause cases, baselineDefectReproduced=true and observedGameBehavior=FAIL_SECONDARY_PAUSE report the existing game defect.',
  },
  notExecuted: [
    'WebKit multi-touch sequences: this harness has no supported multi-touch driver for WebKit.',
    'Physical phone/iPad touch, performance, orientation, and hardware rendering.',
    'Actual OS background/foreground and device rotation transitions.',
    'Children age 10 playtesting, fun assessment, and approved V4.1 visual verification.',
    'This focused input suite does not certify FPS-independent physics or complete route completion.',
  ],
  engines: {}, tests: [], screenshots: [],
};

function sha256(data) { return createHash('sha256').update(data).digest('hex'); }
async function sourceHashes() {
  const files = [...new Set([
    ...stages.flatMap(s => targets.map(t => s[t])),
    'assets/sky-rush-v28.css', 'assets/sky-rush-boot-v28.js',
    'assets/vendor/three-0.160.1/three.module.min.js',
    'assets/vendor/three-0.160.1/GLTFLoader.js',
    'tools/test-sky-rush-review-touch.cjs',
  ])];
  return Object.fromEntries(await Promise.all(files.map(async file => [file, sha256(await fs.readFile(path.join(root, file)))])));
}
function gitInfo() {
  try {
    return {
      head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
      branch: execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim(),
    };
  } catch (e) { return { error: e.message }; }
}
async function saveResults() {
  result.summary = {
    PASS: result.tests.filter(t => t.status === 'PASS').length,
    FAIL: result.tests.filter(t => t.status === 'FAIL').length,
    NOT_EXECUTED: result.tests.filter(t => t.status === 'NOT_EXECUTED').length,
    baselineDefectReproductions: result.tests.filter(t => t.detail?.baselineDefectReproduced).length,
    candidatePasses: result.tests.filter(t => t.target === 'candidate' && t.status === 'PASS').length,
  };
  await fs.writeFile(path.join(output, 'touch-results.json'), JSON.stringify(result, null, 2) + '\n');
}

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.glb': 'model/gltf-binary' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    let data = await fs.readFile(file);
    if (url.searchParams.has('skyTouchTest') && stages.some(s => targets.some(t => file === path.join(root, s[t])))) {
      const html = data.toString('utf8');
      const hook = '/* sky-rush-test-hook */';
      assert.equal(html.split(hook).length, 2, `Expected one read-only probe hook in ${file}`);
      data = Buffer.from(html.replace(hook, probe));
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch (e) {
    res.writeHead(e.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain' });
    res.end(e.message);
  }
});

async function snapshot(page) { return page.evaluate(() => window.__skyTouchProbe.snapshot()); }
async function point(page, selector, offset = 0) {
  return page.locator(selector).evaluate((el, dx) => {
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height) throw Error('Control has no bounds');
    return { x: b.x + b.width / 2 + dx, y: b.y + b.height / 2 };
  }, offset);
}
async function tap(page, selector) {
  const p = await point(page, selector);
  await page.touchscreen.tap(p.x, p.y);
}
function emptyInput(s) {
  assert.deepEqual(s.keys, [], 'No game direction should remain held');
  assert.deepEqual(s.keyboardDirs, [], 'No keyboard direction should remain held');
  assert.deepEqual(s.pointerDirs, [], 'No pointer direction should remain held');
}
function still(before, after, label) {
  for (const axis of ['x', 'y', 'z']) assert(Math.abs(after.position[axis] - before.position[axis]) < 1e-8, `${label}: ${axis} moved`);
  assert(Math.abs(after.runTime - before.runTime) < 1e-8, `${label}: timer advanced`);
}
function noAutomaticPlanarMovement(before, after) {
  for (const axis of ['x', 'z']) assert(Math.abs(after.position[axis] - before.position[axis]) < 1e-8, `Unexpected movement after Resume: ${axis}`);
  emptyInput(after);
}
async function events(page) { return page.evaluate(() => window.__skyInputEvents); }
function eventSummary(trace) {
  const counts = {};
  for (const e of trace) {
    const key = `${e.type}:${e.target}:${e.isPrimary === undefined ? '-' : e.isPrimary}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  return { counts, primaryForwardDowns: trace.filter(e => e.type === 'pointerdown' && e.target === 'forward' && e.isPrimary).length,
    secondaryPauseDowns: trace.filter(e => e.type === 'pointerdown' && e.target === 'pause' && e.isPrimary === false).length,
    pauseClicks: trace.filter(e => e.type === 'click' && e.target === 'pause').length };
}

class NativeTouch {
  constructor(cdp) { this.cdp = cdp; this.active = new Map(); }
  async dispatch(type, points = [...this.active]) {
    await this.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([id, p]) => ({ id, ...p, radiusX: 4, radiusY: 4, force: 1 })) });
  }
  async add(id, p) { assert(!this.active.has(id)); this.active.set(id, p); await this.dispatch('touchStart'); }
  async move(id, p) { assert(this.active.has(id)); this.active.set(id, p); await this.dispatch('touchMove'); }
  async remove(id) {
    assert(this.active.has(id));
    const ended = this.active.get(id);
    this.active.delete(id);
    // Chromium ends the listed contact. Supplying the *remaining* contact
    // instead would release the wrong finger; event assertions below verify it.
    await this.dispatch('touchEnd', [[id, ended]]);
  }
  async endAll() { if (this.active.size) { this.active.clear(); await this.dispatch('touchEnd'); } }
  async cancel() { this.active.clear(); await this.dispatch('touchCancel'); }
}

async function secondaryPause(t) {
  const { page, touch, target, def } = t;
  const forward = await point(page, '[data-dir="forward"]');
  const pause = await point(page, '#pause');
  await touch.add(1, forward);
  const held = await snapshot(page);
  assert(held.running && held.keys.includes('forward'), 'Forward must be held before second finger');
  await touch.add(2, pause);
  await touch.remove(2);
  const afterSecondary = await snapshot(page);
  const traceAtPause = await events(page);
  const summary = eventSummary(traceAtPause);
  assert.equal(summary.primaryForwardDowns, 1, 'Expected one native primary Forward pointerdown');
  assert.equal(summary.secondaryPauseDowns, 1, 'Expected one native nonprimary Pause pointerdown');
  assert(traceAtPause.some(e => e.type === 'pointerup' && e.target === 'pause' && e.isPrimary === false), 'The released finger must be secondary Pause');
  assert(!traceAtPause.some(e => e.type === 'pointerup' && e.target === 'forward'), 'Primary Forward must remain physically held through the assertion');
  assert(traceAtPause.filter(e => e.type === 'pointerdown').every(e => e.isTrusted), 'Pointer events must be native/trusted');
  assert(afterSecondary.vy <= 0.001 && afterSecondary.position.y <= 0.001, 'Pause must not invoke Jump');
  assert(!/Jump!/.test(afterSecondary.message), 'Pause must not change message to Jump');
  if (def.legacy) assert(traceAtPause.some(e => e.type === 'touchstart' && e.target === 'pause' && e.isTrusted), 'Legacy path needs native touchstart on Pause');
  const detail = { held, afterSecondary, traceAtPause, eventSummary: summary, clock: t.clockMode, legacyFallbackForced: !!def.legacy };
  if (target === 'baseline') {
    assert(afterSecondary.running, 'Baseline defect not reproduced: Pause actually stopped the game');
    assert(afterSecondary.keys.includes('forward'), 'Baseline Forward stopped before the Pause assertion; reproduction is inconclusive');
    assert.equal(summary.pauseClicks, 0, 'Expected no compatibility click from nonprimary touch');
    detail.baselineDefectReproduced = true;
    detail.observedGameBehavior = 'FAIL_SECONDARY_PAUSE';
  } else {
    assert.equal(afterSecondary.running, false, 'Secondary Pause must stop the game');
    assert.equal(afterSecondary.overlayVisible, true, 'Resume overlay should be visible');
    emptyInput(afterSecondary);
    await t.advance(120);
    const heldPaused = await snapshot(page);
    still(afterSecondary, heldPaused, 'Paused while first finger remains down');
    detail.heldPaused = heldPaused;
    detail.observedGameBehavior = 'PASS_SECONDARY_PAUSE';
  }
  await touch.endAll();
  if (def.realtime) {
    const filename = `${t.engine}-${target}-${t.stage.id}-secondary-pause.png`;
    await page.screenshot({ path: path.join(output, filename), fullPage: true });
    result.screenshots.push(filename);
    detail.screenshot = filename;
  }
  if (target === 'candidate') {
    const released = await snapshot(page);
    emptyInput(released);
    await tap(page, '#startRun');
    const resumed = await snapshot(page);
    assert(resumed.running, 'Primary tap should Resume');
    emptyInput(resumed);
    await t.advance(100);
    const afterResume = await snapshot(page);
    noAutomaticPlanarMovement(resumed, afterResume);
    detail.resumed = resumed;
    detail.afterResume = afterResume;
  } else emptyInput(await snapshot(page));
  return detail;
}

async function jumpWhileHeld(t) {
  const forward = await point(t.page, '[data-dir="forward"]');
  await t.touch.add(1, forward);
  await t.touch.add(2, await point(t.page, '#jump'));
  await t.touch.remove(2);
  const action = await snapshot(t.page);
  assert(action.keys.includes('forward') && action.pointerDirs.length === 1, 'Jump release must preserve Forward');
  assert(action.vy > 0 && /Jump!/.test(action.message), 'Secondary Jump must invoke a jump');
  await t.advance(50);
  const moved = await snapshot(t.page);
  assert(moved.position.z < action.position.z && moved.position.y > action.position.y, 'Jump and Forward must both advance');
  await t.touch.endAll();
  emptyInput(await snapshot(t.page));
  return { action, moved };
}
async function dashWhileHeld(t) {
  await t.touch.add(1, await point(t.page, '[data-dir="forward"]'));
  await t.touch.add(2, await point(t.page, '#dash'));
  await t.touch.remove(2);
  const action = await snapshot(t.page);
  assert(action.keys.includes('forward') && action.pointerDirs.length === 1, 'Dash release must preserve Forward');
  assert(action.dashUntil > action.runTime && action.dashReadyAt > action.runTime + 3, 'Secondary Dash must start burst and cooldown');
  await t.advance(50);
  const moved = await snapshot(t.page);
  assert(moved.position.z < action.position.z, 'Dash must move the player');
  await t.touch.endAll();
  emptyInput(await snapshot(t.page));
  return { action, moved };
}
async function keyboardAndTouch(t) {
  const forward = await point(t.page, '[data-dir="forward"]');
  await t.page.keyboard.down('KeyW');
  await t.touch.add(1, forward);
  await t.page.keyboard.up('KeyW');
  const keyboardReleased = await snapshot(t.page);
  assert(keyboardReleased.keys.includes('forward') && keyboardReleased.pointerDirs.length === 1, 'Touch must survive keyboard release');
  assert.equal(keyboardReleased.keyboardDirs.length, 0);
  await t.touch.endAll();
  emptyInput(await snapshot(t.page));
  await t.touch.add(1, forward);
  await t.page.keyboard.down('KeyW');
  await t.touch.endAll();
  const touchReleased = await snapshot(t.page);
  assert(touchReleased.keys.includes('forward') && touchReleased.keyboardDirs.includes('forward'), 'Keyboard must survive touch release');
  assert.equal(touchReleased.pointerDirs.length, 0);
  await t.page.keyboard.up('KeyW');
  emptyInput(await snapshot(t.page));
  return { keyboardReleased, touchReleased };
}
async function sameDirection(t) {
  const outcomes = [];
  for (const firstReleased of [1, 2]) {
    await t.touch.add(1, await point(t.page, '[data-dir="forward"]', -8));
    await t.touch.add(2, await point(t.page, '[data-dir="forward"]', 8));
    const both = await snapshot(t.page);
    assert.equal(both.pointerDirs.length, 2, 'Both fingers should own Forward');
    await t.touch.remove(firstReleased);
    const one = await snapshot(t.page);
    assert(one.keys.includes('forward') && one.pointerDirs.length === 1, 'Releasing one finger must preserve the other');
    await t.touch.endAll();
    emptyInput(await snapshot(t.page));
    outcomes.push({ firstReleased, both, one });
  }
  return { outcomes };
}
async function cancelClears(t) {
  await t.touch.add(1, await point(t.page, '[data-dir="forward"]'));
  await t.touch.add(2, await point(t.page, '[data-dir="right"]'));
  const held = await snapshot(t.page);
  assert(held.keys.includes('forward') && held.keys.includes('right'));
  await t.touch.cancel();
  const cancelled = await snapshot(t.page);
  emptyInput(cancelled);
  const trace = await events(t.page);
  const type = t.def.legacy ? 'touchcancel' : 'pointercancel';
  assert(trace.some(e => e.type === type && e.isTrusted), `Expected native ${type}`);
  return { held, cancelled, legacyFallbackForced: !!t.def.legacy };
}
async function lostCapture(t) {
  const p = await point(t.page, '[data-dir="forward"]');
  await t.touch.add(1, p);
  await t.touch.move(1, { x: p.x + 1, y: p.y });
  const held = await snapshot(t.page);
  assert.equal(held.pointerDirs.length, 1);
  const id = held.pointerDirs[0][0];
  assert((await events(t.page)).some(e => e.type === 'gotpointercapture' && e.pointerId === id), 'Capture must have become active, not merely pending');
  await t.page.locator('[data-dir="forward"]').evaluate((el, pointerId) => {
    if (!el.hasPointerCapture(pointerId)) throw Error('Expected active capture');
    el.releasePointerCapture(pointerId);
  }, id);
  await t.touch.move(1, { x: p.x + 2, y: p.y });
  const lost = await snapshot(t.page);
  emptyInput(lost);
  assert((await events(t.page)).some(e => e.type === 'lostpointercapture' && e.pointerId === id && e.isTrusted), 'Native lostpointercapture should be delivered');
  await t.touch.endAll();
  emptyInput(await snapshot(t.page));
  return { held, lost, captureLossMethod: 'releasePointerCapture after actual gotpointercapture, followed by native touchMove' };
}
async function ordinaryPause(t) {
  const { page } = t;
  const checks = [];
  async function confirmPaused(method) {
    const paused = await snapshot(page);
    assert.equal(paused.running, false, `${method} should pause`);
    emptyInput(paused);
    await t.advance(80);
    still(paused, await snapshot(page), method);
    checks.push({ method, paused });
  }
  async function resume() {
    await tap(page, '#startRun');
    const resumed = await snapshot(page);
    assert(resumed.running);
    await t.advance(80);
    noAutomaticPlanarMovement(resumed, await snapshot(page));
  }
  const p = await point(page, '#pause');
  await page.mouse.click(p.x, p.y);
  await confirmPaused('native mouse click');
  await resume();
  await page.keyboard.down('KeyW');
  await page.keyboard.press('Escape');
  await page.keyboard.up('KeyW');
  await confirmPaused('Escape while Forward is held, then release');
  await resume();
  await page.focus('#pause');
  await page.keyboard.press('Enter');
  await confirmPaused('Enter on focused Pause button');
  await resume();
  await tap(page, '#pause');
  await confirmPaused('primary touchscreen tap');
  return { checks, keyboardScope: 'Escape and native Enter activation; Space/alias behavior is outside this two-defect repair.' };
}

async function runCase(browser, engine, target, stage, def, base) {
  const record = { engine, target, stage: stage.id, file: stage[target], name: def.name,
    expectation: def.pause && target === 'baseline' ? 'Reproduce current baseline secondary-Pause failure' : 'Input behavior works and releases correctly',
    clock: def.realtime ? 'REAL_TIME' : 'CONTROLLED_AFTER_REAL_BOOT', legacyFallbackForced: !!def.legacy };
  if (def.touch && engine !== 'chromium') {
    result.tests.push({ ...record, status: 'NOT_EXECUTED', reason: 'Native multi-touch driver is CDP-only; WebKit has no equivalent supported by this harness.' });
    return;
  }
  const begin = Date.now();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  let page, touch;
  const pageErrors = [], failedRequests = [], httpErrors = [];
  try {
    await context.addInitScript(({ legacy }) => {
      if (legacy) Object.defineProperty(window, 'PointerEvent', { configurable: true, value: undefined });
      window.__skyInputEvents = [];
      const entries = new WeakMap();
      const names = ['pointerdown', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture', 'touchstart', 'touchend', 'touchcancel', 'click', 'keydown', 'keyup'];
      for (const type of names) window.addEventListener(type, e => {
        const button = e.target.closest?.('button');
        const entry = { n: window.__skyInputEvents.length, type, time: performance.now(),
          target: button?.dataset.dir || button?.id || e.target.id || e.target.tagName,
          isTrusted: e.isTrusted, pointerId: e.pointerId, pointerType: e.pointerType,
          isPrimary: e.isPrimary, key: e.code, detail: e.detail,
          touches: e.touches ? [...e.touches].map(t => t.identifier) : undefined,
          changedTouches: e.changedTouches ? [...e.changedTouches].map(t => t.identifier) : undefined };
        window.__skyInputEvents.push(entry);
        entries.set(e, entry);
      }, true);
      // Window bubble runs after the game's target handlers. A microtask from
      // a capture listener can run before target handlers in native dispatch.
      for (const type of names) window.addEventListener(type, e => {
        const entry = entries.get(e);
        if (!entry) return;
        entry.defaultPrevented = e.defaultPrevented;
        const s = window.__skyTouchProbe?.snapshot();
        if (s) entry.afterState = { running: s.running, keys: s.keys, pointerDirs: s.pointerDirs,
          runTime: s.runTime, vy: s.vy, message: s.message };
      });
    }, { legacy: !!def.legacy });
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', e => pageErrors.push(e.message));
    page.on('requestfailed', r => failedRequests.push({ url: r.url(), error: r.failure()?.errorText }));
    page.on('response', r => { if (r.status() >= 400) httpErrors.push({ url: r.url(), status: r.status() }); });
    await page.goto(`${base}/${stage[target]}?skyTouchTest=1`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__skyTouchProbe && !document.getElementById('startRun').disabled && window.__skyTouchProbe.snapshot().renderedFrames > 0);
    record.boot = await snapshot(page);
    assert.equal(record.boot.running, false, 'Boot should wait for explicit Start');
    assert.equal(pageErrors.length, 0, pageErrors.join('\n'));
    assert.deepEqual(httpErrors, [], 'Actual source dependencies must load successfully');
    if (!def.realtime) {
      const anchor = new Date('2026-10-29T00:00:00Z');
      await page.clock.install({ time: anchor });
      // Let any native rAF scheduled before clock installation enter the new
      // scheduler while still at Ready; no held input or gameplay is running.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.clock.pauseAt(new Date(anchor.getTime() + 3600000));
    }
    if (def.touch) touch = new NativeTouch(await context.newCDPSession(page));
    await tap(page, '#startRun');
    assert((await snapshot(page)).running, 'Native primary Start tap should run');
    const advance = ms => def.realtime ? new Promise(resolve => setTimeout(resolve, ms)) : page.clock.runFor(ms);
    if (!def.realtime) {
      await advance(50);
      assert((await snapshot(page)).runTime > 0, 'Controlled clock must actually advance the running game');
    }
    await page.evaluate(() => { window.__skyInputEvents.length = 0; });
    record.detail = await def.fn({ page, touch, target, stage, def, engine, advance, clockMode: record.clock });
    record.events = await events(page);
    record.eventSummary = eventSummary(record.events);
    record.final = await snapshot(page);
    assert.deepEqual(pageErrors, [], 'No unexpected JavaScript runtime errors');
    assert.deepEqual(failedRequests, [], 'No failed dependency requests');
    assert.deepEqual(httpErrors, [], 'No HTTP dependency errors');
    record.status = 'PASS';
    console.log(`${record.detail?.baselineDefectReproduced ? 'BASELINE_DEFECT_REPRODUCED' : 'PASS'} ${engine} ${target} ${stage.id} ${def.name}`);
  } catch (e) {
    record.status = 'FAIL';
    record.error = e.stack || String(e);
    if (page) {
      try { record.events = await events(page); record.eventSummary = eventSummary(record.events); record.final = await snapshot(page); } catch (_) { /* Keep primary failure. */ }
    }
    console.log(`FAIL ${engine} ${target} ${stage.id} ${def.name}: ${e.message}`);
  } finally {
    record.milliseconds = Date.now() - begin;
    record.pageErrors = pageErrors; record.failedRequests = failedRequests; record.httpErrors = httpErrors;
    result.tests.push(record);
    await context.close();
    await saveResults();
  }
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  result.git = gitInfo();
  result.sourceHashesBefore = await sourceHashes();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const engine of engines) {
      const browserType = playwright[engine];
      const launch = { headless: true, executablePath: args.executable || browserType.executablePath() };
      if (engine === 'chromium') launch.args = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
      let browser;
      try {
        browser = await browserType.launch(launch);
        result.engines[engine] = { version: browser.version(), executablePath: launch.executablePath };
        for (const stage of stages) for (const target of targets) for (const def of cases) {
          const effective = engine === 'webkit' && !def.touch ? { ...def, realtime: true } : def;
          await runCase(browser, engine, target, stage, effective, base);
        }
      } catch (e) {
        result.tests.push({ engine, status: 'FAIL', name: 'browser-launch-or-suite-setup', error: e.stack || String(e) });
      } finally { if (browser) await browser.close(); }
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
    result.sourceHashesAfter = await sourceHashes();
    result.sourceFilesUnchanged = JSON.stringify(result.sourceHashesBefore) === JSON.stringify(result.sourceHashesAfter);
    if (!result.sourceFilesUnchanged) result.tests.push({ name: 'source-freeze', status: 'FAIL', error: 'One or more source/harness files changed during execution.' });
    result.finishedAt = new Date().toISOString();
    result.allBrowsersClosed = true;
    await saveResults();
    console.log(JSON.stringify({ output: path.join(output, 'touch-results.json'), ...result.summary, sourceFilesUnchanged: result.sourceFilesUnchanged }));
  }
  if (result.summary.FAIL) process.exitCode = 1;
})().catch(async e => {
  console.error(e.stack || String(e));
  result.fatalError = e.stack || String(e);
  try { await saveResults(); } catch (_) { /* Preserve original error. */ }
  server.close();
  process.exitCode = 1;
});
