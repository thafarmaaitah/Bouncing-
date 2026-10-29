#!/usr/bin/env node
/**
 * Normal-time route traversal of the isolated Sky Rush review candidates.
 *
 * node tools/test-sky-rush-review-routes.mjs --browser chromium --out /tmp/sky-review-routes
 * Optional: --stage lava|storm|both --timeout-ms 90000 --resume-pauses yes|no
 *
 * The HTTP-only test hook exposes observations, never state-changing functions.
 * All movement/jumps use real keyboard input. Start/Resume use actual button
 * clicks. No teleportation, score/lives/invulnerability modification, accelerated
 * time, obstacle removal, private character upload, or production-source change.
 * Automated traversal does not establish enjoyment or physical-device usability.
 */
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  if (!process.argv[i].startsWith('--') || !process.argv[i + 1] || process.argv[i + 1].startsWith('--')) throw Error('Expected --name value');
  args[process.argv[i].slice(2)] = process.argv[++i];
}
const root = resolve(args.root || join(dirname(fileURLToPath(import.meta.url)), '..'));
const out = resolve(args.out || '/tmp/sky-rush-review-routes');
const engine = args.browser || 'chromium';
const selected = args.stage || 'both';
const timeout = Number(args['timeout-ms'] || 90000);
const resumePauses = args['resume-pauses'] === 'yes';
if (!['both', 'lava', 'storm'].includes(selected)) throw Error('Invalid --stage');
if (!(timeout > 0 && timeout <= 180000)) throw Error('--timeout-ms must be in (0,180000]');
const require = createRequire(import.meta.url);
const { chromium, webkit } = require(require.resolve('playwright', { paths: [process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, root].filter(Boolean) }));
const browserType = { chromium, webkit }[engine];
if (!browserType) throw Error('--browser must be chromium or webkit');
const stages = [
  { stage: 'lava', file: args['lava-file'] || 'review/v29/lava-v29-candidate.html', obstacles: [2, 5, 9] },
  { stage: 'storm', file: args['storm-file'] || 'review/v29/storm-v29-candidate.html', obstacles: [3, 6, 10] },
].filter(stage => selected === 'both' || selected === stage.stage);
await mkdir(out, { recursive: true });
for (const stage of stages) stage.sha256 = createHash('sha256').update(await readFile(join(root, stage.file))).digest('hex');
const result = {
  startedAt: new Date().toISOString(), engine, sources: stages, timeoutPerStageMilliseconds: timeout, resumePauses,
  method: 'Real-time browser render loop and native keyboard movement/jumps, read-only observation hook; normal Start/Resume button input. No gameplay state mutations. Practice mode, marker avatar.',
  limits: 'Desktop headless software rendering, automated route strategy; not a physical-device, character-appearance, or child enjoyment test.',
  routes: [],
};
const hook = `window.__readReviewRoute=()=>({
 position:{x:player.position.x,y:player.position.y,z:player.position.z},vy,onGround,score,lives,won,running,contextLost,simTime,runTime,shields,invulnerable,checkpointZ,checkpointX,
 platform:platforms.indexOf(landedPlatform),
 platforms:platforms.map((p,index)=>({index,x:p.x,z:p.z,moving:!!p.moving,fragile:!!p.fragile,visible:p.mesh.visible})),
 stars:stars.map(s=>({platform:platforms.indexOf(s.platform),visible:s.mesh.visible})),
 message:msg.textContent,keys:[...keys],mode:document.getElementById('mode').value,
 webgl:{lost:renderer.getContext().isContextLost(),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,frame:renderer.info.render.frame}
});`;
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!path.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    let data = await readFile(path);
    if (url.searchParams.has('route-observer') && stages.some(stage => path === join(root, stage.file))) {
      const html = data.toString('utf8');
      if (!html.includes('/* sky-rush-test-hook */')) throw Error('Missing existing test marker');
      data = Buffer.from(html.replace('/* sky-rush-test-hook */', hook));
    }
    res.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500); res.end(error.message); }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const base = `http://127.0.0.1:${server.address().port}`;
