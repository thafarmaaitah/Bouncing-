#!/usr/bin/env python3
"""Derive RC4 from frozen RC3; no source rewrites outside review/v29-rc4."""
from pathlib import Path
import re, sys, hashlib, json
root=Path(sys.argv[1]).resolve()
source=root/'review/v29-rc3'; dest=root/'review/v29-rc4'; dest.mkdir(parents=True,exist_ok=False)
expected={'lava':'1164a92846c9d98119a96bc148ec373824a2e866808f45a6d6fcd3a6f0163674','storm':'c6586f6bf80cd1bd506d8d8e42eff0b9c12d047eea6bb0c9f635eeb2389c31b0'}
def once(s,old,new):
    assert s.count(old)==1, (old[:90],s.count(old))
    return s.replace(old,new,1)
markup='''<div id="resultOverlay" hidden role="dialog" aria-modal="true" aria-labelledby="resultTitle" aria-describedby="resultSummary">
<section class="resultCard"><div id="resultSymbol" aria-hidden="true">★</div><h2 id="resultTitle"></h2><p id="resultSummary"></p><p id="resultRecord"></p>
<div class="resultActions"><button id="resultNext" type="button">Next: Storm Circuit →</button><button id="resultReplay" type="button">Play again</button><button id="resultRetry" type="button">Retry checkpoint</button><button id="resultHub" type="button">Choose stage</button></div>
<p id="resultModelNote">Your V4.1 stays on this device. Select the same file again after changing stages.</p></section></div>
<div id="missingStars" hidden role="status"></div>
'''
controller='''
// RC4: terminal outcomes are distinct from Pause; existing physics and character loader are retained.
const resultOverlay=document.getElementById('resultOverlay');
const resultNext=document.getElementById('resultNext'),resultReplay=document.getElementById('resultReplay'),resultRetry=document.getElementById('resultRetry'),resultHub=document.getElementById('resultHub');
const missingStars=document.getElementById('missingStars');
let resultNavigating=false;
function hideResult(){
 if(resultOverlay.contains(document.activeElement))document.activeElement.blur();
 resultOverlay.hidden=true;missingStars.hidden=true;resultNavigating=false;
 document.querySelectorAll('#pad button,#jump').forEach(b=>b.disabled=false);
}
function startGame(){
 if(contextLost||won)return;
 running=true;hasStarted=true;lastFrame=performance.now();accumulator=0;clearInput();
 readyOverlay.hidden=true;pauseButton.disabled=false;
 msg.textContent=challengeMode?'Time Challenge — collect five stars and finish!':'Practice — try a jump, then follow the stars!';
}
function showResult(kind){
 if(!resultOverlay.hidden)return;
 running=false;clearInput();cancelDash();jumpBuffer=0;coyote=0;lastFrame=null;accumulator=0;
 readyOverlay.hidden=true;missingStars.hidden=true;pauseButton.disabled=true;
 document.querySelectorAll('#pad button,#jump,#dash').forEach(b=>b.disabled=true);
 const success=kind==='complete';
 resultOverlay.dataset.outcome=kind;
 document.getElementById('resultSymbol').textContent=success?'★':'↻';
 document.getElementById('resultTitle').textContent=success?'__STAGE__ complete!':'Try again!';
 document.getElementById('resultSummary').textContent=success?(challengeMode?'Time Challenge':'Practice')+' · '+score+'/5 stars · '+runTime.toFixed(1)+'s':'No lives left. Return to your checkpoint or start a fresh attempt.';
 document.getElementById('resultRecord').textContent=success?msg.textContent:'Checkpoint retry is practice only; Play again starts a new eligible Time Challenge.';
 resultNext.hidden=!success||'__ID__'!=='lava';resultRetry.hidden=success;
 document.getElementById('resultModelNote').hidden=!approvedModel;
 resultOverlay.hidden=false;
 (success?(' __ID__'.trim()==='lava'?resultNext:resultReplay):resultRetry).focus({preventScroll:true});
}
function leaveResult(file){
 if(resultOverlay.hidden||resultNavigating||contextLost)return;
 resultNavigating=true;clearInput();cancelDash();
 const url=new URL(file,location.href);url.searchParams.set('mode',challengeMode?'challenge':'practice');
 location.assign(url.href);
}
resultNext.addEventListener('click',()=>{if(resultOverlay.dataset.outcome==='complete')leaveResult('./storm-v29-candidate.html')});
resultHub.addEventListener('click',()=>leaveResult('./index.html'));
resultReplay.addEventListener('click',()=>{if(resultOverlay.hidden||resultNavigating||contextLost)return;reset();startGame()});
resultRetry.addEventListener('click',()=>{if(resultOverlay.hidden||resultNavigating||contextLost)return;retryCheckpoint();startGame()});
// Keep keyboard navigation inside the visible result panel; no gameplay shortcuts behind it.
resultOverlay.addEventListener('keydown',e=>{
 if(e.key==='Tab'){
  const buttons=[...resultOverlay.querySelectorAll('button')].filter(b=>!b.hidden&&!b.disabled);
  const first=buttons[0],last=buttons[buttons.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }
 e.stopPropagation();
});
'''
css='''/* RC4 outcome flow only. RC3 tablet-control geometry is retained verbatim. */
#resultOverlay{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));background:#101b42e8;touch-action:manipulation}
#resultOverlay .resultCard{box-sizing:border-box;width:min(560px,100%);max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);overflow:auto;padding:24px;border:2px solid #f9da78;border-radius:24px;background:#1f3264;text-align:center;box-shadow:0 20px 70px #0007}
#resultSymbol{font-size:42px;color:#ffe184;line-height:1}#resultTitle{font-size:clamp(24px,5vw,34px);margin:10px 0}#resultSummary{font-size:18px;line-height:1.45;margin:12px 0}#resultRecord{font-size:14px;line-height:1.4;color:#c9f2ff;margin:10px 0 18px}
.resultActions{display:grid;grid-template-columns:1fr 1fr;gap:12px}#resultOverlay button{min-height:64px;min-width:0;padding:12px;font-size:18px;line-height:1.3;border-radius:16px;touch-action:manipulation;white-space:normal}#resultNext{grid-column:1/-1;background:#ffe08a;color:#192951;border-color:#ffe08a}#resultReplay{background:#7543ba}#resultRetry{grid-column:1/-1;background:#287f7a}#resultModelNote{font-size:12px;color:#dae6ff;line-height:1.4;margin-bottom:0}
#missingStars{position:absolute;left:50%;top:76px;transform:translateX(-50%);z-index:6;max-width:calc(100% - 28px);padding:10px 16px;border-radius:14px;background:#ffe08a;color:#152444;font-size:18px;font-weight:800;text-align:center;pointer-events:none}
@media(max-height:500px){#resultOverlay .resultCard{padding:14px}#resultSymbol{font-size:24px}#resultTitle{font-size:24px;margin:5px 0}#resultSummary{margin:5px 0;font-size:15px}#resultRecord{margin:5px 0 8px;font-size:12px}#resultOverlay button{min-height:52px;font-size:16px;padding:9px}.resultActions{gap:8px}#missingStars{top:44px;font-size:14px}}
'''
for stage in ['lava','storm']:
    name=f'{stage}-v29-candidate.html'; old=(source/name).read_text();assert hashlib.sha256(old.encode()).hexdigest()==expected[stage]
    s=old.replace('V29 RC3','V29 RC4')
    s=once(s,'</head>','<link rel="stylesheet" href="./result-flow-rc4.css"></head>')
    s=once(s,'<div id="bootError"',markup+'<div id="bootError"')
    label='Lava Rush' if stage=='lava' else 'Storm Circuit'
    s=once(s,"function pauseGame(message='Paused — tap Resume when you are ready.')",controller.replace('__ID__',stage).replace('__STAGE__',label)+"function pauseGame(message='Paused — tap Resume when you are ready.')")
    s=once(s,"function pauseGame(message='Paused — tap Resume when you are ready.'){","function pauseGame(message='Paused — tap Resume when you are ready.'){\n if(won){clearInput();return}")
    old_start="startRun.addEventListener('click',()=>{if(contextLost)return;running=true;hasStarted=true;lastFrame=performance.now();accumulator=0;clearInput();readyOverlay.hidden=true;pauseButton.disabled=false;msg.textContent=challengeMode?'Time Challenge — collect five stars and finish!':'Practice — try a jump, then follow the stars!'});"
    s=once(s,old_start,"startRun.addEventListener('click',startGame);")
    s=once(s,"function reset(){accumulator=0;","function reset(){hideResult();accumulator=0;")
    s=once(s,"function retryCheckpoint(){\n clearInput();cancelDash(true);","function retryCheckpoint(){\n hideResult();clearInput();cancelDash(true);")
    s=once(s,"msg.textContent='Game over — tap Retry checkpoint or Restart';return","msg.textContent='Game over — tap Retry checkpoint or Restart';showResult('gameover');return")
    s=once(s,"if(score<5&&onGround&&Math.abs(player.position.z-finish.z)<1.1", "missingStars.hidden=!(score<5&&onGround&&Math.abs(player.position.z-finish.z)<1.1&&Math.abs(player.position.x-finish.x)<1.5&&!won);\nif(!missingStars.hidden)missingStars.textContent='Find '+(5-score)+' more star'+(5-score===1?'':'s')+' — you can still move back!';\nif(score<5&&onGround&&Math.abs(player.position.z-finish.z)<1.1")
    s=once(s,"'🎉 Practice complete! Try Time Challenge next.'}}","'🎉 Practice complete! Try Time Challenge next.'}showResult('complete');}")
    s=s.replace('BestV29Review','BestV29RC4Review')
    init="""const requestedMode=new URLSearchParams(location.search).get('mode');
if(requestedMode==='challenge'){modeSelect.value='challenge';modeSelect.dispatchEvent(new Event('change'))}
"""
    s=once(s,'resize();renderer.render(scene,camera);window.skyRushBoot.ready();requestAnimationFrame(loop);',init+'resize();renderer.render(scene,camera);window.skyRushBoot.ready();requestAnimationFrame(loop);')
    loader=lambda x:x[x.index("document.getElementById('approvedFile').addEventListener('change'"):x.index('const keys=new Set()')]
    assert loader(s)==loader(old)
    (dest/name).write_text(s)
(dest/'controls-ipad-rc3.css').write_bytes((source/'controls-ipad-rc3.css').read_bytes())
(dest/'result-flow-rc4.css').write_text(css)
hub=(source/'index.html').read_text().replace('V29 RC3','V29 RC4')
hub=re.sub(r'<p class="note">.*?</p>','<p class="note">RC4 review: clear finish and retry screens, one-tap replay, and Next: Storm Circuit. The two existing stages and large iPad controls are retained. Your private V4.1 file is never included or uploaded. Select it again locally after changing stages.</p>',hub,flags=re.S)
hub=re.sub(r'<p><small>Stage source:.*?</small></p>','<p><small>Derived from RC3. Public review only; not final device acceptance. Earlier versions remain unchanged.</small></p>',hub,flags=re.S)
hub=once(hub,'</body>',"<script>const mode=new URLSearchParams(location.search).get('mode');if(mode==='challenge'){document.querySelectorAll('a.play').forEach(a=>{const u=new URL(a.href);u.searchParams.set('mode','challenge');a.href=u.href})}</script></body>")
(dest/'index.html').write_text(hub)
print(json.dumps({str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in dest.iterdir()},indent=2))
