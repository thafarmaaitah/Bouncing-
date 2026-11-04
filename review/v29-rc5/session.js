(()=>{'use strict';
 const slot=document.getElementById('gameSlot'),hub=document.getElementById('hub'),mode=document.getElementById('sessionMode'),status=document.getElementById('sessionStatus'),end=document.getElementById('endSession'),privacy=document.getElementById('privacy');
 let frame=null,selectedFile=null;
 function showHub(){if(frame){frame.remove();frame=null}slot.hidden=true;hub.hidden=false;end.hidden=!selectedFile;status.textContent=selectedFile?'Character kept locally for this tab':'Single-player · No chat · No purchases';}
 function openStage(stage,requestedMode){
  if(!['lava','storm'].includes(stage))return;
  if(frame)frame.remove();
  mode.value=requestedMode==='challenge'?'challenge':'practice';
  frame=document.createElement('iframe');frame.title=stage==='lava'?'Lava Rush':'Storm Circuit';
  frame.allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; usb 'none'";
  frame.referrerPolicy='no-referrer';
  frame.src=new URL('./'+stage+'-v29-candidate.html?mode='+mode.value,location.href).href;
  slot.replaceChildren(frame);slot.hidden=false;hub.hidden=true;end.hidden=false;
  status.textContent=selectedFile?'Restoring your local character…':'Select your original character inside the stage';
 }
 document.querySelectorAll('[data-stage]').forEach(button=>button.addEventListener('click',()=>openStage(button.dataset.stage,mode.value)));
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||!frame||event.source!==frame.contentWindow||event.data?.channel!=='sky-rc5')return;
  const data=event.data;
  if(data.type==='ready'){frame.contentWindow.postMessage({channel:'sky-rc5',type:'restore-model',file:selectedFile},location.origin);status.textContent=selectedFile?'Character ready for this session':'Single-player · No chat · No purchases';}
  if(data.type==='remember-model'&&data.file instanceof Blob&&data.file.size>0&&data.file.size<=20*1024*1024){selectedFile=data.file;status.textContent='Character kept locally for this tab';}
  if(data.type==='navigate'){
   if(!['practice','challenge'].includes(data.mode))return;
   mode.value=data.mode;
   if(data.stage==='hub')showHub();else if(data.stage==='storm')openStage('storm',data.mode);
  }
 });
 function clearSession(){selectedFile=null;showHub();document.getElementById('hubNote').textContent='Session ended. The app has released your selected file from memory. Best times remain on this device.';}
 end.addEventListener('click',clearSession);
 window.addEventListener('pagehide',()=>{selectedFile=null;if(frame){frame.remove();frame=null}});
 window.addEventListener('pageshow',event=>{if(event.persisted)showHub()});
 document.getElementById('parentInfo').addEventListener('click',()=>{if(frame)frame.contentWindow.postMessage({channel:'sky-rc5',type:'pause'},location.origin);privacy.showModal()});
 document.getElementById('closePrivacy').addEventListener('click',()=>privacy.close());
 document.getElementById('clearRecords').addEventListener('click',()=>{
  if(!confirm('Delete this version’s best times on this device? Earlier versions will not be changed.'))return;
  try{for(const key of ['skyRushLavaBestV29RC5Review','skyRushStormBestV29RC5Review'])localStorage.removeItem(key);document.getElementById('privacyStatus').textContent='RC5 records deleted. Earlier versions are unchanged.';clearSession();}
  catch{document.getElementById('privacyStatus').textContent='Browser storage is unavailable.';}
 });
})();