from pathlib import Path
import hashlib, json, re, shutil
ROOT=Path.cwd(); old=ROOT/'review/v29-rc4'; new=ROOT/'review/v29-rc5'
assert old.is_dir() and not new.exists(), 'Expected frozen RC4 and a new RC5 directory'
new.mkdir()
for name in ['controls-ipad-rc3.css','result-flow-rc4.css']: shutil.copyfile(old/name,new/name)
csp="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' blob: data:; font-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; worker-src 'none'; media-src 'none'"
meta='<meta http-equiv="Content-Security-Policy" content="'+csp+'"><meta name="referrer" content="no-referrer">'
validator=r'''export function validateLocalGLB(buffer) {
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<20||buffer.byteLength>20*1024*1024)throw Error('Use a self-contained GLB file up to 20 MB');
 const d=new DataView(buffer);
 if(d.getUint32(0,true)!==0x46546c67||d.getUint32(4,true)!==2||d.getUint32(8,true)!==buffer.byteLength)throw Error('Invalid GLB 2 file');
 let p=12,document=null;
 while(p<buffer.byteLength){
  if(p+8>buffer.byteLength)throw Error('Truncated GLB');
  const n=d.getUint32(p,true),kind=d.getUint32(p+4,true);p+=8;
  if(n%4||p+n>buffer.byteLength)throw Error('Invalid GLB chunk');
  if(kind===0x4e4f534a){if(document)throw Error('Duplicate GLB document');document=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,p,n)));}
  p+=n;
 }
 if(!document||document.asset?.version!=='2.0')throw Error('Missing GLB scene');
 const walk=value=>{
  if(!value||typeof value!=='object')return;
  for(const [key,item] of Object.entries(value)){
   if(key==='uri'&&(typeof item!=='string'||!/^data:(image\/(png|jpeg|webp)|application\/(octet-stream|gltf-buffer));base64,[A-Za-z0-9+/=\s]+$/.test(item)))throw Error('External model resources are blocked. Use the original self-contained GLB');
   if(item&&typeof item==='object')walk(item);
  }
 };
 walk(document);return true;
}
'''
(new/'local-model.js').write_text(validator)
loader=r'''let modelLoadSequence=0,sessionPending=false;
function sessionSend(message){if(window.parent!==window)window.parent.postMessage({channel:'sky-rc5',...message},location.origin)}
function disposeModel(model){if(!model)return;model.traverse(node=>{node.geometry?.dispose();for(const material of (Array.isArray(node.material)?node.material:[node.material]))if(material){for(const value of Object.values(material))if(value?.isTexture)value.dispose();material.dispose();}})}
async function loadApprovedFile(file,share=true){
 if(!(file instanceof Blob)||file.size>20*1024*1024){status.textContent='Use the original self-contained GLB, up to 20 MB.';return}
 const sequence=++modelLoadSequence;
 if(running)pauseGame('Paused while loading your local character.');
 sessionPending=true;startRun.disabled=true;status.textContent='Loading your local character… No upload.';
 try{
  const buffer=await file.arrayBuffer();validateLocalGLB(buffer);
  const manager=new THREE.LoadingManager();manager.setURLModifier(url=>{if(!/^(blob:|data:)/.test(url))throw Error('External model request blocked');return url});
  const gltf=await new Promise((resolve,reject)=>new GLTFLoader(manager).parse(buffer,'',resolve,reject));
  const model=gltf.scene;
  if(sequence!==modelLoadSequence){disposeModel(model);return}
  const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
  if(!Number.isFinite(size.y)||size.y<.001)throw Error('Invalid model bounds');
  model.scale.multiplyScalar(1.85/size.y);model.updateMatrixWorld(true);
  const b2=new THREE.Box3().setFromObject(model),center=b2.getCenter(new THREE.Vector3());
  model.position.set(-center.x,-b2.min.y,-center.z);
  if(approvedModel){player.remove(approvedModel);disposeModel(approvedModel)}
  approvedModel=model;player.add(model);avatar.visible=false;markerRing.visible=false;
  status.textContent='Local character ready. Shape unchanged. Kept only for this tab session; no upload.';
  renderer.render(scene,camera);
  if(share)sessionSend({type:'remember-model',file});
 }catch(err){if(sequence===modelLoadSequence)status.textContent='Could not load character: '+err.message+'. The current game remains available.'}
 finally{if(sequence===modelLoadSequence){sessionPending=false;startRun.disabled=contextLost;}}
}
document.getElementById('approvedFile').addEventListener('change',e=>{const file=e.target.files?.[0];if(file)loadApprovedFile(file)});
'''
bridge=r'''
// Only the current same-origin session shell may restore a file or navigate the session.
if(window.parent!==window){
 sessionPending=true;startRun.disabled=true;
 const handshakeTimeout=setTimeout(()=>{sessionPending=false;startRun.disabled=contextLost;status.textContent='Session unavailable. Select your local file on this page.'},3000);
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==window.parent||event.data?.channel!=='sky-rc5')return;
  if(event.data.type==='restore-model'){
   clearTimeout(handshakeTimeout);
   if(event.data.file instanceof Blob)loadApprovedFile(event.data.file,false);
   else{sessionPending=false;startRun.disabled=contextLost;}
  }
  if(event.data.type==='pause'){clearInput();if(running)pauseGame();}
 });
 document.querySelector('header a').addEventListener('click',event=>{event.preventDefault();clearInput();if(running)pauseGame();sessionSend({type:'navigate',stage:'hub',mode:challengeMode?'challenge':'practice'})});
 sessionSend({type:'ready'});
}
'''
for stage in ['lava','storm']:
 name=stage+'-v29-candidate.html'; source=(old/name).read_text(); s=source.replace('RC4','RC5')
 a=s.index("document.getElementById('approvedFile').addEventListener('change',async e=>{")
 b=s.index('\n\nconst keys=new',a)
 s=s[:a]+loader+s[b:]
 s=s.replace("import {GLTFLoader} from '../../assets/vendor/three-0.160.1/GLTFLoader.js';", "import {GLTFLoader} from '../../assets/vendor/three-0.160.1/GLTFLoader.js';\nimport {validateLocalGLB} from './local-model.js';")
 s=s.replace('if(contextLost||won)return;','if(contextLost||won||sessionPending)return;')
 s=s.replace(' location.assign(url.href);'," if(window.parent!==window){sessionSend({type:'navigate',stage:file.includes('storm-')?'storm':'hub',mode:challengeMode?'challenge':'practice'});return}\n location.assign(url.href);")
 s=s.replace('Your V4.1 stays on this device. Select the same file again after changing stages.', 'Using the session hub keeps your character in this tab between stages. End session or reload the hub to clear it. Direct stage links do not retain it.')
 s=s.replace("window.skyRushBoot.ready();requestAnimationFrame(loop);", "window.skyRushBoot.ready();requestAnimationFrame(loop);"+bridge)
 scripts=list(re.finditer(r'<script type="module">([\s\S]*?)</script>',s));assert len(scripts)==1
 module=scripts[0].group(1)
 s=s[:scripts[0].start()]+f'<script type="module" src="./{stage}-rc5.js"></script>'+s[scripts[0].end():]
 s=s.replace('<meta charset="utf-8">','<meta charset="utf-8">'+meta,1)
 for fragment in [source[source.index('const platforms=[];'):source.index('const secretOrigin=')], 'model.scale.multiplyScalar(1.85/size.y)', 'model.position.set(-center.x,-b2.min.y,-center.z)']:
  assert fragment in module, 'Unexpected course or model transform change'
 (new/name).write_text(s);(new/f'{stage}-rc5.js').write_text(module)
