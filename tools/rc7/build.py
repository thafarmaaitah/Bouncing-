from pathlib import Path
import hashlib,json,re
src=Path('review/v29-rc6');dst=Path('review/v29-rc7')
assert src.is_dir() and not dst.exists()
dst.mkdir(parents=True)
def replace_once(s,a,b):
 assert s.count(a)==1,(a,s.count(a))
 return s.replace(a,b,1)
for p in src.iterdir():
 if p.name=='REVIEW.md':continue
 name=p.name.replace('rc6','rc7')
 text=p.read_text().replace('RC6','RC7').replace('rc6','rc7')
 (dst/name).write_text(text)
# No persistence, no network and no player-state mutations in target selection.
(dst/'guide.js').write_text('''// Direction hint only, not a collision, jump or safety guarantee.
export function guideIndex(anchor,missing,finish=11,branch=12,branchOrigin=5){
 if(!Number.isInteger(anchor)||anchor<0||anchor>branch)return -1;
 if(anchor===branch)return branchOrigin;
 const earlier=missing.filter(i=>Number.isInteger(i)&&i>=0&&i<=finish&&i<=anchor).sort((a,b)=>a-b);
 if(earlier.length)return earlier[0]===anchor?anchor:Math.max(0,anchor-1);
 return Math.min(finish,anchor+1);
}
''')
css='''/* Version-local guide; no animation, no change to movement controls. */
.guideChoice{display:flex;align-items:center;justify-content:center;gap:10px;min-height:48px;padding:6px 12px;border:1px solid #b7eaff;border-radius:12px;cursor:pointer;font-size:15px;max-width:100%;box-sizing:border-box}
.guideChoice input{width:24px;height:24px;min-width:24px;margin:0;accent-color:#7be9ff}
#guideStatus,#guideSuggestion{max-width:34em;font-size:12px;line-height:1.3}
#guideSuggestion{color:#fff4a1;font-weight:700}
@media(max-height:500px) and (orientation:landscape){#readyOverlay{padding:8px 12px;align-items:stretch;justify-content:flex-start}#readyOverlay section{margin:auto;min-height:min-content;gap:5px}#readyOverlay .avatarNote{display:none}#guideStatus{font-size:11px}}
'''
(dst/'guide-rc7.css').write_text(css)
ui='''<p id="guideSuggestion" hidden>Several setbacks? You can turn on the optional path guide below.</p><label class="guideChoice" for="guideToggle"><input id="guideToggle" type="checkbox">Show next platform</label><p id="guideStatus" role="status">Optional guide. You still jump and avoid hazards. Guided attempts earn Star explorer, not Clean run, Time finisher or best times.</p>'''
logic='''
// Optional path guide: only observes route state. No automatic movement or jump.
const guideToggle=document.getElementById('guideToggle');
let guideEnabled=false,attemptAssisted=false,guideAnchor=0,guideTarget=-1,guideCheckpoint=3,guideFailures=0;
const guideGroup=new THREE.Group();guideGroup.visible=false;scene.add(guideGroup);
const guideRing=new THREE.Mesh(new THREE.RingGeometry(.60,.76,24),new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide,depthWrite:false}));
guideRing.rotation.x=-Math.PI/2;guideGroup.add(guideRing);
const guideArrow=new THREE.Mesh(new THREE.ConeGeometry(.16,.35,4),new THREE.MeshBasicMaterial({color:'#fff06a'}));
guideArrow.rotation.z=Math.PI;guideArrow.position.y=.40;guideGroup.add(guideArrow);
function refreshGuideStatus(){
 document.getElementById('guideStatus').textContent=attemptAssisted?'Guided attempt: Star explorer is available. Clean run, Time finisher and best times require a new attempt with the guide off.':guideEnabled?'Guide selected. This attempt will be guided; you still jump and avoid hazards.':'Optional guide. You still jump and avoid hazards. Guided attempts earn Star explorer, not Clean run, Time finisher or best times.';
 document.getElementById('guideSuggestion').hidden=guideEnabled||guideFailures<3;
}
function useGuide(){if(guideEnabled){attemptAssisted=true;runEligible=false}refreshGuideStatus()}
function updateGuide(){
 if(onGround&&landedPlatform){const i=platforms.indexOf(landedPlatform);if(i>=0)guideAnchor=i}
 if(checkpointZ!==guideCheckpoint){guideCheckpoint=checkpointZ;guideFailures=0;refreshGuideStatus()}
 guideGroup.visible=false;guideTarget=-1;
 if(!guideEnabled||won||contextLost)return;
 const missing=stars.filter(s=>s.mesh.visible).map(s=>platforms.indexOf(s.platform));
 guideTarget=guideIndex(guideAnchor,missing);
 const p=platforms[guideTarget];
 if(!p||!p.mesh.visible)return;
 guideGroup.position.set(p.x,.05,p.z);guideGroup.visible=true;
}
guideToggle.addEventListener('change',()=>{
 if(won)return;
 guideEnabled=guideToggle.checked;
 if(hasStarted&&guideEnabled)useGuide();
 refreshGuideStatus();updateGuide();
 if(!contextLost)renderer.render(scene,camera);
});
function resetGuideAttempt(){attemptAssisted=false;guideAnchor=0;guideFailures=0;guideCheckpoint=3;guideTarget=-1;guideGroup.visible=false;refreshGuideStatus()}
function noteGuideSetback(){
 if(guideCheckpoint!==checkpointZ){guideCheckpoint=checkpointZ;guideFailures=0}
 guideFailures++;refreshGuideStatus();
}
'''
for stage in ['lava','storm']:
 p=dst/(stage+'-v29-candidate.html');s=p.read_text()
 s=replace_once(s,'<link rel="stylesheet" href="./goals-rc7.css">','<link rel="stylesheet" href="./goals-rc7.css"><link rel="stylesheet" href="./guide-rc7.css">')
 s=replace_once(s,'<p id="goalReady" class="goalNote"></p>','<p id="goalReady" class="goalNote"></p>'+ui)
 p.write_text(s)
 p=dst/(stage+'-rc7.js');s=p.read_text()
 s="import {guideIndex} from './guide.js';\n"+s
 s=replace_once(s,'let attemptSetbacks=0,attemptRetries=0;','let attemptSetbacks=0,attemptRetries=0;\n'+logic)
 s=replace_once(s,'if(contextLost||won||sessionPending)return;','if(contextLost||won||sessionPending)return;\n useGuide();')
 s=replace_once(s,"running=false;clearInput();cancelDash();jumpBuffer=0;", "running=false;guideGroup.visible=false;clearInput();cancelDash();jumpBuffer=0;")
 s=replace_once(s,'challenge:challengeMode,eligible:runEligible','challenge:challengeMode,eligible:runEligible,assisted:attemptAssisted')
 s=replace_once(s,"const achieved=attemptGoal==='explorer'||(attemptSetbacks===0&&attemptRetries===0);","const achieved=attemptGoal==='explorer'||(!attemptAssisted&&attemptSetbacks===0&&attemptRetries===0);")
 s=replace_once(s,"sessionSend({type:'progress-updated'});", "if(attemptAssisted)goalLine.textContent='Guided completion! Star explorer is available. Turn the guide off for a fresh Clean run or Time Challenge record.';\n  sessionSend({type:'progress-updated'});")
 s=replace_once(s,"function reset(){attemptSetbacks=0;", "function reset(){resetGuideAttempt();attemptSetbacks=0;")
 s=replace_once(s,' attemptSetbacks++;',' attemptSetbacks++;noteGuideSetback();')
 needle="msg.textContent=shielded?'🛡️ Shield saved you — checkpoint restored!':reason+' — back to checkpoint!';"
 s=replace_once(s,needle,needle+"\n if(guideFailures>=3&&!guideEnabled)msg.textContent='Need a hand? Pause, then choose Show next platform. Your earned badges stay yours.';")
 s=replace_once(s,"const medal=!challengeMode?'PRACTICE':","const medal=attemptAssisted?'GUIDED':!challengeMode?'PRACTICE':")
 s=replace_once(s,"showResult('complete');", "if(attemptAssisted)msg.textContent='Guided run complete! No best-time record is saved for this attempt.';showResult('complete');")
 s=replace_once(s,'const follow=new THREE.Vector3','updateGuide();\nconst follow=new THREE.Vector3')
 # Ensure private-model implementation and movement formulas remain identical.
 old=(src/(stage+'-rc6.js')).read_text()
 a=old[old.index('async function loadApprovedFile'):old.index('const keys=new Set')]
 b=s[s.index('async function loadApprovedFile'):s.index('const keys=new Set')]
 assert a.replace('rc6','rc7')==b
 for line in old.splitlines():
  if line.startswith('if(!won){const travelSpeed=') or line.startswith('function dash()') or line.startswith('if(!onGround&&!won){vy-='):
   assert line.replace('rc6','rc7').replace('RC6','RC7') in s
 p.write_text(s)
p=dst/'progress.js';s=p.read_text();s=replace_once(s,'clean:run.setbacks===0&&run.retries===0,time:run.challenge===true&&run.eligible===true','clean:run.assisted!==true&&run.setbacks===0&&run.retries===0,time:run.assisted!==true&&run.challenge===true&&run.eligible===true');p.write_text(s)
p=dst/'index.html';s=p.read_text();s=s.replace('</main>','<p class="note">New: optional Show next platform on each stage’s Start / Pause screen. It guides your route, not your jump. Guided attempts earn Star explorer only; no best-time record. The guide starts off in each new stage and is not stored.</p></main>');p.write_text(s)
for n in ['local-model.js','controls-ipad-rc3.css']:
 assert (src/n).read_bytes()==(dst/n).read_bytes()
h={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in dst.iterdir()}
Path('rc7-payload-hashes.json').write_text(json.dumps(h,indent=2))
print(json.dumps({'addedFiles':len(h),'physicsAndModelPreserved':True}))
