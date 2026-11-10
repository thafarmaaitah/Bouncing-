from pathlib import Path
import hashlib, json
src=Path('previous/runtime-test.cjs').read_text()
def replace_once(old,new):
 global src
 assert src.count(old)==1, (old[:100],src.count(old))
 src=src.replace(old,new,1)
replace_once("for(const [engine,type] of [['chromium',chromium],['webkit',webkit]])", "for(const [engine,type] of [['webkit',webkit]])")
replace_once('report.summary.total!==8','report.summary.total!==4')
replace_once("const guideProbe=", "const controlsProbe=`window.__controlsQA={state:()=>({running,won,runTime,position:{x:player.position.x,y:player.position.y,z:player.position.z},vy,onGround,keys:[...keys],keyboardDirs:[...keyboardDirs],pointerDirs:[...pointerDirs],dashUntil,dashReadyAt,lives})};`;\nconst guideProbe=")
replace_once('probe+guideProbe','probe+guideProbe+controlsProbe')
replace_once("const start=async()=>", """const controls=async(stage)=>{
    const details=[];
    const fresh=async()=>{await frame.locator('#reset').tap();await frame.locator('#startRun').tap();await frame.waitForFunction(()=>__controlsQA.state().runTime>0)};
    for(const action of ['jump','dash']){
      await fresh();
      const data=await frame.evaluate(async action=>{
        const events=[];
        const snap=()=>__controlsQA.state();
        function send(selector,type,id,primary){
          const el=document.querySelector(selector),b=el.getBoundingClientRect(),x=b.x+b.width/2,y=b.y+b.height/2;
          if(el.disabled||document.elementFromPoint(x,y)!==el)throw Error('Input target not hittable: '+selector);
          const e=new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:id,isPrimary:primary,button:0,buttons:type==='pointerdown'?1:0,clientX:x,clientY:y});
          el.dispatchEvent(e);events.push({selector,type,isTrusted:e.isTrusted,pointerId:id,isPrimary:primary});
        }
        const before=snap();
        send('[data-dir="forward"]','pointerdown',101,true);
        const held=snap();
        send('#'+action,'pointerdown',102,false);
        const activated=snap();
        send('#'+action,'pointerup',102,false);
        const secondaryReleased=snap();
        for(let i=0;i<3;i++)await new Promise(requestAnimationFrame);
        const moved=snap();
        send('[data-dir="forward"]','pointerup',101,true);
        return {before,held,activated,secondaryReleased,moved,released:snap(),events};
      },action);
      assert(data.held.keys.includes('forward'));
      assert(data.secondaryReleased.keys.includes('forward'),'Releasing secondary action lost Forward');
      assert(data.moved.position.z<data.before.position.z,'Forward did not move');
      assert(data.moved.running,'Game unexpectedly paused during combined input');
      if(action==='jump'){assert(data.activated.vy>0);assert(data.moved.position.y>data.before.position.y,'Jump physics did not advance')}
      else {assert(data.activated.dashUntil>data.activated.runTime);assert(data.activated.dashReadyAt>data.activated.runTime+3)}
      assert.deepEqual(data.released.keys,[]);assert.deepEqual(data.released.pointerDirs,[]);
      details.push({name:'simulated Forward + '+action,method:'SYNTHETIC_TOUCH_POINTER_EVENTS_NOT_PHYSICAL_MULTITOUCH',...data});
    }
    await fresh();
    const paused=await frame.evaluate(async()=>{
      function send(sel,type,id,primary){const el=document.querySelector(sel),r=el.getBoundingClientRect();if(el.disabled||document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)!==el)throw Error('Pause input target obstructed');const e=new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:id,isPrimary:primary,button:0,buttons:type==='pointerdown'?1:0,clientX:r.x+r.width/2,clientY:r.y+r.height/2});el.dispatchEvent(e);return {type,target:sel,isTrusted:e.isTrusted}}
      const events=[];events.push(send('[data-dir="forward"]','pointerdown',201,true));
      const held=__controlsQA.state();events.push(send('#pause','pointerdown',202,false));
      const immediate=__controlsQA.state();
      await new Promise(r=>setTimeout(r,180));
      const still=__controlsQA.state();
      events.push(send('#pause','pointerup',202,false));events.push(send('[data-dir="forward"]','pointerup',201,true));
      return {held,immediate,still,released:__controlsQA.state(),events};
    });
    assert(paused.held.keys.includes('forward'));assert(paused.immediate.onGround);
    assert.equal(paused.immediate.running,false);assert.deepEqual(paused.immediate.keys,[]);
    assert.deepEqual(paused.immediate.position,paused.still.position);assert.equal(paused.immediate.runTime,paused.still.runTime);
    await frame.locator('#startRun').tap();
    const resumed=await frame.evaluate(async()=>{const before=__controlsQA.state();for(let i=0;i<4;i++)await new Promise(requestAnimationFrame);return {before,after:__controlsQA.state()}});
    assert(resumed.after.running);assert(resumed.after.runTime>resumed.before.runTime);
    assert.equal(resumed.after.position.x,paused.immediate.position.x);assert.equal(resumed.after.position.z,paused.immediate.position.z);
    assert.deepEqual(resumed.after.keys,[]);assert.deepEqual(resumed.after.pointerDirs,[]);
    details.push({name:'simulated Forward + secondary Pause; native Resume',method:'SYNTHETIC_MULTI_POINTER_THEN_BROWSER_TAP',paused,resumed});
    await fresh();await frame.locator('#dash').tap();
    const nativeDash=await frame.evaluate(()=>__controlsQA.state());
    assert(nativeDash.dashReadyAt>0);assert.equal(await frame.locator('#dash').isDisabled(),true);
    details.push({name:'native browser touchscreen Dash tap',state:nativeDash});
    await frame.locator('#reset').tap();
    row.controls??=[];row.controls.push({stage,details});
    check(stage+': combined movement/Jump/Dash, secondary Pause, clean Resume; multi-pointer events explicitly synthetic');
  };
  const start=async()=>""")
replace_once("check('Synthetic GLB delivered locally with identical bytes');", "check('Synthetic GLB delivered locally with identical bytes');await controls('lava');")
replace_once("check('Next retains goal, mode and identical character bytes/geometry');", "check('Next retains goal, mode and identical character bytes/geometry');await controls('storm');")
replace_once("method:'Real Chromium/WebKit with native touch UI and a synthetic triangle GLB, not private V4.1. Test-only end-state setup is inserted into local module responses. No physical-device or child acceptance.'", "method:'WebKit only, real browser/physics, browser taps plus explicitly synthetic simultaneous touch-pointer events. Read-only control probes; test-assisted terminal-state setup for flow and guide edge cases. Synthetic triangle GLB, not private V4.1. No physical iPad or Safari device acceptance.'")
Path('evidence').mkdir(exist_ok=True)
Path('evidence/webkit-runtime.cjs').write_text(src)
Path('evidence/harness-source.json').write_text(json.dumps({'sourceArtifact':13359989525,'sourceRun':41907395042,'sourceSHA256':hashlib.sha256(Path('previous/runtime-test.cjs').read_bytes()).hexdigest(),'adaptedSHA256':hashlib.sha256(src.encode()).hexdigest()},indent=2))
print('Prepared WebKit-only tests; application files untouched.')
