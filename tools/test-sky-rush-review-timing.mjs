#!/usr/bin/env node
/**
 * Review-only timing checks against the actual Sky Rush browser modules.
 *
 * node tools/test-sky-rush-review-timing.mjs --browser chromium --out /tmp/sky-review-timing
 * node tools/test-sky-rush-review-timing.mjs --browser webkit --out /tmp/sky-review-timing-webkit
 *
 * Requires Playwright and installed browsers. CODEX_PRIMARY_RUNTIME_NODE_MODULES
 * can supply Playwright. No production file is changed by this runner.
 *
 * Controlled tests deliver exact RAF timestamps to the real game loop. They
 * measure cadence independence, NOT hardware FPS. The separate real-wall probe
 * gates native RAF delivery to approximately 15 Hz without advancing its clock.
 * Keyboard/button input is native browser input. Dash and platform isolation
 * explicitly use test-assisted starting positions; they are not route playtests.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const key = process.argv[i];
  if (!key.startsWith('--') || !process.argv[i + 1] || process.argv[i + 1].startsWith('--')) throw Error(`Expected --name value, got ${key}`);
  args[key.slice(2)] = process.argv[++i];
}
const root = resolve(args.root || join(dirname(fileURLToPath(import.meta.url)), '..'));
const out = resolve(args.out || '/tmp/sky-rush-review-timing');
const engine = args.browser || 'chromium';
const selected = args.case || 'all';
if (!['all', 'matrix', 'gaps', 'wall'].includes(selected)) throw Error(`Unknown --case ${selected}`);
const require = createRequire(import.meta.url);
const { chromium, webkit } = require(require.resolve('playwright', { paths: [process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, root].filter(Boolean) }));
const browserType = { chromium, webkit }[engine];
if (!browserType) throw Error('--browser must be chromium or webkit');
const sources = [
  { stage: 'lava', kind: 'baseline', file: args['lava-baseline'] || 'sky-rush-lava-obby-v28-stable.html' },
  { stage: 'lava', kind: 'candidate', file: args['lava-candidate'] || 'review/v29/lava-v29-candidate.html' },
  { stage: 'storm', kind: 'baseline', file: args['storm-baseline'] || 'sky-rush-storm-circuit-v5-stable.html' },
  { stage: 'storm', kind: 'candidate', file: args['storm-candidate'] || 'review/v29/storm-v29-candidate.html' },
];
await mkdir(out, { recursive: true });
for (const source of sources) source.sha256 = createHash('sha256').update(await readFile(join(root, source.file))).digest('hex');
const result = {
  startedAt: new Date().toISOString(), engine, suite: selected, sources,
  method: {
    controlled: 'Exact delivered RAF timestamps, 15/30/60/120 Hz; real module, real WebGL renderer, no copied physics model. This is not measured device FPS.',
    wall: 'Native browser RAF timestamps paced to at most approximately 15 Hz in real wall time; no accelerated/fabricated clock.',
    observation: 'HTTP response replaces only the existing test-hook comment. Pass-through wrappers count real simulation updates/render calls and observe state.',
    assistance: 'Only isolated Dash/platform tests place the player on an existing platform. No score/lives/invulnerability changes, no replacement collision code, and no skipped rendering.',
    limits: 'Headless desktop browser with software rendering; no physical phone/iPad or child playtest, no character visual certification, no complete route completion.',
  },
  tests: [], screenshots: [],
};

// Only game loop requests are captured. Other native RAF consumers remain live.
function installClock() {
  const nativeRAF = window.requestAnimationFrame.bind(window);
  const nativeCancel = window.cancelAnimationFrame.bind(window);
  const pending = new Map();
  let nextId = -1, timestamp = 0, delivered = 0;
  window.requestAnimationFrame = function (callback) {
    if (callback.name !== 'loop') return nativeRAF(callback);
    const id = nextId--;
    pending.set(id, callback);
    return id;
  };
  window.cancelAnimationFrame = function (id) { if (!pending.delete(id)) nativeCancel(id); };
  function deliver(at) {
    if (pending.size !== 1) throw Error(`Expected one pending game RAF, got ${pending.size}`);
    timestamp = at;
    const callbacks = [...pending.values()];
    pending.clear();
    callbacks.forEach(callback => callback(timestamp));
    delivered++;
  }
  window.__reviewClock = Object.freeze({
    prime(at) { deliver(at); return { timestamp, delivered }; },
    step(ms) { deliver(timestamp + ms); },
    info() { return { timestamp, delivered, pending: pending.size }; },
    async frames(hz, count, until = '') {
      const origin = timestamp;
      const rows = [];
      for (let i = 1; i <= count; i++) {
        deliver(origin + i * 1000 / hz);
        const s = window.__reviewTiming.snapshot();
        rows.push({ elapsed: i / hz, runTime: s.runTime, simTime: s.simTime, y: s.position.y, x: s.position.x, onGround: s.onGround, dashActive: s.dashActive, dashReady: s.dashReady, running: s.running, visible: s.platforms.map(p => p.visible) });
        if ((until === 'land' && s.onGround) || (until === 'dashReady' && s.dashReady) || (until.startsWith('collapse:') && !s.platforms[Number(until.split(':')[1])].visible)) break;
        if (!s.running) break;
        if (i % 8 === 0) await new Promise(resolve => setTimeout(resolve, 0));
      }
      return { rows, final: window.__reviewTiming.snapshot() };
    },
    async wall(milliseconds, hz) {
      deliver(performance.now());
      const begin = window.__reviewTiming.snapshot(), started = timestamp;
      let last = timestamp;
      const stamps = [timestamp];
      await new Promise(resolve => {
        const pump = actualTimestamp => {
          if (actualTimestamp - last >= 1000 / hz - .75) {
            deliver(actualTimestamp);
            last = actualTimestamp;
            stamps.push(actualTimestamp);
          }
          if (actualTimestamp - started >= milliseconds || !window.__reviewTiming.snapshot().running) resolve();
          else nativeRAF(pump);
        };
        nativeRAF(pump);
      });
      const end = window.__reviewTiming.snapshot();
      const intervals = stamps.slice(1).map((t, i) => (t - stamps[i]) / 1000);
      return { begin, end, wallSeconds: (performance.now() - started) / 1000, deliveredSeconds: (last - started) / 1000, stamps, intervals, deliveredFrames: stamps.length - 1, actualDeliveredHz: (stamps.length - 1) / ((last - started) / 1000) };
    },
  });
}

const instrumentation = `
const __reviewHasFixedUpdates = typeof updateSimulation === 'function';
let __reviewTrace, __reviewPreviousGround;
function __reviewResetTrace() {
 __reviewTrace = {updates:0,renders:0,peakY:player.position.y,landedAtSimulation:null,collapseAtSimulation:{}};
 __reviewPreviousGround=onGround;
}
function __reviewObserveUpdate() {
 __reviewTrace.updates++;
 __reviewTrace.peakY=Math.max(__reviewTrace.peakY,player.position.y);
 if(!__reviewPreviousGround&&onGround&&__reviewTrace.landedAtSimulation===null)__reviewTrace.landedAtSimulation=simTime;
 __reviewPreviousGround=onGround;
 platforms.forEach((p,i)=>{if(p.fragile&&!p.mesh.visible&&__reviewTrace.collapseAtSimulation[i]===undefined)__reviewTrace.collapseAtSimulation[i]=simTime;});
}
__reviewResetTrace();
const __reviewOriginalRender=renderer.render;
renderer.render=function(...values){__reviewTrace.renders++;return __reviewOriginalRender.apply(this,values)};
if(__reviewHasFixedUpdates){
 const __reviewOriginalUpdate=updateSimulation;
 updateSimulation=function(...values){const value=__reviewOriginalUpdate(...values);__reviewObserveUpdate();return value};
}else{
 const __reviewOriginalLoop=loop;
 loop=function loop(timestamp){const before=simTime;const value=__reviewOriginalLoop(timestamp);if(simTime!==before)__reviewObserveUpdate();return value};
}
window.__reviewTiming=Object.freeze({
 snapshot(){return{
  fixedUpdates:__reviewHasFixedUpdates,
  position:{x:player.position.x,y:player.position.y,z:player.position.z},vy,onGround,running,won,hasStarted,contextLost,runTime,simTime,lastFrame,
  accumulator:typeof accumulator==='number'?accumulator:null,score,lives,shields,invulnerable,
  dashUntil,dashReadyAt,dashActive:running&&runTime<dashUntil,dashReady:runTime>=dashReadyAt,
  keys:[...keys],message:msg.textContent,overlayVisible:!readyOverlay.hidden,startText:startRun.textContent,
  platforms:platforms.map((p,index)=>({index,x:p.x,z:p.z,moving:!!p.moving,fragile:!!p.fragile,visible:p.mesh.visible,collapseAt:p.collapseAt})),
  obstacles:obstacles.map(o=>({index:o.index,angle:o.pivot.rotation.y})),
  trace:JSON.parse(JSON.stringify(__reviewTrace)),
  webgl:{lost:renderer.getContext().isContextLost(),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,width:renderer.domElement.width,height:renderer.domElement.height}
 }},
 resetObservation(){__reviewResetTrace()},
 placeOnPlatform(index,offsetX=0){
  const p=platforms[index];if(!p||!p.mesh.visible)throw Error('Cannot place on platform '+index);
  player.position.set(p.x+offsetX,0,p.z);vy=0;onGround=true;landedPlatform=p;coyote=0;jumpBuffer=0;
  __reviewResetTrace();
 }
});
`;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.glb': 'model/gltf-binary' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!path.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    let data = await readFile(path);
    if (url.searchParams.has('review-timing') && sources.some(s => path === join(root, s.file))) {
      const html = data.toString('utf8');
      if (!html.includes('/* sky-rush-test-hook */')) throw Error('Missing explicit test marker');
      data = Buffer.from(html.replace('/* sky-rush-test-hook */', instrumentation));
    }
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500); res.end(error.message); }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
const closeTo = (a, b, tolerance, message) => assert(Math.abs(a - b) <= tolerance, `${message}: ${a} vs ${b} (tolerance ${tolerance})`);
async function save() { await writeFile(join(out, 'results.json'), JSON.stringify(result, null, 2) + '\n'); }
async function test(name, method, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    result.tests.push({ name, method, status: 'passed', milliseconds: Date.now() - started, detail });
    console.log(`PASS ${name}`);
  } catch (error) {
    result.tests.push({ name, method, status: 'failed', milliseconds: Date.now() - started, error: error.stack || String(error), observations: error.observations || null });
    console.log(`FAIL ${name}: ${error.message}`);
  }
  await save();
}
const snap = page => page.evaluate(() => window.__reviewTiming.snapshot());
const frames = (page, hz, count, until = '') => page.evaluate(({ hz, count, until }) => window.__reviewClock.frames(hz, count, until), { hz, count, until });
async function prime(page) {
  await page.evaluate(() => {
    const state = window.__reviewTiming.snapshot();
    window.__reviewClock.prime(state.lastFrame === null ? performance.now() : state.lastFrame);
    window.__reviewTiming.resetObservation();
  });
}
async function fresh(page) {
  await page.locator('#reset').click({ force: true });
  await page.locator('#startRun').click({ force: true });
  await prime(page);
  const state = await snap(page);
  assert(state.running && state.runTime === 0, 'Fresh run must start at zero');
}
async function observedPage(source, fn) {
  const page = await browser.newPage({ viewport: { width: 640, height: 500 } });
  const errors = [], failedRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  await page.addInitScript(installClock);
  try {
    await page.goto(`${base}/${source.file}?review-timing=1`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__reviewTiming && !document.getElementById('startRun').disabled, { timeout: 30000 });
    const initial = await snap(page);
    assert(initial.webgl.calls > 0 && initial.webgl.triangles > 0 && !initial.webgl.lost, 'Real WebGL must have rendered the scene');
    const detail = await fn(page);
    assert.equal(errors.length, 0, `Browser errors: ${errors.join('; ')}`);
    assert.equal(failedRequests.length, 0, `Failed requests: ${JSON.stringify(failedRequests)}`);
    return { ...detail, initialWebGL: initial.webgl, errors, failedRequests };
  } catch (error) {
    error.observations = { ...(error.observations || {}), errors, failedRequests };
    try { error.observations.final = await snap(page); } catch {}
    const path = join(out, `${source.stage}-${source.kind}-failure-${Date.now()}.png`);
    try { await page.screenshot({ path }); result.screenshots.push(path); } catch {}
    throw error;
  } finally { await page.close(); }
}

