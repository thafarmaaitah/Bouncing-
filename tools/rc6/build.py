from pathlib import Path
import json, hashlib
src=Path('review/v29-rc5'); dst=Path('review/v29-rc6')
assert src.is_dir() and not dst.exists()
dst.mkdir()
for f in src.iterdir():
 if f.suffix in ('.js','.css','.html'):
  text=f.read_text()
  if f.suffix!='.css' and f.name!='local-model.js': text=text.replace('RC5','RC6').replace('rc5','rc6')
  (dst/f.name.replace('rc5','rc6')).write_text(text)
def patch(file,old,new):
 p=dst/file;t=p.read_text();assert t.count(old)==1,(file,old[:80],t.count(old));p.write_text(t.replace(old,new))
(dst/'progress.js').write_text(r'''// Local-only, bounded progress. No identifiers, dates, network calls or currency.
export const PROGRESS_KEY='skyRushProgressV29RC6Review';
export const BADGES=Object.freeze({explorer:'Star explorer',clean:'Clean run',time:'Time finisher'});
export const GOALS=Object.freeze({explorer:'Collect all five stars and finish.',clean:'Finish without a fall, obstacle hit or checkpoint retry.'});
export function emptyProgress(){return {version:1,lava:{explorer:false,clean:false,time:false},storm:{explorer:false,clean:false,time:false}}}
export function readProgress(){
 const value=emptyProgress();let stored=true;
 try{const raw=localStorage.getItem(PROGRESS_KEY);if(raw){const parsed=JSON.parse(raw);if(parsed?.version===1)for(const s of ['lava','storm'])for(const b of Object.keys(BADGES))value[s][b]=parsed[s]?.[b]===true;}}
 catch{stored=false}
 return {value,stored};
}
export function recordCompletion(stage,run){
 const state=readProgress(),earned=[];
 if(!['lava','storm'].includes(stage)||!run||run.score!==5||run.complete!==true||!Number.isFinite(run.seconds)||run.seconds<=0||!Number.isInteger(run.setbacks)||run.setbacks<0||!Number.isInteger(run.retries)||run.retries<0)return {...state,earned,valid:false};
 const qualifies={explorer:true,clean:run.setbacks===0&&run.retries===0,time:run.challenge===true&&run.eligible===true};
 for(const key of Object.keys(BADGES))if(qualifies[key]&&!state.value[stage][key]){state.value[stage][key]=true;earned.push(key)}
 let stored=true;try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(state.value))}catch{stored=false}
 return {value:state.value,stored,earned,valid:true};
}
export function countBadges(value){return ['lava','storm'].reduce((n,s)=>n+Object.keys(BADGES).filter(k=>value[s][k]).length,0)}
''')
(dst/'goals-rc6.css').write_text('''/* RC6 adds goals and progress UI, never gameplay physics. */
#hub{flex:1;min-height:0;margin:0 auto;padding-top:18px;padding-bottom:32px}#hub h1{font-size:clamp(28px,4vw,46px);margin-bottom:10px}.stages{margin:16px 0}.stage{min-height:150px}.goals{border:0;padding:0;margin:18px 0 8px}.goals legend{font-weight:800;margin-bottom:8px}.goalChoices{display:flex;flex-wrap:wrap;gap:10px}.goalChoice{display:flex;align-items:center;gap:9px;min-height:48px;border:1px solid #7b91c0;border-radius:12px;padding:8px 14px;background:#1d3159;cursor:pointer}.goalChoice input{width:20px;height:20px;accent-color:#ffe878}.goalChoice:has(input:checked){border-color:#ffe878;background:#354367}.goalChoice:focus-within{outline:3px solid #ffe878}.goalExplanation{font-size:13px;color:#d2e4f8;margin:8px 0}.progressBoard{border-top:1px solid #49658a;padding-top:14px}.progressBoard h2{font-size:21px;margin:0 0 8px}.progressGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.islandCard{border:1px solid #5b729d;border-radius:16px;padding:12px;background:#192c50}.islandCard.powered{border-color:#73e6ba;background:#203e52}.islandName{font-weight:800}.islandState{font-size:12px;color:#bed8ed;margin:3px 0 9px}.badges{display:flex;flex-wrap:wrap;gap:6px}.badge{font-size:12px;border:1px solid #5f759b;padding:5px 8px;border-radius:10px;color:#c5d3e9}.badge.earned{background:#36502f;border-color:#b5e87e;color:#f0ffd7}#progressNote{font-size:12px;color:#c1d4ed}.goalNote{font-size:13px;color:#d8f5ff;line-height:1.35;max-width:42em}.resultAchievements{font-size:14px;line-height:1.4;padding:8px 12px;background:#263e59;border:1px solid #6688ac;border-radius:12px}.resultAchievements:empty{display:none}#resultGoal{font-weight:700;font-size:14px}#resultOverlay .resultCard{max-height:calc(100dvh - 24px);overflow:auto}@media(max-width:480px){.progressGrid{grid-template-columns:1fr}.goalChoice{flex:1;padding:8px;font-size:14px}#hub .stage{min-height:150px}.goalNote{font-size:12px}}@media(max-height:500px){#hub h1{font-size:28px}.goals{margin:10px 0}.resultAchievements{font-size:12px;padding:5px 8px}.goalNote{font-size:11px}}
''')
for file in ['index.html','lava-v29-candidate.html','storm-v29-candidate.html']:
 patch(file,'</head>','<link rel="stylesheet" href="./goals-rc6.css"></head>')
