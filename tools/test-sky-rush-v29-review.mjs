#!/usr/bin/env node
/**
 * Sky Rush V29 saved review-candidate browser regression checks (local only).
 *
 * Usage:
 *   node tools/test-sky-rush-v29-review.mjs --output /tmp/sky-rush-v29-review-results
 *   node tools/test-sky-rush-v29-review.mjs --suite smoke --browser webkit --output /tmp/sky-rush-v29-review-webkit
 *   node tools/test-sky-rush-v29-review.mjs --filter 'lava: ready gate, keyboard movement, jump and pause' --browser webkit --output /tmp/sky-rush-v29-review-focused
 *
 * Requires Playwright and its browsers (or CODEX_PRIMARY_RUNTIME_NODE_MODULES).
 * The local HTTP server instruments only ?skytest=1 HTML responses. Published
 * files never contain the test API. Input tests use real browser input; mechanics
 * tests explicitly label any test-assisted positioning/state preparation.
 * Mobile profiles emulate viewport/touch and do not certify physical devices.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), values[index + 1] || '']);
  return pairs;
}, []));
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(args.output || '/tmp/sky-rush-v29-review-results');
const suite = args.suite || 'full';
const engine = args.browser || 'chromium';
const testFilter = args.filter || '';
if(args['base-url']) throw Error('Review candidates must be tested locally; no public base URL is allowed.');
const assetPath = args.character || process.env.SKY_RUSH_CHARACTER || '';
const modulePaths = [process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, root].filter(Boolean);
const { chromium, webkit, firefox } = require(require.resolve('playwright', { paths: modulePaths }));
const browserType = { chromium, webkit, firefox }[engine];
if (!browserType) throw Error(`Unknown browser: ${engine}`);
await mkdir(output, { recursive: true });

const stages = [
  { id: 'lava', file: 'review/v29/lava-v29-candidate.html', key: 'skyRushLavaBestV29Review' },
  { id: 'storm', file: 'review/v29/storm-v29-candidate.html', key: 'skyRushStormBestV29Review' },
];
const result = {
  startedAt: new Date().toISOString(), engine, suite, filter: testFilter || null,
  limitation: 'Headless browser with emulated viewports/touch; not physical iPhone/iPad testing or child playtesting.',
  tests: [], screenshots: [],
};

const baselineCommit='eb9e67ee92377725eeac9f6145ac352256f27c35';
const baselineSources=new Map((suite==='full'||suite==='baseline')?stages.map(stage=>[stage.file,execFileSync('git',['show',baselineCommit+':'+stage.file],{cwd:root})]):[]);
result.baselineCommit=baselineCommit;
result.sourceSha256=Object.fromEntries(await Promise.all(stages.map(async stage=>[stage.file,createHash('sha256').update(await readFile(join(root,stage.file))).digest('hex')])));

const instrumentation = `
window.__skyRushTest = Object.freeze({
  snapshot() {
    return {
      position: { x: player.position.x, y: player.position.y, z: player.position.z },
      rotationY: player.rotation.y, onGround, vy, score, lives, won, running, hasStarted,
      contextLost, runTime, simTime, shields, secretCollected, checkpointZ, checkpointX,
      keys: Array.from(keys), dashUntil, dashReadyAt, dashRemaining: Math.max(0, dashReadyAt-runTime),
      dashActive: running && runTime < dashUntil, speedRemaining: Math.max(0, speedUntil-runTime),
      frames: renderer.info.render.frame,
      approvedModel: approvedModel ? (() => {
        let meshes=0, vertices=0;
        approvedModel.traverse(o => { if(o.isMesh) { meshes++; vertices += o.geometry?.attributes?.position?.count || 0; } });
        return { meshes, vertices, visible: approvedModel.visible, scale: approvedModel.scale.toArray() };
      })() : null,
      avatarVisible: avatar.visible,
      platform: platforms.indexOf(landedPlatform),
      platforms: platforms.map((p,index) => ({index,x:p.x,z:p.z,visible:p.mesh.visible,moving:!!p.moving,fragile:!!p.fragile,collapseAt:p.collapseAt})),
      stars: stars.map((s,index) => ({index,platform:platforms.indexOf(s.platform),visible:s.mesh.visible})),
      crates: surpriseCrates.map((c,index) => ({index,platform:platforms.indexOf(c.p),kind:c.kind,collected:c.collected})),
      checkpointLabel: document.getElementById('checkpointLabel').textContent,
      message: msg.textContent,
      medal: document.getElementById('medal').textContent,
      best: document.getElementById('best').textContent
    };
  },
  place(index, y=0) {
    const p=platforms[index];
    if(!p) throw Error('Unknown platform '+index);
    keys.clear(); dashUntil=0; dashFxTime=0;
    player.position.set(p.x,y,p.z); vy=0; onGround=y===0;
    landedPlatform=onGround?p:null; coyote=0; jumpBuffer=0; invulnerable=10;
  },
  fall() { player.position.y=-3; vy=0; onGround=false; landedPlatform=null; invulnerable=0; },
  setLives(value) { lives=value; document.getElementById('lives').textContent=value; },
  loseContext() { const extension=renderer.getContext().getExtension('WEBGL_lose_context'); if(!extension) return false; window.__skyRushContextExtension=extension; extension.loseContext(); return true; },
  restoreContext() { window.__skyRushContextExtension.restoreContext(); }
});
`;

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let file = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    let data = await readFile(file);
    const relative=file.slice(root.length+1);
    if(url.searchParams.has('baseline')&&baselineSources.has(relative))data=baselineSources.get(relative);
    if (url.searchParams.has('skytest') && stages.some(s => file === join(root, s.file))) {
      const html = data.toString('utf8');
      if (!html.includes('/* sky-rush-test-hook */')) throw Error(`Missing test hook in ${file}`);
      data = Buffer.from(html.replace('/* sky-rush-test-hook */', instrumentation));
    }
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain' });
    res.end(error.message);
  }
});
await new Promise((resolve,reject) => { server.once('error',reject); server.listen(0, '127.0.0.1', resolve); });
const base = `http://127.0.0.1:${server.address().port}`;
let browser;

