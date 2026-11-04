import {readProgress,countBadges,BADGES,GOALS,PROGRESS_KEY} from './progress.js';
(()=>{'use strict';
 const slot=document.getElementById('gameSlot'),hub=document.getElementById('hub'),mode=document.getElementById('sessionMode'),status=document.getElementById('sessionStatus'),end=document.getElementById('endSession'),privacy=document.getElementById('privacy');
 let frame=null,selectedFile=null;
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
 renderProgress();
 function showHub(){renderProgress();if(frame){frame.remove();frame=null}slot.hidden=true;hub.hidden=false;end.hidden=!selectedFile;status.textContent=selectedFile?'Character kept locally for this tab':'Single-player · No chat · No purchases';}
 function openStage(stage,requestedMode){
  if(!['lava','storm'].includes(stage))return;
  if(frame)frame.remove();
  mode.value=requestedMode==='challenge'?'challenge':'practice';
  frame=document.createElement('iframe');frame.title=stage==='lava'?'Lava Rush':'Storm Circuit';
  frame.allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; usb 'none'";
  frame.referrerPolicy='no-referrer';
  frame.src=new URL('./'+stage+'-v29-candidate.html?mode='+mode.value+'&goal='+chosenGoal(),location.href).href;
  slot.replaceChildren(frame);slot.hidden=false;hub.hidden=true;end.hidden=false;
  status.textContent=selectedFile?'Restoring your local character…':'Select your original character inside the stage';
 }
 document.querySelectorAll('[data-stage]').forEach(button=>button.addEventListener('click',()=>openStage(button.dataset.stage,mode.value)));
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||!frame||event.source!==frame.contentWindow||event.data?.channel!=='sky-rc6')return;
  const data=event.data;
  if(data.type==='ready'){frame.contentWindow.postMessage({channel:'sky-rc6',type:'restore-model',file:selectedFile},location.origin);status.textContent=selectedFile?'Character ready for this session':'Single-player · No chat · No purchases';}
  if(data.type==='remember-model'&&data.file instanceof Blob&&data.file.size>0&&data.file.size<=20*1024*1024){selectedFile=data.file;status.textContent='Character kept locally for this tab';}
  if(data.type==='progress-updated')renderProgress();
  if(data.type==='navigate'){
   if(!['practice','challenge'].includes(data.mode))return;
   mode.value=data.mode;
   if(data.stage==='hub')showHub();else if(data.stage==='storm')openStage('storm',data.mode);
  }
 });
 function clearSession(){selectedFile=null;showHub();document.getElementById('hubNote').textContent='Session ended. The app has released your selected file from memory. Progress and best times remain on this device.';}
 end.addEventListener('click',clearSession);
 window.addEventListener('pagehide',()=>{selectedFile=null;if(frame){frame.remove();frame=null}});
 window.addEventListener('pageshow',event=>{if(event.persisted)showHub()});
 document.getElementById('parentInfo').addEventListener('click',()=>{if(frame)frame.contentWindow.postMessage({channel:'sky-rc6',type:'pause'},location.origin);privacy.showModal()});
 document.getElementById('closePrivacy').addEventListener('click',()=>privacy.close());
 document.getElementById('clearRecords').addEventListener('click',()=>{
  if(!confirm('Delete this version’s progress and best times on this device? Earlier versions will not be changed.'))return;
  try{for(const key of ['skyRushLavaBestV29RC6Review','skyRushStormBestV29RC6Review',PROGRESS_KEY])localStorage.removeItem(key);document.getElementById('privacyStatus').textContent='RC6 progress and best times deleted. Earlier versions are unchanged.';clearSession();}
  catch{document.getElementById('privacyStatus').textContent='Browser storage is unavailable.';}
 });
})();