const save = () => writeFile(join(out, 'results.json'), JSON.stringify(result, null, 2) + '\n');
let browser;
try {
  const launch = { headless: true, executablePath: args.executable || browserType.executablePath() };
  if (engine === 'chromium') launch.args = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  browser = await browserType.launch(launch);
  result.browserVersion = browser.version();
  for (const stage of stages) {
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
    const route = { stage: stage.stage, source: stage.file, sourceSha256: stage.sha256, status: 'running', completed: false, pauses: [], respawns: [], inputRecoveries: [], events: [], errors: [], failedRequests: [], iterations: 0 };
    result.routes.push(route);
    page.on('pageerror', error => route.errors.push(error.message));
    page.on('requestfailed', request => route.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
    let held = new Set();
    const setKeys = async wanted => {
      for (const key of held) if (!wanted.has(key)) await page.keyboard.up(key);
      for (const key of wanted) if (!held.has(key)) await page.keyboard.down(key);
      held = wanted;
    };
    const snap = () => page.evaluate(() => window.__readReviewRoute());
    try {
      await page.goto(`${base}/${stage.file}?route-observer=1`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__readReviewRoute && !document.getElementById('startRun').disabled);
      route.initial = await snap();
      if (route.initial.mode !== 'practice') throw Error('Expected default Practice mode');
      if (route.initial.webgl.lost || route.initial.webgl.calls < 1) throw Error('WebGL did not draw the scene');
      await page.locator('#startRun').click();
      const start = Date.now(), deadline = start + timeout;
      let state = await snap(), previous = state, target = 1, lastGround = 0, corner = false, lastProgress = 0;
      while (Date.now() < deadline && !state.won) {
        route.iterations++;
        state = await snap();
        const wallSeconds = (Date.now() - start) / 1000;
        if (!state.running) {
          const pause = { wallSeconds, gameSeconds: state.runTime, message: state.message, contextLost: state.contextLost, position: state.position, action: resumePauses && !state.contextLost && route.pauses.length < 3 ? 'native Resume click' : 'stop and report' };
          route.pauses.push(pause);
          console.log(`${stage.stage} unexpected pause: ${state.message}; ${pause.action}`);
          await setKeys(new Set());
          await save();
          if (pause.action !== 'native Resume click') break;
          await page.locator('#startRun').click();
          state = await snap(); previous = state;
          continue;
        }
        if (state.invulnerable > previous.invulnerable + .25 && state.invulnerable > .8) {
          route.respawns.push({ wallSeconds, gameSeconds: state.runTime, from: previous.position, to: state.position, previousLives: previous.lives, lives: state.lives, previousShields: previous.shields, shields: state.shields, checkpointZ: state.checkpointZ, message: state.message });
          console.log(`${stage.stage} respawn at ${state.runTime.toFixed(2)}s, lives ${state.lives}`);
        }
        if (held.size && state.keys.length === 0) {
          route.inputRecoveries.push({ wallSeconds, gameSeconds: state.runTime, held: [...held], message: state.message, action: 'release native held keys, then press desired movement again' });
          await setKeys(new Set());
        }
        for (const key of ['score', 'lives', 'shields', 'checkpointZ']) if (state[key] !== previous[key]) route.events.push({ type: key, value: state[key], wallSeconds, gameSeconds: state.runTime, position: state.position });
        if (state.onGround) {
          if (state.platform >= 0) {
            if (state.platform !== lastGround) route.events.push({ type: 'land', platform: state.platform, wallSeconds, gameSeconds: state.runTime, score: state.score });
            lastGround = state.platform;
            const missing = state.stars.find(star => star.visible && star.platform <= lastGround);
            target = missing ? missing.platform : Math.min(11, lastGround + 1);
          }
          if (lastGround === 11 && state.score === 5) target = 11;
          else { await page.keyboard.press('Space'); corner = false; }
        }
        const platform = state.platforms[target];
        let tx = platform.x, tz = platform.z;
        if (stage.obstacles.includes(target) && state.position.y > 1.1 && Math.hypot(state.position.x - platform.x, state.position.z - platform.z) < .55) corner = true;
        if (stage.obstacles.includes(target) && corner) { tx += 1.35; tz -= .92; }
        const dx = tx - state.position.x, dz = tz - state.position.z, wanted = new Set();
        if (Math.abs(dx) > .16) wanted.add(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
        if (Math.abs(dz) > .16) wanted.add(dz > 0 ? 'ArrowDown' : 'ArrowUp');
        await setKeys(wanted);
        previous = state;
        if (wallSeconds - lastProgress >= 5) { console.log(`${stage.stage}: ${state.score}/5 stars, platform ${state.platform}, game ${state.runTime.toFixed(1)}s`); lastProgress = wallSeconds; }
        await page.waitForTimeout(35);
      }
      await setKeys(new Set());
      route.final = await snap();
      route.wallSeconds = (Date.now() - start) / 1000;
      route.completed = route.final.won && route.final.score === 5 && route.final.lives > 0;
      route.status = route.completed && !route.errors.length && !route.failedRequests.length ? 'passed' : 'failed';
      route.stopReason = route.completed ? 'finish reached with all five stars' : route.pauses.at(-1)?.action === 'stop and report' ? 'unexpected pause' : Date.now() >= deadline ? 'route-controller deadline exceeded; does not alone prove game impossible' : 'terminal state or runtime error';
      route.screenshot = join(out, `${engine}-${stage.stage}-route.png`);
      await page.screenshot({ path: route.screenshot, fullPage: true });
      console.log(JSON.stringify({ stage: stage.stage, status: route.status, score: route.final.score, lives: route.final.lives, gameSeconds: route.final.runTime, pauses: route.pauses.length, respawns: route.respawns.length, inputRecoveries: route.inputRecoveries.length, errors: route.errors }));
    } catch (error) {
      route.status = 'failed'; route.error = error.stack || String(error);
      console.error(`${stage.stage}: ${error.message}`);
      try { await setKeys(new Set()); route.final = await snap(); } catch {}
    } finally { await page.close(); await save(); }
  }
} catch (error) { result.fatal = error.stack || String(error); console.error(result.fatal); }
finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
  result.finishedAt = new Date().toISOString();
  result.sourceIntegrity = [];
  for (const stage of stages) {
    const after = createHash('sha256').update(await readFile(join(root, stage.file))).digest('hex');
    result.sourceIntegrity.push({ file: stage.file, before: stage.sha256, after, unchanged: stage.sha256 === after });
  }
  result.summary = { passed: result.routes.filter(route => route.status === 'passed').length, failed: result.routes.filter(route => route.status !== 'passed').length, sourceChangedDuringRun: result.sourceIntegrity.some(s => !s.unchanged) };
  await save();
  console.log(JSON.stringify(result.summary));
  if (result.fatal || result.summary.failed || result.summary.sourceChangedDuringRun) process.exitCode = 1;
}