let diagnosticPage=null;
async function test(name, kind, fn) {
  if (testFilter && name !== testFilter) return;
  const begin = Date.now();
  try {
    const detail = await fn();
    result.tests.push({ name, kind, status: 'passed', milliseconds: Date.now() - begin, detail: detail || null });
    console.log(`PASS ${name}`);
  } catch (error) {
    let stateAtFailure=null;try{if(diagnosticPage&&!diagnosticPage.isClosed())stateAtFailure=await diagnosticPage.evaluate(()=>window.__skyRushTest?.snapshot()||null);}catch{}
    result.tests.push({ name, kind, status: 'failed', milliseconds: Date.now() - begin, error: error.stack || String(error), stateAtFailure });
    console.log(`FAIL ${name}: ${error.message}`);
  }
}

function watch(page) {
  diagnosticPage=page;
  const errors = [], failedRequests = [], responses=[];
  page.on('response',response=>responses.push({url:response.url(),status:response.status()}));
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  return { errors, failedRequests, responses };
}
async function snap(page) { return page.evaluate(() => window.__skyRushTest.snapshot()); }
async function frames(page, n=3) {
  await page.evaluate(n => new Promise(resolve => {
    const next = () => --n <= 0 ? resolve() : requestAnimationFrame(next);
    requestAnimationFrame(next);
  }), n);
}
async function goto(page, stage, instrument=true) {
  await page.goto(`${base}/${stage.file}${instrument?'?skytest=1':''}`, { waitUntil: 'load' });
  await page.waitForSelector('#game canvas');
  await page.waitForFunction(() => !document.getElementById('startRun').disabled);
  if (instrument) await page.waitForFunction(() => !!window.__skyRushTest);
}
async function fresh(page, mode='practice') {
  await page.selectOption('#mode', mode);
  await page.click('#reset');
  await page.click('#startRun');
  await page.waitForFunction(() => window.__skyRushTest.snapshot().running);
  await frames(page);
}
async function place(page, index, y=0) {
  await page.evaluate(({index,y}) => window.__skyRushTest.place(index,y), {index,y});
  await frames(page);
}
async function saveShot(page, name) {
  const file = join(output, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  result.screenshots.push(file);
}
async function allStarsAndFinish(page) {
  for (const s of (await snap(page)).stars) await place(page, s.platform);
  assert.equal((await snap(page)).score, 5, 'All five star collision handlers should run');
  await place(page, 11);
  await page.waitForFunction(() => window.__skyRushTest.snapshot().won);
}
async function buttonPoint(page, selector) {
  const box=await page.locator(selector).boundingBox();
  assert(box, `Missing ${selector}`);
  return { x: box.x+box.width/2, y: box.y+box.height/2 };
}

try {
  const launch = { headless: true, executablePath: args.executable || browserType.executablePath() };
  if (engine === 'chromium') launch.args = ['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'];
  browser = await browserType.launch(launch);
  result.browserVersion = browser.version();

  if(suite==='full'||suite==='baseline'){
    for(const stage of stages)await test(`${stage.id}: saved RC1 reproduces missing relative-asset startup`, 'historical saved candidate bytes served unchanged locally; actual browser network and startup observation',async()=>{
      const page=await browser.newPage();const observed=watch(page);
      try{
        await page.goto(`${base}/${stage.file}?baseline=1`,{waitUntil:'load'});
        assert(observed.responses.some(r=>r.status===404&&r.url.includes('/review/v29/assets/')),'Saved RC1 must request absent nested assets');
        assert.equal(await page.locator('#game canvas').count(),0);
        assert(await page.locator('#startRun').isDisabled());
        return{baselineCommit,sourceSha256:createHash('sha256').update(baselineSources.get(stage.file)).digest('hex'),...observed};
      }finally{await page.close();}
    });
  }

  if (suite !== 'baseline') {
    for (const stage of stages) {
      await test(`${stage.id}: uninstrumented WebGL startup`, 'actual browser, no test instrumentation', async () => {
        const page = await browser.newPage({ viewport: {width:1280,height:800} });
        const observed = watch(page);
        try {
          await goto(page,stage,false);
          await page.click('#startRun');
          await page.waitForTimeout(250);
          assert.equal(observed.errors.length,0,observed.errors.join('\n'));
          const canvas = await page.locator('#game canvas').boundingBox();
          assert(canvas.width>100 && canvas.height>100,'Canvas should have usable dimensions');
          await saveShot(page,`${engine}-${stage.id}-desktop`);
          return { canvas, ...observed };
        } finally { await page.close(); }
      });
    }
  }

  if(suite==='full') await test('Engine download failure is visible and Reload recovers', 'actual browser request failure and real Reload button', async()=>{
    const page=await browser.newPage();
    try{
      const blocked='**/assets/vendor/three-0.160.1/three.module.min.js';
      await page.route(blocked,route=>route.abort('failed'));
      await page.goto(`${base}/${stages[0].file}`,{waitUntil:'load'});
      await page.waitForSelector('#bootError:not([hidden])',{timeout:25000});
      assert(await page.locator('#startRun').isDisabled());
      const message=await page.locator('#bootErrorText').textContent();
      assert(message.length>15,'Startup failure should have readable feedback');
      await page.unroute(blocked);
      await page.click('#bootRetry');
      await page.waitForSelector('#game canvas');
      await page.waitForFunction(()=>!document.getElementById('startRun').disabled);
      return{failureMessage:message,recovered:true};
    }finally{await page.close();}
  });

  if (suite === 'full') {
    const context = await browser.newContext({viewport:{width:1280,height:800}});
    const page = await context.newPage();
    let observed=watch(page);
    for(const stage of stages) {
      await goto(page,stage);
      await test(`${stage.id}: ready gate, keyboard movement, jump and pause`, 'real keyboard/button input; read-only position observation', async () => {
        let a=await snap(page);
        assert.equal(a.running,false);
        await page.keyboard.press('ArrowUp');
        await frames(page);
        assert.deepEqual((await snap(page)).position,a.position,'Movement must wait for Start');
        await fresh(page);
        a=await snap(page);
        await page.keyboard.down('ArrowUp');
        await page.waitForTimeout(90);
        await page.keyboard.up('ArrowUp');
        let b=await snap(page);
        assert(b.position.z<a.position.z-.1,'Forward input should move toward course');
        await page.evaluate(() => {
          const initial=window.__skyRushTest.snapshot();
          const trace=window.__skyRushKeyboardJumpTrace={
            active:true,startedAt:performance.now(),inputAt:null,initialFrame:initial.frames,
            peakY:initial.position.y,airborne:false,firstSample:null,firstAirborne:null,samples:[]
          };
          const onKey=event=>{
            if(event.code!=='Space')return;
            trace.inputAt=performance.now();
            document.removeEventListener('keydown',onKey,true);
          };
          document.addEventListener('keydown',onKey,true);
          const observe=timestamp=>{
            if(!trace.active)return;
            if(trace.inputAt!==null){
              const state=window.__skyRushTest.snapshot();
              const sample={rafTimestamp:timestamp,wallMs:performance.now()-trace.inputAt,frame:state.frames,
                frameSinceSetup:state.frames-trace.initialFrame,simTime:state.simTime,
                y:state.position.y,vy:state.vy,onGround:state.onGround,running:state.running};
              trace.firstSample??=sample;
              if(!state.onGround){trace.airborne=true;trace.firstAirborne??=sample;}
              trace.peakY=Math.max(trace.peakY,sample.y);
              if(trace.samples.length<180)trace.samples.push(sample);
            }
            requestAnimationFrame(observe);
          };
          requestAnimationFrame(observe);
        });
        await page.keyboard.press('Space');
        let jumpTrace;
        try{
          await page.waitForFunction(()=>window.__skyRushKeyboardJumpTrace.peakY>.2 && window.__skyRushKeyboardJumpTrace.airborne,null,{timeout:2000});
        }finally{
          jumpTrace=await page.evaluate(()=>{window.__skyRushKeyboardJumpTrace.active=false;return window.__skyRushKeyboardJumpTrace;});
        }
        assert(jumpTrace.peakY>.2 && jumpTrace.airborne,'Jump should become airborne and exceed 0.2 units in actual animation frames');
        await page.click('#pause');
        const paused=await snap(page);
        await page.waitForTimeout(180);
        const later=await snap(page);
        assert.equal(later.running,false);
        assert.equal(later.runTime,paused.runTime,'Paused timer should freeze');
        assert.deepEqual(later.position,paused.position,'Paused physics should freeze');
        await page.click('#startRun');
        await frames(page);
        assert.equal((await snap(page)).running,true);
        assert.equal(observed.errors.length,0,observed.errors.join('\n'));
        return {jumpHeight:jumpTrace.peakY,jumpTrace,pausedTime:paused.runTime};
      });

      await test(`${stage.id}: Dash impulse and cooldown`, 'real button input; read-only position and cooldown observation', async () => {
        await fresh(page);
        const before=await snap(page);
        await page.click('#dash');
        await page.waitForTimeout(90);
        const during=await snap(page);
        assert(during.dashActive,'Dash should activate');
        assert(during.position.z<before.position.z-.5,'Dash must move the player');
        assert(during.dashRemaining>2.5 && during.dashRemaining<=3.5,'Cooldown should start');
        assert(await page.locator('#dash').isDisabled());
        const point=await buttonPoint(page,'#dash');
        await page.mouse.click(point.x,point.y);
        assert.equal((await snap(page)).dashReadyAt,during.dashReadyAt,'Disabled button cannot reset cooldown');
        await page.click('#retryCheckpoint');
        return {moved:before.position.z-during.position.z,cooldown:during.dashRemaining};
      });

      await test(`${stage.id}: checkpoint, retry and moving-platform support`, 'test-assisted positioning, actual simulation and Retry button', async () => {
        await fresh(page);
        await place(page,6);
        const saved=await snap(page);
        assert.match(saved.checkpointLabel,/2/);
        await place(page,0);
        await page.click('#retryCheckpoint');
        await frames(page);
        const restored=await snap(page);
        assert(Math.abs(restored.position.z-saved.checkpointZ)<.05);
        assert(restored.onGround);
        const moving=restored.platforms.find(p=>p.moving).index;
        await place(page,moving);
        const start=await snap(page);
        await page.waitForTimeout(450);
        const end=await snap(page);
        assert(end.onGround,'Player should remain supported on moving platform');
        assert(Math.abs(end.platforms[moving].x-start.platforms[moving].x)>.01,'Platform should move');
        assert(Math.abs(end.position.x-end.platforms[moving].x)<.05,'Player should be carried by moving platform');
        return {checkpoint:restored.checkpointLabel,movingPlatform:moving};
      });

      await test(`${stage.id}: crumbling platform and recovery`, 'test-assisted positioning, actual timed collapse and Retry button', async () => {
        await fresh(page);
        const index=(await snap(page)).platforms.find(p=>p.fragile).index;
        await place(page,index);
        await page.waitForFunction(index=>!window.__skyRushTest.snapshot().platforms[index].visible,index,{timeout:4000});
        const fallen=await snap(page);
        assert.equal(fallen.onGround,false,'Collapsed platform must stop supporting the player');
        await page.click('#retryCheckpoint');
        await frames(page);
        assert((await snap(page)).platforms.every(p=>p.visible),'Retry should restore collapsed platforms');
        return {platform:index,collapseAt:fallen.platforms[index].collapseAt};
      });

      await test(`${stage.id}: rewards and shield-protected fall`, 'test-assisted positioning/fall, actual reward and respawn handlers', async () => {
        await fresh(page);
        await place(page,2,-1);
        assert.equal((await snap(page)).shields,0,'Cannot collect a shield below platform');
        await place(page,2);
        const shielded=await snap(page);
        assert.equal(shielded.shields,1);
        await page.evaluate(()=>window.__skyRushTest.fall());
        await frames(page);
        const saved=await snap(page);
        assert.equal(saved.shields,0,'Fall should consume shield');
        assert.equal(saved.lives,shielded.lives,'Shield should protect life');
        await place(page,6);
        assert((await snap(page)).speedRemaining>7,'Speed crate should grant its timed boost');
        await place(page,12);
        const secret=await snap(page);
        assert(secret.secretCollected && secret.shields>=1,'Secret island should award gem and shield');
        await place(page,0);
        await page.click('#dash');
        await page.evaluate(()=>window.__skyRushTest.fall());
        await frames(page);
        assert.equal((await snap(page)).dashActive,false,'Respawn must cancel active Dash');
        return {shieldLifeProtection:true,speedBoost:true,secretGem:true};
      });

      await test(`${stage.id}: Practice finish and unlimited recovery`, 'test-assisted route positioning/life setup, actual collisions and finish', async () => {
        await fresh(page);
        const original=await page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),stages.map(s=>s.key));
        await page.evaluate(()=>{window.__skyRushTest.setLives(1);window.__skyRushTest.fall();});
        await frames(page);
        assert((await snap(page)).lives>0 && !(await snap(page)).won,'Practice must remain playable after final life');
        await place(page,11);
        assert.equal((await snap(page)).won,false,'Finish must require all five stars');
        await allStarsAndFinish(page);
        assert.match((await snap(page)).medal,/PRACTICE/i);
        const after=await page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),stages.map(s=>s.key));
        assert.deepEqual(after,original,'Practice must not overwrite competitive best records');
        return {medal:(await snap(page)).medal,competitiveRecordsUnchanged:true};
      });

      await test(`${stage.id}: checkpoint retry cannot set a challenge record`, 'real mode/Retry input; test-assisted route positioning', async()=>{
        await fresh(page,'challenge');
        const before=await page.evaluate(key=>localStorage.getItem(key),stage.key);
        await page.click('#retryCheckpoint');
        await allStarsAndFinish(page);
        const s=await snap(page);
        assert.equal(s.medal,'RETRY RUN');
        assert.equal(await page.evaluate(key=>localStorage.getItem(key),stage.key),before);
        return{medal:s.medal,recordUnchanged:true};
      });
      assert.equal(observed.errors.length,0,observed.errors.join('\n'));
    }

    await test('Lava and Storm challenge records are isolated and persistent', 'actual mode selection and finish handling; test-assisted route positioning', async()=>{
      const keys=stages.map(s=>s.key);
      await page.evaluate(keys=>keys.forEach(k=>localStorage.removeItem(k)),keys);
      let lavaValue;
      for(const stage of stages){
        await goto(page,stage);
        await fresh(page,'challenge');
        await allStarsAndFinish(page);
        const stored=await page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),keys);
        assert(Number(stored[stage.key])>0,`${stage.id} must save own positive challenge time`);
        if(stage.id==='lava'){assert.equal(stored[stages[1].key],null);lavaValue=stored[stage.key];}
        else assert.equal(stored[stages[0].key],lavaValue,'Storm cannot overwrite Lava best');
        await page.reload({waitUntil:'load'});
        await page.waitForFunction(()=>!!window.__skyRushTest);
        assert.notEqual((await snap(page)).best,'—','Best time should survive reload');
      }
      return await page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),keys);
    });

    await test('WebGL context loss pauses and restoration requires Resume', 'actual WEBGL_lose_context extension; not physical GPU/memory pressure', async()=>{
      await goto(page,stages[0]);await fresh(page);
      assert(await page.evaluate(()=>window.__skyRushTest.loseContext()),'Context-loss extension should exist in test browser');
      await page.waitForFunction(()=>window.__skyRushTest.snapshot().contextLost);
      const lost=await snap(page);
      assert.equal(lost.running,false);
      await page.waitForTimeout(250);
      await page.evaluate(()=>window.__skyRushTest.restoreContext());
      await page.waitForFunction(()=>!window.__skyRushTest.snapshot().contextLost);
      assert.equal((await snap(page)).running,false,'Restoration should not resume movement automatically');
      await page.click('#startRun');await frames(page);
      assert.equal((await snap(page)).running,true);
      return{lost:true,restored:true,resumedByButton:true};
    });

    if(assetPath) await test('Approved V4.1 GLB loads locally without changing its bytes', 'real file-input loading; exact user-approved local asset', async()=>{
      const original=await readFile(assetPath);
      const digest=createHash('sha256').update(original).digest('hex');
      await goto(page,stages[0]);
      const network=[];page.on('request',request=>network.push({url:request.url(),method:request.method()}));
      await page.setInputFiles('#approvedFile',assetPath);
      await page.waitForFunction(()=>!!window.__skyRushTest.snapshot().approvedModel,null,{timeout:60000});
      await page.click('#startRun');
      await frames(page,5);
      const s=await snap(page);
      assert(s.approvedModel.meshes>0 && s.approvedModel.vertices>0);
      assert.equal(s.avatarVisible,false,'Placeholder must be hidden after approved model load');
      assert.equal(createHash('sha256').update(await readFile(assetPath)).digest('hex'),digest);
      assert(!network.some(r=>r.method!=='GET' && r.method!=='HEAD'),'Local file loading must not upload the model');
      await saveShot(page,`${engine}-approved-v4-1`);
      return {sha256:digest,bytes:original.length,model:s.approvedModel,requestsAfterSelection:network};
    });
    else result.tests.push({name:'Approved V4.1 exact-asset loading',kind:'actual file input',status:'not-run',reason:'No --character path supplied'});
    await context.close();
  }

  if(suite==='full'||suite==='mobile'){
    const profiles=[
      {name:'phone-portrait',width:390,height:844},
      {name:'phone-landscape',width:844,height:390},
      {name:'ipad-portrait',width:820,height:1180},
      {name:'ipad-landscape',width:1180,height:820},
    ];
    for(const profile of profiles)for(const stage of stages)await test(`${stage.id}: ${profile.name} layout and touch`,engine==='chromium'?'emulated viewport plus real CDP multi-touch/cancel input':'emulated viewport plus real touchscreen taps',async()=>{
      const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},hasTouch:true,isMobile:true,deviceScaleFactor:2});
      const page=await context.newPage();const observed=watch(page);
      try{
        await goto(page,stage);
        await page.touchscreen.tap(...Object.values(await buttonPoint(page,'#startRun')));
        await frames(page);
        const controls=await page.evaluate(()=>['#jump','#dash','[data-dir="forward"]','[data-dir="left"]','[data-dir="back"]','[data-dir="right"]'].map(selector=>{
          const e=document.querySelector(selector),b=e.getBoundingClientRect();return{selector,x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom,right:b.right};
        }));
        for(const c of controls){
          assert(c.x>=0&&c.y>=0&&c.right<=profile.width+1&&c.bottom<=profile.height+1,`${c.selector} outside viewport: ${JSON.stringify(c)}`);
          assert(c.width>=44&&c.height>=44,`${c.selector} touch target below 44px`);
        }
        const canvas=await page.locator('#game canvas').boundingBox();
        assert(canvas.height>=130 && canvas.width>100,'Playable canvas should remain visible');
        let touchEvidence=null;
        if(engine==='chromium'){
          const cdp=await context.newCDPSession(page);
          const forward=await buttonPoint(page,'[data-dir="forward"]'),jump=await buttonPoint(page,'#jump');
          const p=(point,id)=>({...point,id,radiusX:6,radiusY:6,force:1});
          const before=await snap(page);
          await page.evaluate(()=>{
            window.__skyRushInputTrace={peakY:0,minZ:Infinity,events:[],frames:0};
            for(const type of ['pointerdown','pointerup','pointercancel'])document.addEventListener(type,e=>{
              window.__skyRushInputTrace.events.push({type,id:e.pointerId,target:e.target.id||e.target.dataset.dir,x:e.clientX,y:e.clientY});
            },true);
            const sample=()=>{const t=window.__skyRushInputTrace,s=window.__skyRushTest.snapshot();t.peakY=Math.max(t.peakY,s.position.y);t.minZ=Math.min(t.minZ,s.position.z);t.frames++;requestAnimationFrame(sample);};
            requestAnimationFrame(sample);
          });
          await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p(forward,0)]});
          await page.waitForTimeout(60);
          await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p(forward,0),p(jump,1)]});
          try{await page.waitForFunction(()=>window.__skyRushInputTrace.peakY>.2,null,{timeout:2000});}
          catch(error){throw Error(`Second-finger jump was not observed: ${JSON.stringify(await page.evaluate(()=>({trace:window.__skyRushInputTrace,state:window.__skyRushTest.snapshot()})))}`);}
          const trace=await page.evaluate(()=>window.__skyRushInputTrace);
          assert(trace.minZ<before.position.z-.2,'Touch direction should move player');
          assert(trace.peakY>.2,'Second finger should jump while direction is held');
          await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
          await frames(page);
          assert.equal((await snap(page)).keys.length,0,'touchcancel must clear held directions');
          touchEvidence={peakY:trace.peakY,forwardDistance:before.position.z-trace.minZ,frames:trace.frames,events:trace.events,cancelClearedKeys:true};
          await fresh(page);
          const heldForward=await buttonPoint(page,'[data-dir="forward"]'),pause=await buttonPoint(page,'#pause');
          await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p(heldForward,0)]});
          await frames(page,1);
          assert((await snap(page)).keys.includes('forward'),'First finger should hold forward');
          await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p(heldForward,0),p(pause,1)]});
          await frames(page,2);
          const secondaryPause=await snap(page);
          assert.equal(secondaryPause.running,false,'Second-finger Pause must not depend on a compatibility click');
          assert.equal(secondaryPause.keys.length,0,'Pause must clear first-finger movement');
          await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
          touchEvidence.secondFingerPause={running:secondaryPause.running,keys:secondaryPause.keys};
          await cdp.detach();
          await page.click('#startRun');await frames(page,2);
        }else{
          await page.evaluate(()=>{
            window.__skyRushTapTrace={peakY:0,frames:0};
            const sample=()=>{const t=window.__skyRushTapTrace,s=window.__skyRushTest.snapshot();t.peakY=Math.max(t.peakY,s.position.y);t.frames++;requestAnimationFrame(sample);};
            requestAnimationFrame(sample);
          });
          const jump=await buttonPoint(page,'#jump');await page.touchscreen.tap(jump.x,jump.y);
          await page.waitForFunction(()=>window.__skyRushTapTrace.peakY>.2,null,{timeout:2000});
          touchEvidence={...await page.evaluate(()=>window.__skyRushTapTrace),multiTouch:false,input:'touchscreen.tap'};
          assert(touchEvidence.peakY>.2,'A real touchscreen tap should produce a visible jump');
        }
        await page.click('#retryCheckpoint');
        await frames(page);
        await saveShot(page,`${engine}-${stage.id}-${profile.name}`);
        assert.equal(observed.errors.length,0,observed.errors.join('\n'));
        return{viewport:profile,controls,canvas,touchEvidence,...observed};
      }finally{await context.close();}
    });
  }
} catch(error){
  result.tests.push({name:'Harness execution',kind:'infrastructure',status:'failed',error:error.stack||String(error)});
  console.log(`HARNESS ERROR: ${error.message}`);
} finally {
  if(browser) await browser.close();
  await new Promise(resolve=>server.close(resolve));
  result.completedAt=new Date().toISOString();
  if(testFilter && result.tests.length===0) result.tests.push({name:'Test filter',kind:'harness selection',status:'failed',error:`No test matched ${testFilter}`});
  result.summary=Object.fromEntries(['passed','failed','not-run'].map(status=>[status,result.tests.filter(t=>t.status===status).length]));
  await writeFile(join(output,'results.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({output:join(output,'results.json'),...result.summary}));
  process.exitCode=result.summary.failed?1:0;
}