async function measureCadence(page, hz) {
  await fresh(page);
  const clock = (await frames(page, hz, hz)).final;
  await fresh(page);
  const walkingStart = await snap(page);
  await page.keyboard.down('ArrowRight');
  const walking = (await frames(page, hz, hz / 5)).final;
  await page.keyboard.up('ArrowRight');

  await fresh(page);
  await page.keyboard.press('Space');
  await page.evaluate(() => window.__reviewTiming.resetObservation());
  const jump = await frames(page, hz, hz * 2, 'land');
  assert(jump.final.onGround && jump.final.trace.peakY > 1, 'Actual jump input must leave the platform and land');

  await fresh(page);
  await page.evaluate(() => window.__reviewTiming.placeOnPlatform(0, -1.6));
  await page.keyboard.down('ArrowRight');
  await page.keyboard.press('ShiftLeft');
  await page.keyboard.up('ArrowRight');
  const dashStart = await snap(page);
  assert(dashStart.dashActive, 'Native Dash input must activate Dash');
  const dash = await frames(page, hz, hz * 6, 'dashReady');
  const dashEndRow = dash.rows.find(row => !row.dashActive);
  assert(dashEndRow && dash.final.dashReady && dash.final.lives === 3, 'Isolated Dash must end and cool down without a respawn');
  await page.keyboard.press('ShiftLeft');
  const dashRetriggered = (await snap(page)).dashActive;
  assert(dashRetriggered, 'Native Dash input must work again after the observed cooldown');

  await fresh(page);
  let state = await snap(page);
  const moving = state.platforms.find(p => p.moving);
  await page.evaluate(index => window.__reviewTiming.placeOnPlatform(index), moving.index);
  const rideStart = await snap(page);
  const ride = (await frames(page, hz, hz)).final;
  assert(ride.onGround && ride.lives === 3, 'Moving-platform passenger must remain supported');
  const rideOffset = ride.position.x - ride.platforms[moving.index].x;
  closeTo(rideOffset, rideStart.position.x - rideStart.platforms[moving.index].x, 1e-8, 'Platform must carry player without drift');

  await fresh(page);
  state = await snap(page);
  const fragile = state.platforms.find(p => p.fragile && !state.obstacles.some(o => o.index === p.index));
  assert(fragile, 'Expected existing fragile platform away from spinner');
  await page.evaluate(index => window.__reviewTiming.placeOnPlatform(index), fragile.index);
  const crumble = await frames(page, hz, hz * 3, `collapse:${fragile.index}`);
  const fragileEnd = crumble.final.platforms[fragile.index];
  assert(!fragileEnd.visible, 'Existing crumble must eventually collapse');
  return {
    hz, inputSeconds: 1, gameSeconds: clock.runTime, simulationSeconds: clock.simTime,
    clockUpdates: clock.trace.updates, clockRenders: clock.trace.renders,
    movingPlatformAtOneSecond: clock.platforms.filter(p => p.moving).map(p => ({ index: p.index, x: p.x })),
    hazardAnglesAtOneSecond: clock.obstacles,
    walking: { deliveredSeconds: .2, distance: walking.position.x - walkingStart.position.x, simulationSeconds: walking.runTime, input: 'native ArrowRight; no position assistance' },
    jump: { peakY: jump.final.trace.peakY, visibleFrameSamplePeakY: Math.max(...jump.rows.map(row => row.y)), landedAtSimulation: jump.final.trace.landedAtSimulation, observedLandingDeliveredSeconds: jump.rows.at(-1).elapsed, input: 'native Space; no position assistance; peak observed after every actual physics update; visible samples may miss that peak' },
    dash: { distance: dashEndRow.x - dashStart.position.x, observedEndDeliveredSeconds: dashEndRow.elapsed, observedCooldownDeliveredSeconds: dash.rows.at(-1).elapsed, readyAtSimulation: dash.final.runTime, cooldown: dashStart.dashReadyAt, nativeRetriggerAfterCooldown: dashRetriggered, assistance: 'Placed at x=-1.6 on existing start platform before native ArrowRight+Shift; no state changes during Dash' },
    ride: { platform: moving.index, offset: rideOffset, playerX: ride.position.x, assistance: 'Placed on existing moving platform before stepping; unaltered support and movement code' },
    crumble: { platform: fragile.index, armedAtSimulation: fragileEnd.collapseAt, hiddenAtSimulation: crumble.final.trace.collapseAtSimulation[fragile.index], observedHiddenDeliveredSeconds: crumble.rows.at(-1).elapsed, assistance: 'Placed on existing fragile platform before stepping; no collapse-time override' },
  };
}

