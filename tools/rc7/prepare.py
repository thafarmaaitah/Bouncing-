from pathlib import Path
out=Path('evidence');out.mkdir(exist_ok=True)
s=Path('previous/evidence/runtime-test.cjs').read_text().replace('RC6','RC7').replace('rc6','rc7')
probe=r'''const guideProbe=`window.__guideQA={state:()=>({enabled:guideEnabled,assisted:attemptAssisted,target:guideTarget,anchor:guideAnchor,visible:guideGroup.visible,failures:guideFailures,position:{x:player.position.x,z:player.position.z},ring:{x:guideGroup.position.x,z:guideGroup.position.z},targetPosition:platforms[guideTarget]?{x:platforms[guideTarget].x,z:platforms[guideTarget].z}:null}),at(i,missing=[]){clearInput();cancelDash(true);player.position.set(platforms[i].x,0,platforms[i].z);onGround=true;vy=0;landedPlatform=platforms[i];stars.forEach(s=>s.mesh.visible=platforms.indexOf(s.platform)>i||missing.includes(platforms.indexOf(s.platform)));},hide(i){platforms[i].mesh.visible=false;}};`;
'''
s=s.replace('function fixture(',probe+'function fixture(',1).replace(".replace('/* sky-rush-test-hook */',probe)",".replace('/* sky-rush-test-hook */',probe+guideProbe)")
checks=r'''
   // Guide-specific setup is test-only. UI actions and render loop are real.
   await frame.locator('#reset').tap();await frame.locator('#mode').selectOption('challenge');
   assert.equal(await frame.locator('#guideToggle').isChecked(),false);
   await page.evaluate(()=>{localStorage.removeItem('skyRushProgressV29RC7Review');localStorage.setItem('skyRushLavaBestV29RC7Review','20')});
   await frame.locator('#guideToggle').check();await start();
   await frame.waitForFunction(()=>__guideQA.state().visible&&__guideQA.state().target===1);
   const stationary=await frame.evaluate(()=>__guideQA.state());
   await frame.waitForTimeout(160);assert.deepEqual((await frame.evaluate(()=>__guideQA.state())).position,stationary.position,'Guide moved player');
   assert((await frame.evaluate(()=>__guideQA.state())).assisted);assert.equal((await state()).runEligible,false);
   check('Guide opt-in renders next-platform marker without automatic movement');
   await frame.evaluate(()=>__guideQA.at(3));await frame.waitForFunction(()=>__guideQA.state().target===4);
   const movingGuide=await frame.evaluate(()=>__guideQA.state());assert.deepEqual(movingGuide.ring,movingGuide.targetPosition);
   await frame.evaluate(()=>__guideQA.hide(4));await frame.waitForFunction(()=>!__guideQA.state().visible);
   await frame.evaluate(()=>__guideQA.at(11,[8]));await frame.waitForFunction(()=>__guideQA.state().target===10);
   check('Guide follows moving-platform position, hides collapsed target, and points back toward a missed star');
   await frame.locator('#pause').tap();await frame.locator('#guideToggle').uncheck();await start();
   assert((await frame.evaluate(()=>__guideQA.state())).assisted);assert.equal((await state()).runEligible,false);
   await finish();assert.match(await frame.locator('#resultGoal').textContent(),/Guided completion/);
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('skyRushProgressV29RC7Review')).lava),{explorer:true,clean:false,time:false});
   assert.equal(await page.evaluate(()=>localStorage.getItem('skyRushLavaBestV29RC7Review')),'20');
   assert.equal((await frame.evaluate(()=>__guideQA.state())).visible,false);
   check('Turning guide off mid-attempt cannot regain clean/time badges or overwrite best time');
   await frame.locator('#resultReplay').tap();await frame.waitForFunction(()=>__rc7QA.state().runTime>0);
   assert.equal((await frame.evaluate(()=>__guideQA.state())).assisted,false);assert.equal((await state()).runEligible,true);
   await finish();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('skyRushProgressV29RC7Review')).lava),{explorer:true,clean:true,time:true});
   check('Fresh unassisted replay restores ordinary badge eligibility');
   await frame.locator('#resultNext').tap();await getFrame('storm');
   assert.equal(await frame.locator('#guideToggle').isChecked(),false);await frame.locator('#guideToggle').check();await start();await finish();
   assert.match(await frame.locator('#resultGoal').textContent(),/Guided completion/);assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('skyRushProgressV29RC7Review')).storm),{explorer:true,clean:false,time:false});
   check('Storm independently starts guide-off and enforces guided badge rules');
   await frame.locator('#resultHub').tap();await page.locator('[data-stage="lava"]').tap();await getFrame('lava');
   await frame.locator('#mode').selectOption('practice');await start();
   for(let i=1;i<=3;i++){await frame.evaluate(()=>__rc7QA.shieldHit());await frame.waitForFunction(n=>__rc7QA.state().attemptSetbacks===n,i)}
   assert.equal((await frame.evaluate(()=>__guideQA.state())).enabled,false);assert((await state()).running);
   assert.match(await frame.locator('#message').textContent(),/Need a hand/);
   await frame.locator('#pause').tap();assert.equal(await frame.locator('#guideSuggestion').isVisible(),true);
   await frame.locator('#guideToggle').check();await start();
   await page.screenshot({path:path.join(out,engine+'-'+width+'-path-guide.png')});
   check('Three setbacks offer optional help without enabling it or stopping play');
   await frame.locator('#reset').tap();await frame.locator('#guideToggle').uncheck();await start();
'''
needle='   if(width===1024){';assert s.count(needle)==1;s=s.replace(needle,checks+needle)
# Previously recorded cleanup whitelist must include the new version, not RC6.
s=s.replace('RC[46]Review','RC[47]Review')
Path('evidence/runtime-test.cjs').write_text(s)
r=Path('previous/evidence/routes.mjs').read_text().replace('RC6','RC7').replace('rc6','rc7')
needle="if(args.mode==='challenge')await page.locator('#mode').selectOption('challenge');"
assert r.count(needle)==1
r=r.replace(needle,"if(args.mode==='challenge'){await page.locator('#mode').selectOption('challenge');await page.locator('#guideToggle').check();}")
r=r.replace("route.badges[stage.stage].time!==(args.mode==='challenge')","route.badges[stage.stage].time!==false")
r=r.replace("result.browserVersion = browser.version();","result.browserVersion = browser.version();result.guideEnabled=args.mode==='challenge';")
Path('evidence/routes.mjs').write_text(r)
# Unit checks isolate rules and use an in-memory Storage stand-in, never user records.
Path('evidence/unit.mjs').write_text('''import assert from 'node:assert/strict';import fs from 'node:fs';
const root=process.argv[2],out=process.argv[3],results=[];
globalThis.localStorage={m:new Map(),getItem(k){return this.m.get(k)||null},setItem(k,v){this.m.set(k,v)},removeItem(k){this.m.delete(k)}};
const load=async f=>import('data:text/javascript;base64,'+fs.readFileSync(root+'/'+f).toString('base64'));
const {guideIndex}=await load('guide.js'),p=await load('progress.js');
const test=(name,fn)=>{try{fn();results.push({name,pass:true})}catch(e){results.push({name,pass:false,error:e.stack})}};
test('first platform',()=>assert.equal(guideIndex(0,[1,3,5,8,10]),1));
test('forward after collected star',()=>assert.equal(guideIndex(3,[5,8,10]),4));
test('missed star routes back one platform',()=>assert.equal(guideIndex(11,[3,8]),10));
test('uncollected star on current platform',()=>assert.equal(guideIndex(5,[5,8]),5));
test('finish with all stars',()=>assert.equal(guideIndex(11,[]),11));
test('return from existing secret branch',()=>assert.equal(guideIndex(12,[8,10]),5));
test('invalid anchor rejected',()=>assert.equal(guideIndex(-1,[]),-1));
const run={complete:true,score:5,seconds:15,setbacks:0,retries:0,challenge:true,eligible:true};
test('guided run earns explorer only',()=>{const r=p.recordCompletion('lava',{...run,assisted:true});assert.deepEqual(r.value.lava,{explorer:true,clean:false,time:false})});
test('unassisted timed run earns all',()=>assert.deepEqual(p.recordCompletion('lava',run).value.lava,{explorer:true,clean:true,time:true}));
test('guided replay never erases earlier awards',()=>assert.deepEqual(p.recordCompletion('lava',{...run,assisted:true}).earned,[]));
test('incomplete guided run earns nothing',()=>{const r=p.recordCompletion('storm',{...run,score:4,assisted:true});assert.equal(r.valid,false);assert.deepEqual(r.value.storm,{explorer:false,clean:false,time:false})});
test('practice excludes timed reward',()=>assert.deepEqual(p.recordCompletion('storm',{...run,challenge:false}).value.storm,{explorer:true,clean:true,time:false}));
fs.writeFileSync(out,JSON.stringify({tests:results,passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length},null,2));if(results.some(x=>!x.pass))process.exitCode=1;
''')
print('Prepared session regression, guide checks, 12 rule checks and 4 route cases')
