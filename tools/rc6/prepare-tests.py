from pathlib import Path
import shutil
out=Path('evidence');out.mkdir(exist_ok=True)
s=Path('rc5tools/tools/rc5/test.cjs').read_text().replace('RC5','RC6').replace('rc5','rc6')
s=s.replace("'New full-route regression',",'')
s=s.replace('running,won,score,lives,runTime,sessionPending,','running,won,score,lives,runTime,sessionPending,attemptSetbacks,attemptRetries,runEligible,attemptGoal,')
s=s.replace('finish(){clearInput();cancelDash(true);score=5;document.getElementById(\'score\').textContent=5;','finish(n=5){clearInput();cancelDash(true);score=n;document.getElementById(\'score\').textContent=n;')
s=s.replace('landedPlatform=platforms[11]}};','landedPlatform=platforms[11]},lose(){lives=1;shields=0;onGround=false;player.position.y=-3;},shieldHit(){shields=1;onGround=false;player.position.y=-3;}};')
s=s.replace("await page.locator('#sessionMode').selectOption(mode);","await page.locator('input[value=clean]').check();assert.match(await page.locator('#goalHelp').textContent(),/obstacle hit/);await page.locator('#sessionMode').selectOption(mode);")
s=s.replace("check('Boot, mode and visible controls');","assert.equal((await state()).attemptGoal,'clean');check('Boot, chosen goal, mode and visible controls');")
s=s.replace("await finish();await frame.locator('#resultNext').tap();","await finish();const initialBadges=await page.evaluate(()=>JSON.parse(localStorage.getItem('skyRushProgressV29RC6Review')).lava);assert.deepEqual(initialBadges,{explorer:true,clean:true,time:mode==='challenge'});assert.match(await frame.locator('#resultGoal').textContent(),/Goal complete/);check('Five-star clean win grants correct badges; Practice grants no time badge');await frame.locator('#resultNext').tap();")
s=s.replace("check('Next retains mode and identical character bytes/geometry');","assert.equal((await state()).attemptGoal,'clean');check('Next retains goal, mode and identical character bytes/geometry');")
s=s.replace("check('Stage chooser preserves local session');","assert.equal(await page.locator('.badge.earned').count(),mode==='challenge'?6:4);check('Stage chooser preserves local session and displays earned badges');")
s=s.replace("await page.reload({waitUntil:'networkidle'});","const kept=await page.evaluate(()=>localStorage.getItem('skyRushProgressV29RC6Review'));await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>localStorage.getItem('skyRushProgressV29RC6Review')),kept);assert.equal(await page.locator('.badge.earned').count(),mode==='challenge'?6:4);await page.locator('#progressGrid').screenshot({path:path.join(out,engine+'-'+width+'-progress.png')});")
s=s.replace("row.storage=await page.evaluate",r'''if(width===1024){
    await page.evaluate(()=>localStorage.removeItem('skyRushProgressV29RC6Review'));
    await frame.locator('#mode').selectOption('challenge');await start();
    await frame.evaluate(()=>__rc6QA.finish(4));await frame.locator('#missingStars:not([hidden])').waitFor();assert.equal((await state()).won,false);assert.equal(await page.evaluate(()=>localStorage.getItem('skyRushProgressV29RC6Review')),null);check('Missing stars never unlock badges');
    await frame.evaluate(()=>__rc6QA.lose());await frame.locator('#resultOverlay[data-outcome=gameover]:not([hidden])').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('skyRushProgressV29RC6Review')),null);
    await frame.locator('#resultRetry').tap();await frame.waitForFunction(()=>__rc6QA.state().running);assert.equal((await state()).attemptRetries,1);assert.equal((await state()).runEligible,false);await finish();
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('skyRushProgressV29RC6Review')).lava),{explorer:true,clean:false,time:false});check('Game over awards nothing; checkpoint retry excludes clean and time badges');
    await frame.locator('#resultReplay').tap();await frame.waitForFunction(()=>__rc6QA.state().runTime>0);assert.equal((await state()).attemptSetbacks,0);assert.equal((await state()).attemptRetries,0);
    await frame.evaluate(()=>__rc6QA.shieldHit());await frame.waitForFunction(()=>__rc6QA.state().attemptSetbacks===1);assert.equal((await state()).lives,3);await finish();
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('skyRushProgressV29RC6Review')).lava),{explorer:true,clean:false,time:true});check('Shield-protected setback cannot earn clean badge; eligible Challenge can earn time');
    await frame.locator('#resultReplay').tap();await frame.waitForFunction(()=>__rc6QA.state().runTime>0);await finish();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('skyRushProgressV29RC6Review')).lava.clean),true);
    await frame.locator('#resultReplay').tap();await frame.waitForFunction(()=>__rc6QA.state().runTime>0);await finish();assert(!/New badges/.test(await frame.locator('#resultAchievements').textContent()));check('Fresh replay earns clean; repeated win never duplicates rewards');
    await frame.locator('#resultOverlay').screenshot({path:path.join(out,engine+'-'+width+'-result.png')});
    await frame.locator('#resultReplay').tap();await frame.waitForFunction(()=>__rc6QA.state().runTime>0);await frame.evaluate(()=>{Storage.prototype.setItem=function(){throw Error('Blocked for QA')}});await finish();assert.match(await frame.locator('#resultAchievements').textContent(),/Could not save progress/);check('Blocked storage leaves game playable and honestly reports unsaved result');
   }
   row.storage=await page.evaluate''')
s=s.replace("/^skyRush(Lava|Storm)BestV29RC[45]Review$/.test(k)","/^skyRush(Lava|Storm)BestV29RC[46]Review$/.test(k)||k==='skyRushProgressV29RC6Review'")
s=s.replace("check('Only best times stored; no model/profile in browser storage');","check('Only best times and bounded badge flags stored; no model/profile in browser storage');")
s=s.replace("check('Delete RC6 records preserves previous versions');","assert.equal(await page.evaluate(()=>localStorage.getItem('skyRushProgressV29RC6Review')),null);assert.equal(await page.locator('.badge.earned').count(),0);check('Delete RC6 progress and times preserves previous versions');")
Path('evidence/runtime-test.cjs').write_text(s)
# Real-time, native-input route tests: observation only, no state setup.
r=Path('oldtools/tools/test-sky-rush-review-routes.mjs').read_text()
r=r.replace("'review/v29/","'review/v29-rc6/")
r=r.replace("if (url.searchParams.has('route-observer') && stages.some(stage => path === join(root, stage.file)))", "if (stages.some(stage => path === join(root, 'review/v29-rc6/'+stage.stage+'-rc6.js')))")
r=r.replace('state = await snap();\n        const wallSeconds', 'state = await snap();\n        if(state.won)break;\n        const wallSeconds')
r=r.replace('route.initial = await snap();',"if(args.mode==='challenge')await page.locator('#mode').selectOption('challenge');\n      route.initial = await snap();")
r=r.replace("if (route.initial.mode !== 'practice')", "if (route.initial.mode !== (args.mode||'practice'))")
r=r.replace("route.status = route.completed", "route.badges=await page.evaluate(()=>JSON.parse(localStorage.getItem('skyRushProgressV29RC6Review')));\n      if(route.completed&&(!route.badges?.[stage.stage]?.explorer||route.badges[stage.stage].time!==(args.mode==='challenge')))throw Error('Route badge mismatch');\n      route.status = route.completed")
Path('evidence/routes.mjs').write_text(r)
print('Prepared executed tests and route adapter')
