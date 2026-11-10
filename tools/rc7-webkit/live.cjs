const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {webkit}=require('playwright');
const root=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);fs.mkdirSync(out,{recursive:true});
const base='https://thafarmaaitah.github.io/Bouncing-/',commit='8000be541227e1c0d568526588ef1d14ed774cff';
const report={started:new Date().toISOString(),commit,http:[],cases:[],method:'Actual public HTTPS pages in WebKit without injected game code, native single-touch taps and DOM observations; not physical iPad/Safari. No private model used.'};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{let browser;try{
 const files=fs.readdirSync(path.join(root,'review/v29-rc7')).map(f=>'review/v29-rc7/'+f).concat(['assets/sky-rush-boot-v28.js','assets/sky-rush-v28.css','assets/vendor/three-0.160.1/three.module.min.js','assets/vendor/three-0.160.1/GLTFLoader.js','assets/vendor/three-0.160.1/BufferGeometryUtils.js','index.html','sky-rush-adventure.html','review/v29-rc6/index.html','review/v29-rc5/index.html']);
 for(const f of files){const r=await fetch(base+f+'?webkit_check=20261110',{signal:AbortSignal.timeout(20000)}),b=Buffer.from(await r.arrayBuffer()),expected=fs.readFileSync(path.join(root,f));const row={file:f,status:r.status,sha256:hash(b),expected:hash(expected),matches:b.equals(expected)};report.http.push(row);assert.equal(r.status,200);assert(row.matches,f+' live bytes differ')}
 browser=await webkit.launch({headless:true});report.browserVersion=browser.version();
 for(const [width,height] of [[390,844],[1024,650]])for(const stage of ['lava','storm']){
  const row={width,height,stage,checks:[],errors:[],badRequests:[]};
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,deviceScaleFactor:1});const page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',e=>row.errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET'||(r.url().startsWith('http')&&!r.url().startsWith(base)))row.badRequests.push({method:r.method(),url:r.url()})});
  page.on('response',r=>{if(r.status()>=400)row.badRequests.push({url:r.url(),status:r.status()})});
  try{
   await page.goto(base+'review/v29-rc7/index.html?webkit_check=20261110',{waitUntil:'networkidle'});assert.match(await page.title(),/RC7/);
   await page.locator('#sessionMode').selectOption('challenge');await page.locator('[data-stage="'+stage+'"]').tap();
   const frame=await(await page.locator('iframe').elementHandle()).contentFrame();await frame.locator('#startRun:not([disabled])').waitFor();
   assert.equal(await frame.locator('#game canvas').count(),1);assert.match(await frame.locator('#status').textContent(),/3D ready/);assert.equal(await frame.locator('#mode').inputValue(),'challenge');
   row.checks.push('Public HTTPS engine/canvas and correct mode');
   await frame.locator('#guideToggle').tap();assert(await frame.locator('#guideToggle').isChecked());
   await frame.locator('#startRun').tap();await frame.waitForFunction(()=>Number(document.getElementById('timer').textContent)>0);
   await frame.locator('#jump').tap();await frame.waitForFunction(()=>document.getElementById('message').textContent==='Jump!');
   await frame.locator('#dash').tap();await frame.waitForFunction(()=>document.getElementById('dash').disabled,undefined,{timeout:1500});row.checks.push('Native Start, JUMP and DASH taps');
   await frame.locator('#pause').tap();const before=await frame.locator('#timer').textContent();await page.waitForTimeout(180);assert.equal(await frame.locator('#timer').textContent(),before);row.checks.push('Pause freezes timer');
   assert.match(await frame.locator('#guideStatus').textContent(),/Guided attempt/);await frame.locator('#guideToggle').tap();assert.equal(await frame.locator('#guideToggle').isChecked(),false);assert.match(await frame.locator('#guideStatus').textContent(),/Guided attempt/);
   await page.screenshot({path:path.join(out,'webkit-'+width+'-'+stage+'-pause.png'),fullPage:true});
   await frame.locator('#startRun').tap();await frame.waitForFunction(t=>Number(document.getElementById('timer').textContent)>Number(t),before);row.checks.push('Guide-off retains guided notice; manual Resume advances timer');
   await page.locator('#parentInfo').tap();await frame.locator('#readyOverlay:not([hidden])').waitFor();await page.locator('#closePrivacy').tap();assert(await frame.locator('#readyOverlay').isVisible());
   await page.locator('#endSession').tap();assert.equal(await page.locator('iframe').count(),0);row.checks.push('Parent information pause and End session');
   assert.deepEqual(row.errors,[]);assert.deepEqual(row.badRequests,[]);row.pass=true;
  }catch(e){row.pass=false;row.failure=e.stack||String(e);await page.screenshot({path:path.join(out,'FAIL-webkit-'+width+'-'+stage+'.png')}).catch(()=>{})}
  finally{await context.close();report.cases.push(row);console.log(JSON.stringify(row))}
 }
 report.pass=report.cases.length===4&&report.cases.every(c=>c.pass);
}catch(e){report.fatal=e.stack||String(e);report.pass=false}finally{if(browser)await browser.close();report.finished=new Date().toISOString();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({http:report.http.length,cases:report.cases.map(c=>({width:c.width,stage:c.stage,pass:c.pass})),pass:report.pass,fatal:report.fatal}));if(!report.pass)process.exitCode=1}})();