patch('index.html','<p>Two familiar islands. Five stars in each. Play at your pace.</p>','<p>Restore the light to two islands. Five stars in each. Play at your pace.</p>')
patch('index.html','<div class="stages">','''<fieldset class="goals"><legend>Choose your goal</legend><div class="goalChoices"><label class="goalChoice"><input type="radio" name="goal" value="explorer" checked>★ Star explorer</label><label class="goalChoice"><input type="radio" name="goal" value="clean">◇ Clean run</label></div><p id="goalHelp" class="goalExplanation">Collect all five stars and finish.</p></fieldset><div class="stages">''')
patch('index.html','<p id="hubNote">','''<section class="progressBoard" aria-labelledby="progressTitle"><h2 id="progressTitle">Your islands · <span id="badgeCount">0 / 6</span> badges</h2><div id="progressGrid" class="progressGrid"></div><p id="progressNote">Saved on this device. No daily streaks, purchases or lost rewards for taking a break.</p></section><p id="hubNote">''')
patch('index.html','<script src="./session.js" defer>','<script type="module" src="./session.js">')
patch('index.html','Best times for this version are stored on this device.','Best times and six earned-badge flags for this version are stored on this device. No names, profiles, dates or character files are stored with progress.')
patch('index.html','Delete RC6 best times','Delete RC6 progress and best times')
patch('session.js',"(()=>{'use strict';","import {readProgress,countBadges,BADGES,GOALS,PROGRESS_KEY} from './progress.js';\n(()=>{'use strict';")
patch('session.js',"let frame=null,selectedFile=null;",'''let frame=null,selectedFile=null;
 function chosenGoal(){return document.querySelector('input[name="goal"]:checked')?.value==='clean'?'clean':'explorer'}
 function renderProgress(){
  const {value,stored}=readProgress();document.getElementById('badgeCount').textContent=countBadges(value)+' / 6';
  const grid=document.getElementById('progressGrid');grid.replaceChildren();
  for(const [stage,name] of [['lava','Lava Rush'],['storm','Storm Circuit']]){
   const card=document.createElement('div');card.className='islandCard'+(value[stage].explorer?' powered':'');card.dataset.progressStage=stage;
   const title=document.createElement('div');title.className='islandName';title.textContent=(value[stage].explorer?'★ ':'☆ ')+name;
   const line=document.createElement('div');line.className='islandState';line.textContent=value[stage].explorer?'Island powered!':'Collect five stars and finish to light this island.';
   const badges=document.createElement('div');badges.className='badges';
   for(const [key,label] of Object.entries(BADGES)){const b=document.createElement('span');b.className='badge'+(value[stage][key]?' earned':'');b.dataset.badge=key;b.textContent=(value[stage][key]?'✓ ':'○ ')+label;badges.append(b)}
   card.append(title,line,badges);grid.append(card);
  }
  document.getElementById('progressNote').textContent=stored?'Saved on this device. No daily streaks, purchases or lost rewards for taking a break.':'Progress cannot be read from this browser. You can still play; saved badges may be unavailable.';
 }
 document.querySelectorAll('input[name="goal"]').forEach(input=>input.addEventListener('change',()=>{document.getElementById('goalHelp').textContent=GOALS[chosenGoal()]}));
 renderProgress();''')
