const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {chromium}=require('playwright');
const root=process.argv[2],out=process.argv[3],build=process.argv[4];fs.mkdirSync(out,{recursive:true});
const base='https://thafarmaaitah.github.io/Bouncing-/';const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const report={build,started:new Date().toISOString(),http:[],sessions:[],notTested:['Physical iPad/iPhone','Private V4.1','Full live route completion','Child enjoyment']};
(async()=>{let browser;try{
const added=fs.readdirSync(path.join(root,'review/v29-rc7')).map(n=>'review/v29-rc7/'+n);
const preserved=['index.html','sky-rush-adventure.html','sky-rush-adventure-v28.html','sky-rush-lava-obby-v28-stable.html','sky-rush-storm-circuit-v5-stable.html',...['v29','v29-rc3','v29-rc4','v29-rc5','v29-rc6'].flatMap(v=>['index.html','lava-v29-candidate.html','storm-v29-candidate.html'].map(n=>'review/'+v+'/'+n)),...['sky-rush-v28.css','sky-rush-boot-v28.js','vendor/three-0.160.1/three.module.min.js','vendor/three-0.160.1/GLTFLoader.js','vendor/three-0.160.1/BufferGeometryUtils.js'].map(n=>'assets/'+n)];
for(const f of [...added,...preserved]){
 const expected=fs.readFileSync(path.join(root,f));let response,bytes;
 for(let attempt=0;attempt<15;attempt++){
  response=await fetch(base+f+'?review='+build,{cache:'no-store',signal:AbortSignal.timeout(20000)});bytes=Buffer.from(await response.arrayBuffer());
  if(response.status===200&&bytes.equals(expected))break;
  if(attempt<14)await new Promise(r=>setTimeout(r,4000));
 }
 const row={file:f,status:response.status,sha256:hash(bytes),expected:hash(expected),match:bytes.equals(expected)};report.http.push(row);assert.equal(row.status,200,f);assert(row.match,f);
}
browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const stage of ['lava','storm']){
 const context=await browser.newContext({viewport:{width:1024,height:650},hasTouch:true,isMobile:true});const page=await context.newPage();const row={stage,errors:[],requests:[],checks:[]};
 page.on('pageerror',e=>row.errors.push(e.message));page.on('request',r=>row.requests.push({url:r.url(),method:r.method()}));
 await page.goto(base+'review/v29-rc7/index.html?review='+build,{waitUntil:'networkidle'});assert.match(await page.title(),/RC7/);
 await page.locator('[data-stage="'+stage+'"]').tap();const frame=await(await page.locator('iframe').elementHandle()).contentFrame();
 await frame.locator('#startRun:not([disabled])').waitFor();assert.equal(await frame.locator('#game canvas').count(),1);assert.equal(await frame.locator('#guideToggle').isChecked(),false);
 await frame.locator('#guideToggle').check();await frame.locator('#startRun').tap();await frame.waitForFunction(()=>Number(document.getElementById('timer').textContent)>0);row.checks.push('Actual public engine boot, guide selection and Start');
 await frame.locator('#jump').tap();await frame.waitForFunction(()=>document.getElementById('message').textContent==='Jump!');row.checks.push('Native touch JUMP');
 await frame.locator('#pause').tap();assert.match(await frame.locator('#guideStatus').textContent(),/Guided attempt/);await frame.locator('#guideToggle').uncheck();await frame.locator('#startRun').tap();row.checks.push('Pause, guide off, and manual Resume');
 await frame.locator('#pause').tap();assert.match(await frame.locator('#guideStatus').textContent(),/Guided attempt/);row.checks.push('Current attempt remains marked guided after turning it off');
 assert.equal(await frame.evaluate(()=>!!window.__rc7QA||!!window.__guideQA),false);assert.deepEqual(row.errors,[]);assert(row.requests.filter(r=>r.url.startsWith('http')).every(r=>r.method==='GET'&&new URL(r.url).origin===new URL(base).origin));
 await page.screenshot({path:path.join(out,'live-'+stage+'-guide.png')});await page.locator('#endSession').tap();assert.equal(await page.locator('iframe').count(),0);row.pass=true;report.sessions.push(row);await context.close();
}
report.pass=true;
}catch(e){report.pass=false;report.failure=e.stack||String(e);console.error(report.failure)}finally{if(browser)await browser.close();report.finished=new Date().toISOString();fs.writeFileSync(path.join(out,'live-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,http:report.http.length,sessions:report.sessions.length}));if(!report.pass)process.exitCode=1}})();