(new/'index.html').write_text('''<!doctype html><html lang="en"><head><meta charset="utf-8">'''+meta+'''<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Sky Rush Adventure · RC5</title><link rel="stylesheet" href="./session.css"></head><body>
<header id="sessionBar"><strong>Sky Rush <small>RC5 review</small></strong><span id="sessionStatus" role="status">Single-player · No chat · No purchases</span><button id="parentInfo">Parent information</button><button id="endSession" hidden>End session</button></header>
<main id="hub"><p class="eyebrow">YOUR NEXT ADVENTURE</p><h1>Jump. Explore.<br>Reach the stars.</h1><p>Two familiar islands. Five stars in each. Play at your pace.</p><label class="mode">Play mode <select id="sessionMode"><option value="practice">Practice</option><option value="challenge">Time Challenge</option></select></label>
<div class="stages"><button class="stage lava" data-stage="lava"><span aria-hidden="true">▲</span><strong>Lava Rush</strong><small>Jump across the glowing islands</small><b>PLAY →</b></button><button class="stage storm" data-stage="storm"><span aria-hidden="true">ϟ</span><strong>Storm Circuit</strong><small>Find your rhythm on moving platforms</small><b>PLAY →</b></button></div>
<p id="hubNote">Your original V4.1 file can be selected inside a stage. It stays only in this tab session, not on our server.</p><p class="review">Review build — previous versions are unchanged.</p></main>
<div id="gameSlot" hidden></div>
<dialog id="privacy"><h2>Parent information</h2><p>This review is single-player: no chat, player accounts, purchases, ads or analytics scripts.</p><p>Your selected character is kept in this tab’s memory and passed locally between the two stages. End session or reload this page to clear it. It is not uploaded or saved in browser storage.</p><p>Best times for this version are stored on this device. They may disappear when browser data is cleared. The hosting provider still receives ordinary website requests and may keep access logs.</p><p>Imported GLB files must be self-contained and no larger than 20 MB. External model resources are blocked. This is not a guarantee against every online or device risk.</p><button id="clearRecords">Delete RC5 best times</button><button id="closePrivacy">Back</button><p id="privacyStatus" role="status"></p></dialog>
<script src="./session.js" defer></script></body></html>''')
(new/'session.css').write_text('''*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;font:16px/1.5 system-ui,sans-serif;background:#111b3b;color:#f5f8ff}body{height:100vh;height:100dvh;display:flex;flex-direction:column;overflow:hidden}button,select{font:inherit;min-height:44px;border-radius:12px;border:1px solid #7b91c0;padding:8px 14px;cursor:pointer;background:#263e6f;color:white}button:focus-visible,select:focus-visible{outline:3px solid #ffe878;outline-offset:3px}[hidden]{display:none!important}#sessionBar{display:flex;align-items:center;gap:8px;padding:6px max(8px,env(safe-area-inset-left));background:#192849;flex-shrink:0}#sessionBar strong{white-space:nowrap}#sessionBar small{font-size:10px;color:#a9c2e8}#sessionStatus{flex:1;font-size:11px;color:#b8d3ee}#sessionBar button{font-size:12px}#hub{width:100%;max-width:960px;margin:auto;padding:24px;overflow:auto}h1{font-size:clamp(32px,5vw,56px);line-height:1.05;margin:8px 0 20px}.eyebrow{font-size:12px;letter-spacing:.18em;color:#8fe5e4}.mode{display:flex;gap:12px;align-items:center}.stages{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:24px 0}.stage{min-height:200px;text-align:left;padding:24px;display:grid;gap:8px;border:1px solid #839bd0;border-radius:24px}.stage span{font-size:36px}.stage strong{font-size:26px}.stage small{font-weight:400}.stage b{margin-top:10px;letter-spacing:.1em}.lava{background:linear-gradient(130deg,#874229,#5a2755)}.storm{background:linear-gradient(130deg,#245879,#343273)}#hubNote,.review{font-size:13px;color:#b8c8e7}#gameSlot{position:relative;flex:1;min-height:0}iframe{width:100%;height:100%;display:block;border:0}dialog{width:min(560px,94vw);max-height:85dvh;overflow:auto;border:1px solid #8db5f0;border-radius:20px;background:#182b50;color:white;padding:24px}dialog::backdrop{background:#060d25cc}#privacy button{margin:4px}#privacy p{font-size:14px}@media(max-width:600px){#sessionBar strong{font-size:12px}#sessionBar small{display:block}#sessionStatus{display:none}.stages{gap:12px}.stage{padding:16px;min-height:180px}.stage strong{font-size:20px}#hub{padding:18px}#sessionBar button{font-size:11px;padding:5px 9px}#parentInfo{margin-left:auto}}@media(max-height:500px){#hub{padding:12px 22px}h1{font-size:28px}h1 br{display:none}.stage{min-height:120px;grid-template-columns:1fr 2fr}.stage span{grid-row:1/4}.stage strong{font-size:20px}.stages{margin:10px 0}.stage b{margin:0}#hub>p:not(.eyebrow){font-size:12px}}''')
(new/'session.js').write_text(r'''(()=>{'use strict';
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
})();''')
manifest={p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in new.iterdir()}
Path('rc5-payload-hashes.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps({'addedFiles':len(manifest),'hashes':manifest},indent=2))