patch('session.js','function showHub(){','function showHub(){renderProgress();')
patch('session.js',"'-v29-candidate.html?mode='+mode.value","'-v29-candidate.html?mode='+mode.value+'&goal='+chosenGoal()")
patch('session.js',"if(data.type==='navigate'){","if(data.type==='progress-updated')renderProgress();\n  if(data.type==='navigate'){")
patch('session.js','Best times remain on this device.','Progress and best times remain on this device.')
patch('session.js','Delete this version’s best times on this device? Earlier versions will not be changed.','Delete this version’s progress and best times on this device? Earlier versions will not be changed.')
patch('session.js',"['skyRushLavaBestV29RC6Review','skyRushStormBestV29RC6Review']","['skyRushLavaBestV29RC6Review','skyRushStormBestV29RC6Review',PROGRESS_KEY]")
patch('session.js','RC6 records deleted. Earlier versions are unchanged.','RC6 progress and best times deleted. Earlier versions are unchanged.')
for stage in ['lava','storm']:
 name=stage+'-rc6.js';html=stage+'-v29-candidate.html'
 p=dst/name;t=p.read_text();p.write_text("import {recordCompletion,BADGES,GOALS} from './progress.js';\n"+t)
 patch(html,'<button id="startRun"','<p id="goalReady" class="goalNote"></p><button id="startRun"')
 patch(html,'<p id="resultRecord"','<p id="resultGoal"></p><p id="resultAchievements" class="resultAchievements" role="status"></p><p id="resultRecord"')
 patch(name,"let resultNavigating=false;",'''const attemptGoal=new URLSearchParams(location.search).get('goal')==='clean'?'clean':'explorer';
let attemptSetbacks=0,attemptRetries=0;
document.getElementById('goalReady').textContent='Goal: '+GOALS[attemptGoal];
let resultNavigating=false;''')
 patch(name,'function reset(){hideResult();','function reset(){attemptSetbacks=0;attemptRetries=0;hideResult();')
 patch(name,"if(!hasStarted){reset();return}\n if(challengeMode)runEligible=false;","if(!hasStarted){reset();return}\n attemptRetries++;\n if(challengeMode)runEligible=false;")
 patch(name,'function respawn(reason){\n if(won)return;','function respawn(reason){\n if(won)return;\n attemptSetbacks++;')
 patch(name,"const success=kind==='complete';",f'''const success=kind==='complete';
 const goalLine=document.getElementById('resultGoal'),badgeLine=document.getElementById('resultAchievements');
 badgeLine.textContent='';goalLine.textContent='Your earned badges stay yours. Try again when you are ready.';
 if(success){{
  const outcome=recordCompletion('{stage}',{{complete:won&&lives>0,score,seconds:runTime,setbacks:attemptSetbacks,retries:attemptRetries,challenge:challengeMode,eligible:runEligible}});
  const achieved=attemptGoal==='explorer'||(attemptSetbacks===0&&attemptRetries===0);
  goalLine.textContent=achieved?'Goal complete! '+(attemptGoal==='clean'?'Clean run':'Star explorer'):'Stage complete! Clean run is still available to try another time.';
  badgeLine.textContent=(outcome.earned.length?'New badges: '+outcome.earned.map(k=>BADGES[k]).join(' · '):'Your island is powered. Earned badges are kept.')+(outcome.stored?' · Saved on this device.':' · Could not save progress. This result is visible for this attempt only.');
  sessionSend({{type:'progress-updated'}});
 }}''')
 patch(name,"url.searchParams.set('mode',challengeMode?'challenge':'practice');","url.searchParams.set('mode',challengeMode?'challenge':'practice');url.searchParams.set('goal',attemptGoal);")
assert (dst/'local-model.js').read_bytes()==(src/'local-model.js').read_bytes()
assert (dst/'controls-ipad-rc3.css').read_bytes()==(src/'controls-ipad-rc3.css').read_bytes()
manifest={str(f):hashlib.sha256(f.read_bytes()).hexdigest() for f in dst.iterdir()}
Path('rc6-payload-hashes.json').write_text(json.dumps(manifest,indent=2))
print('RC6 files:',len(manifest))