try {
  const launch = { headless: true, executablePath: args.executable || browserType.executablePath() };
  if (engine === 'chromium') launch.args = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  browser = await browserType.launch(launch);
  result.browserVersion = browser.version();
  for (const source of sources) {
    const label = `${source.stage} ${source.kind}`;
    if (selected === 'all' || selected === 'matrix') await test(`${label}: delivered cadence 15/30/60/120`, 'controlled delivered timestamps; native input; explicitly assisted Dash/platform isolation', () => observedPage(source, async page => {
      const matrix = [];
      for (const hz of [15, 30, 60, 120]) {
        matrix.push(await measureCadence(page, hz));
        await writeFile(join(out, `${source.stage}-${source.kind}-cadence-progress.json`), JSON.stringify({ source, engine, browserVersion: result.browserVersion, matrix }, null, 2) + '\n');
        console.log(`  measured ${label} ${hz} Hz`);
      }
      try {
        const reference = matrix.find(row => row.hz === 60);
        if (source.kind === 'candidate') {
          for (const row of matrix) {
            closeTo(row.gameSeconds, 1, 1e-7, `${row.hz} Hz clock`);
            closeTo(row.walking.distance, 1.3, 1e-7, `${row.hz} Hz walking distance`);
            closeTo(row.jump.peakY, reference.jump.peakY, 1e-8, `${row.hz} Hz jump peak`);
            closeTo(row.jump.landedAtSimulation, reference.jump.landedAtSimulation, 1e-8, `${row.hz} Hz jump duration`);
            closeTo(row.dash.distance, reference.dash.distance, 1e-8, `${row.hz} Hz Dash distance`);
            closeTo(row.dash.observedCooldownDeliveredSeconds, 3.5, 1 / row.hz + 1 / 60 + 1e-8, `${row.hz} Hz cooldown wall interval`);
            closeTo(row.crumble.hiddenAtSimulation, reference.crumble.hiddenAtSimulation, 1e-8, `${row.hz} Hz crumble time`);
            closeTo(row.ride.playerX, reference.ride.playerX, 1e-8, `${row.hz} Hz moving platform`);
            assert.equal(row.clockUpdates, 60, `${row.hz} Hz must perform 60 simulation updates`);
            assert.equal(row.clockRenders, row.hz, `${row.hz} Hz must render once per delivered frame`);
            row.movingPlatformAtOneSecond.forEach((p, i) => closeTo(p.x, reference.movingPlatformAtOneSecond[i].x, 1e-8, 'Platform cycle phase'));
            row.hazardAnglesAtOneSecond.forEach((p, i) => closeTo(p.angle, reference.hazardAnglesAtOneSecond[i].angle, 1e-8, 'Hazard phase'));
          }
        } else {
          assert(matrix[0].gameSeconds < .8, 'Baseline should expose low-cadence time loss');
          closeTo(reference.gameSeconds, 1, 1e-7, 'Baseline 60 Hz clock reference');
          assert(matrix[0].walking.distance < reference.walking.distance * .8, 'Baseline walking should slow at 15 Hz');
          assert(Math.abs(matrix[0].jump.peakY - reference.jump.peakY) > .1, 'Baseline jump should expose variable-step height');
          assert(matrix[0].dash.observedCooldownDeliveredSeconds > 4.5, 'Baseline Dash cooldown should stretch in real delivered time');
          assert(matrix[0].crumble.observedHiddenDeliveredSeconds > reference.crumble.observedHiddenDeliveredSeconds * 1.3, 'Baseline crumble should stretch in delivered time');
        }
      } catch (error) { error.observations = { matrix }; throw error; }
      return { outcome: source.kind === 'candidate' ? 'cadence independence verified' : 'existing defects freshly reproduced', matrix };
    }));

    if (source.kind === 'candidate' && (selected === 'all' || selected === 'gaps')) {
      await test(`${label}: 300 ms catch-up`, 'single controlled 300 ms RAF interval; read-only simulation/render counters', () => observedPage(source, async page => {
        await fresh(page);
        const before = await snap(page);
        await page.evaluate(() => window.__reviewClock.step(300));
        const after = await snap(page);
        assert(after.running && !after.overlayVisible, '300 ms delay must retain running state');
        closeTo(after.runTime - before.runTime, .3, 1e-8, '300 ms must not be discarded');
        assert.equal(after.trace.updates - before.trace.updates, 18);
        assert.equal(after.trace.renders - before.trace.renders, 1);
        return { before, after };
      }));
      await test(`${label}: 1 second interruption pauses and resumes`, 'controlled stall after native jump; native Resume button; no player-state assistance', () => observedPage(source, async page => {
        await fresh(page);
        await page.keyboard.press('Space');
        await frames(page, 60, 12);
        const airborne = await snap(page);
        assert(!airborne.onGround && airborne.position.y > 0, 'Probe must stall during a real jump');
        await page.evaluate(() => window.__reviewClock.step(1000));
        const paused = await snap(page);
        assert(!paused.running && paused.overlayVisible && /interruption/i.test(paused.message), 'Long gap must visibly pause');
        assert.deepEqual(paused.position, airborne.position);
        closeTo(paused.vy, airborne.vy, 0, 'Velocity must freeze through interruption');
        closeTo(paused.runTime, airborne.runTime, 0, 'Run clock must freeze through interruption');
        await page.evaluate(() => window.__reviewClock.step(500));
        const stillPaused = await snap(page);
        closeTo(stillPaused.runTime, paused.runTime, 0, 'Paused time must remain frozen');
        await page.locator('#startRun').click({ force: true });
        await prime(page);
        const resumed = await snap(page);
        assert(resumed.running && !resumed.overlayVisible);
        assert.deepEqual(resumed.position, airborne.position);
        await frames(page, 60, 60);
        const landed = await snap(page);
        assert(landed.onGround && landed.position.y === 0 && landed.lives === 3, 'Resume must finish the same jump without fall/respawn');
        closeTo(landed.runTime - resumed.runTime, 1, 1e-7, 'Resume must not include discarded paused interval');
        return { airborne, paused, stillPaused, resumed, landed };
      }));
    }
    if (selected === 'all' || selected === 'wall') await test(`${label}: real-wall approximately 15 Hz probe`, 'native RAF timestamps gated in real time, no accelerated clock, no player-state assistance', () => observedPage(source, async page => {
      await fresh(page);
      const wall = await page.evaluate(() => window.__reviewClock.wall(2200, 15));
      const clockAdvance = wall.end.runTime - wall.begin.runTime;
      const errorSeconds = clockAdvance - wall.deliveredSeconds;
      try {
        assert(wall.deliveredFrames >= 12, 'Need sufficient real delivered frames for timing evidence');
        assert(wall.end.running, `Unexpected pause during wall probe: ${wall.end.message}`);
        assert(wall.end.webgl.calls > 0 && !wall.end.webgl.lost, 'Native probe must render real WebGL');
        if (source.kind === 'candidate') closeTo(clockAdvance, wall.deliveredSeconds, 1 / 60 + 1e-7, 'Candidate must preserve actual delivered wall interval within one physics step');
        else assert(clockAdvance < wall.deliveredSeconds * .85, 'Baseline real-wall probe should reproduce time loss');
      } catch (error) { error.observations = { wall, clockAdvance, errorSeconds }; throw error; }
      const path = join(out, `${engine}-${source.stage}-${source.kind}-wall.png`);
      await page.screenshot({ path }); result.screenshots.push(path);
      return { ...wall, clockAdvance, errorSeconds, ratio: clockAdvance / wall.deliveredSeconds, maxGapSeconds: Math.max(...wall.intervals), screenshot: path };
    }));
  }
} catch (error) {
  result.fatal = error.stack || String(error);
  console.error(result.fatal);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
  result.finishedAt = new Date().toISOString();
  result.sourceIntegrity = [];
  for (const source of sources) {
    const after = createHash('sha256').update(await readFile(join(root, source.file))).digest('hex');
    result.sourceIntegrity.push({ file: source.file, before: source.sha256, after, unchanged: after === source.sha256 });
  }
  result.summary = { passed: result.tests.filter(t => t.status === 'passed').length, failed: result.tests.filter(t => t.status === 'failed').length, sourceChangedDuringRun: result.sourceIntegrity.some(s => !s.unchanged) };
  await save();
  console.log(JSON.stringify(result.summary));
  if (result.fatal || result.summary.failed || result.summary.sourceChangedDuringRun) process.exitCode = 1;
}
