import {recordCompletion,BADGES,GOALS} from './progress.js';

import * as THREE from '../../assets/vendor/three-0.160.1/three.module.min.js';
import {GLTFLoader} from '../../assets/vendor/three-0.160.1/GLTFLoader.js';
import {validateLocalGLB} from './local-model.js';
document.getElementById('status').textContent='3D engine loaded. Select approved V4.1 GLB to see your girl.';const host=document.getElementById('game'),msg=document.getElementById('message'),status=document.getElementById('status');const scene=new THREE.Scene();scene.background=new THREE.Color('#303f88');scene.fog=new THREE.Fog('#475aa1',35,100);const camera=new THREE.PerspectiveCamera(62,1,.1,100);let renderer;try{renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'low-power',alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1));renderer.shadowMap.enabled=false;host.append(renderer.domElement)}catch(err){document.getElementById('status').textContent='3D display unavailable: '+err.message;throw err}scene.add(new THREE.HemisphereLight(0xffffff,0x7788aa,2));const sun=new THREE.DirectionalLight(0xffffff,2.6);sun.position.set(8,18,9);scene.add(sun);
const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.65}),colors=['#6ceaff','#9c8bff','#67f4cd','#8bc8ff','#e2a0ff'],dangerMat=new THREE.MeshStandardMaterial({color:'#ff4e16',emissive:'#ff4500',emissiveIntensity:.85});
function box(x,y,z,w,h,d,m){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);scene.add(mesh);return mesh}
const lavaCanvas=document.createElement('canvas');lavaCanvas.width=256;lavaCanvas.height=256;const lc=lavaCanvas.getContext('2d');lc.fillStyle='#fc4b0a';lc.fillRect(0,0,256,256);for(let i=0;i<95;i++){lc.strokeStyle=i%3?'#ffad13':'#ffe158';lc.lineWidth=2+i%3;lc.beginPath();let x=Math.random()*256,y=Math.random()*256;lc.moveTo(x,y);for(let k=0;k<5;k++){x+=Math.random()*28-14;y+=Math.random()*28-14;lc.lineTo(x,y)}lc.stroke()}const lavaTexture=new THREE.CanvasTexture(lavaCanvas);lavaTexture.wrapS=lavaTexture.wrapT=THREE.RepeatWrapping;lavaTexture.repeat.set(6,10);const lavaMaterial=new THREE.MeshStandardMaterial({map:lavaTexture,color:'#2778dd',emissive:'#133ba8',emissiveIntensity:.5,roughness:.6});const lava=box(0,-3,-15,42,.25,66,lavaMaterial);
const platforms=[];const laneXs=[-2.4,0,2.4];for(let i=0;i<12;i++){const x=i===0||i===11?0:laneXs[[1,2,1,0,2,1,0,1,2,0,1,1][i]],z=3-i*3.3;const mesh=box(x,-.14,z,3.6,.28,2.6,mat(colors[i%5]));platforms.push({mesh,x,z,halfX:1.8,halfZ:1.3,moving:i===2||i===5||i===9,fragile:i===4||i===8,collapseAt:0,baseX:x,phase:i*1.1});if(i%2===0){const pillar=box(x,-1.6,z,.18,2.6,.18,mat('#7c78aa'));pillar.position.y=-1.6}}
// Optional secret island branches from the middle course; it is not required to win.
const secretOrigin=platforms[5];const secretX=secretOrigin.x>0?5.8:-5.8;
const secretPlatform=box(secretX,-.14,secretOrigin.z,2.3,.28,2.5,mat('#a878ff'));
const secret={mesh:secretPlatform,x:secretX,z:secretOrigin.z,halfX:1.15,halfZ:1.25,fragile:false,collapseAt:0};
platforms.push(secret);
const secretGem=new THREE.Mesh(new THREE.IcosahedronGeometry(.5,1),new THREE.MeshStandardMaterial({color:'#c7f9ff',emissive:'#43a9ff',emissiveIntensity:1.2,metalness:.3}));
secretGem.position.set(secretX,1.4,secretOrigin.z);scene.add(secretGem);
const secretHalo=new THREE.Mesh(new THREE.TorusGeometry(.8,.09,10,36),new THREE.MeshBasicMaterial({color:'#fff19a'}));secretHalo.position.set(secretX,1.4,secretOrigin.z);scene.add(secretHalo);
let secretCollected=false;
const crumbleHints=[];for(const p of platforms.filter(p=>p.fragile)){const plate=new THREE.Mesh(new THREE.BoxGeometry(2.4,.045,1.5),new THREE.MeshBasicMaterial({color:'#fffaad',transparent:true,opacity:.5}));plate.position.y=.19;p.mesh.add(plate);crumbleHints.push({p,plate})}
const edgeLights=[];const neonPalette=['#fff56a','#ff7b65','#6bffbd','#61eaff','#f9a0ff'];for(let i=0;i<platforms.length;i++){const p=platforms[i],color=neonPalette[i%5];const material=new THREE.MeshBasicMaterial({color});for(const side of [-1,1]){const edge=new THREE.Mesh(new THREE.BoxGeometry(.055,.07,p.halfZ*2),material);edge.position.set(side*(p.halfX-.04),.18,0);p.mesh.add(edge)}for(const side of [-1,1]){const edge=new THREE.Mesh(new THREE.BoxGeometry(p.halfX*2,.07,.055),material);edge.position.set(0,.18,side*(p.halfZ-.03));p.mesh.add(edge)}const light=new THREE.Mesh(new THREE.TorusGeometry(.38,.065,7,20),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.55}));light.rotation.x=-Math.PI/2;light.position.set(p.x,.06,p.z);scene.add(light);edgeLights.push({light,p})}
const finishLights=[];const towerMat=mat('#585079'),roofMat=mat('#3ad8ef');for(let i=0;i<12;i++){const side=i%2?1:-1,x=side*(9+i%3*2),z=3-i*3.5,h=2.2+i%4*.8;box(x,h/2-2,z,2,h,2,towerMat);const roof=new THREE.Mesh(new THREE.ConeGeometry(1.35,1.2,4),roofMat);roof.position.set(x,h-1.4,z);roof.rotation.y=Math.PI/4;scene.add(roof);const windowMat=new THREE.MeshBasicMaterial({color:i%2?'#ff9df2':'#7bfff0'});for(let j=0;j<3;j++){const window=box(x,h*.3+j*.45-1.6,z+1.02,.8,.14,.05,windowMat);finishLights.push(window)}}
const fanDecor=[];for(const index of [3,6,10]){const p=platforms[index],group=new THREE.Group();group.position.set(p.x,3.3,p.z);scene.add(group);const rim=new THREE.Mesh(new THREE.TorusGeometry(.85,.13,12,32),new THREE.MeshStandardMaterial({color:'#d8f6ff',emissive:'#2e9eff',emissiveIntensity:.75}));group.add(rim);const hub=new THREE.Mesh(new THREE.SphereGeometry(.2,12,8),mat('#ffc95e'));group.add(hub);for(let k=0;k<4;k++){const blade=new THREE.Mesh(new THREE.BoxGeometry(1.3,.22,.08),new THREE.MeshStandardMaterial({color:k%2?'#ff79ce':'#68eaff',emissive:k%2?'#a02b71':'#2370b5',emissiveIntensity:.5}));blade.position.x=.6;blade.rotation.z=k*Math.PI/2;const arm=new THREE.Group();arm.rotation.z=k*Math.PI/2;arm.add(blade);group.add(arm)}fanDecor.push(group)}
const boostRings=[];for(const index of [1,6,10]){const p=platforms[index],ring=new THREE.Mesh(new THREE.TorusGeometry(.8,.09,8,32),new THREE.MeshBasicMaterial({color:'#6cfff4'}));ring.rotation.x=-Math.PI/2;ring.position.set(p.x,.08,p.z);scene.add(ring);boostRings.push({ring,p})}
const checkpoints=[];for(const index of [2,6,10]){const p=platforms[index],pole=box(p.x-1.3,1,p.z,.12,2,.12,mat('#fff7b2')),flag=box(p.x-.85,1.65,p.z,.9,.4,.1,mat('#57ffd2'));checkpoints.push({index,z:p.z,x:p.x,pole,flag,passed:false})}
const movingPlatforms=platforms.filter(p=>p.moving).map(p=>({mesh:p.mesh,platform:p,origin:p.x,phase:p.phase}));
const obstacles=[];for(const index of [3,6,10]){const p=platforms[index];const pivot=new THREE.Group();pivot.position.set(p.x,.55,p.z);scene.add(pivot);const bar=new THREE.Mesh(new THREE.BoxGeometry(2.8,.18,.18),mat('#fa476e'));pivot.add(bar);obstacles.push({pivot,bar,index})}
const stars=[];const gold=new THREE.MeshStandardMaterial({color:'#ffe164',emissive:'#f5a928',emissiveIntensity:.8});for(const index of [1,3,5,8,10]){const p=platforms[index],m=new THREE.Mesh(new THREE.OctahedronGeometry(.37),gold);m.position.set(p.x,1.3,p.z);scene.add(m);stars.push({mesh:m,platform:p})}
const surpriseCrates=[];for(const [index,kind] of [[2,'shield'],[6,'speed'],[9,'shield']]){const p=platforms[index],group=new THREE.Group();const base=new THREE.Mesh(new THREE.BoxGeometry(.72,.72,.72),new THREE.MeshStandardMaterial({color:kind==='shield'?'#4ddcf7':'#ffd356',emissive:kind==='shield'?'#1680ab':'#bc7b20',emissiveIntensity:.55}));group.add(base);const ribbon=new THREE.Mesh(new THREE.BoxGeometry(.78,.13,.78),new THREE.MeshBasicMaterial({color:'#fff6de'}));group.add(ribbon);group.position.set(p.x,1.05,p.z);scene.add(group);surpriseCrates.push({group,p,kind,collected:false})}
const finish=platforms[11];const portal=new THREE.Mesh(new THREE.TorusGeometry(1.45,.18,12,44),new THREE.MeshStandardMaterial({color:'#61e8ff',emissive:'#1399ed',emissiveIntensity:1.5}));portal.position.set(finish.x,1.6,finish.z);scene.add(portal);
const finishHalo=new THREE.Mesh(new THREE.TorusGeometry(1.75,.06,8,48),new THREE.MeshBasicMaterial({color:'#ffef6d'}));finishHalo.position.copy(portal.position);scene.add(finishHalo);
const particles=[];const particleMat=new THREE.MeshBasicMaterial({color:'#ffe27d',transparent:true,opacity:.75});for(let i=0;i<28;i++){const m=new THREE.Mesh(new THREE.TetrahedronGeometry(.07),particleMat);m.position.set((Math.random()-.5)*24,-2+Math.random()*4,5-Math.random()*45);scene.add(m);particles.push({m,speed:.2+Math.random()*.6,phase:Math.random()*6.28})}
const trophyParticles=[];for(let i=0;i<32;i++){const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(.08),new THREE.MeshBasicMaterial({color:['#ffe176','#ff8be8','#86eaff'][i%3]}));mesh.visible=false;scene.add(mesh);trophyParticles.push({mesh,phase:i*.85})}let celebrationAt=0;const arrows=[];for(let i=0;i<7;i++){const p=platforms[i+2];const arrow=new THREE.Mesh(new THREE.ConeGeometry(.32,.65,3),new THREE.MeshBasicMaterial({color:i%2?'#ffeb59':'#4ff1ff'}));arrow.rotation.z=-Math.PI/2;arrow.position.set(p.x,2.8,p.z);scene.add(arrow);arrows.push(arrow)}
const cloudMat=new THREE.MeshBasicMaterial({color:'#ffffff'});for(let i=0;i<10;i++){const cloud=new THREE.Group();for(let j=0;j<3;j++){const m=new THREE.Mesh(new THREE.SphereGeometry(.6+j*.1,8,6),cloudMat);m.position.x=j*.6;cloud.add(m)}cloud.position.set((i%2?1:-1)*(7+i%4*1.3),5+i%3,-i*2.5);scene.add(cloud)}
const dashTrail=[];const player=new THREE.Group();scene.add(player);const dashTrailMat=new THREE.MeshBasicMaterial({color:'#5dfcff',transparent:true,opacity:.45,depthWrite:false});for(let i=0;i<9;i++){const mesh=new THREE.Mesh(new THREE.SphereGeometry(.19,7,5),dashTrailMat.clone());mesh.visible=false;scene.add(mesh);dashTrail.push(mesh)}
const shadowMarker=new THREE.Mesh(new THREE.CircleGeometry(.42,24),new THREE.MeshBasicMaterial({color:'#132d67',transparent:true,opacity:.32,depthWrite:false}));shadowMarker.rotation.x=-Math.PI/2;scene.add(shadowMarker);
const landingBurst=[];for(let i=0;i<12;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.065,6,5),new THREE.MeshBasicMaterial({color:i%2?'#ffef81':'#77f5ff',transparent:true,opacity:.85}));m.visible=false;scene.add(m);landingBurst.push({m,angle:i*Math.PI/6})}
let landingEffectAt=-100,landingEffectX=0,landingEffectZ=0;
function showLandingEffect(now){landingEffectAt=now;landingEffectX=player.position.x;landingEffectZ=player.position.z}

const avatar=new THREE.Mesh(new THREE.IcosahedronGeometry(.48,1),new THREE.MeshStandardMaterial({color:'#42e8ff',emissive:'#147aa8',emissiveIntensity:.65,metalness:.25,roughness:.3}));avatar.position.y=.75;player.add(avatar);
const markerRing=new THREE.Mesh(new THREE.TorusGeometry(.55,.06,8,28),new THREE.MeshBasicMaterial({color:'#fff4a1'}));markerRing.rotation.x=-Math.PI/2;markerRing.position.y=.1;player.add(markerRing);
let mixer=null,clipMap={},approvedModel=null;
let modelLoadSequence=0,sessionPending=false;
function sessionSend(message){if(window.parent!==window)window.parent.postMessage({channel:'sky-rc6',...message},location.origin)}
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


const keys=new Set(), keyboardDirs=new Set(), pointerDirs=new Map();
let lastClip='',currentAction=null;
function playMotion(name){if(!mixer)return;const candidates=name==='walk'?['run','walk-casual','walk']:name==='idle'?['idle']:['jump'];const key=candidates.find(k=>clipMap[k]);if(!key||key===lastClip)return;const action=mixer.clipAction(clipMap[key]);action.reset().fadeIn(.12).play();if(currentAction&&currentAction!==action)currentAction.fadeOut(.12);currentAction=action;lastClip=key;}
function syncDirection(dir){if(keyboardDirs.has(dir)||[...pointerDirs.values()].includes(dir))keys.add(dir);else keys.delete(dir)}
function clearInput(){keys.clear();keyboardDirs.clear();pointerDirs.clear()}
function bind(btn){
 const dir=btn.dataset.dir;
 if(window.PointerEvent){
  btn.addEventListener('pointerdown',e=>{if(e.cancelable)e.preventDefault();if(!running)return;pointerDirs.set(e.pointerId,dir);syncDirection(dir);try{btn.setPointerCapture(e.pointerId)}catch(_){}});
  const release=e=>{pointerDirs.delete(e.pointerId);syncDirection(dir)};
  ['pointerup','pointercancel','lostpointercapture'].forEach(name=>btn.addEventListener(name,release));
 }else{
  btn.addEventListener('touchstart',e=>{e.preventDefault();if(!running)return;for(const t of e.changedTouches)pointerDirs.set(t.identifier,dir);syncDirection(dir)},{passive:false});
  const release=e=>{if(e.cancelable)e.preventDefault();for(const t of e.changedTouches)pointerDirs.delete(t.identifier);syncDirection(dir)};
  btn.addEventListener('touchend',release,{passive:false});btn.addEventListener('touchcancel',release,{passive:false});
 }
}
document.querySelectorAll('[data-dir]').forEach(bind);
const directionCodes={ArrowUp:'forward',KeyW:'forward',ArrowDown:'back',KeyS:'back',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
function isFormTarget(target){return target instanceof Element&&!!target.closest('input,select,textarea,[contenteditable="true"]')}
addEventListener('keydown',e=>{
 if(isFormTarget(e.target))return;
 if(e.code==='Escape'){e.preventDefault();if(running)pauseGame();return}
 if(!running)return;
 const dir=directionCodes[e.code];
 if(dir){e.preventDefault();keyboardDirs.add(dir);syncDirection(dir)}
 if(e.code==='Space'){e.preventDefault();if(!e.repeat)jump()}
 if(['ShiftLeft','ShiftRight','KeyE'].includes(e.code)){e.preventDefault();if(!e.repeat)dash()}
});
addEventListener('keyup',e=>{const dir=directionCodes[e.code];if(dir){keyboardDirs.delete(dir);syncDirection(dir)}});
function bindAction(btn,action){
 if(window.PointerEvent)btn.addEventListener('pointerdown',e=>{if(e.cancelable)e.preventDefault();action()});
 else btn.addEventListener('touchstart',e=>{e.preventDefault();action()},{passive:false});
 btn.addEventListener('click',e=>{if(e.detail===0)action()});
}
bindAction(document.getElementById('jump'),jump);
addEventListener('blur',()=>{clearInput();if(running)pauseGame()});
document.addEventListener('visibilitychange',()=>{clearInput();if(document.hidden&&running)pauseGame()});

let vy=0,onGround=true,score=0,lives=3,won=false,invulnerable=0,checkpointZ=3,checkpointX=0,runTime=0,shields=0,speedUntil=0,coyote=0,jumpBuffer=0,landedPlatform=null;let dashUntil=0,dashReadyAt=0,dashX=0,dashZ=-1;let dashFxTime=0;const dashButton=document.getElementById('dash');

let running=false,hasStarted=false,contextLost=false,simTime=0,lastFrame=null,runEligible=true;
// Fixed simulation time; retain short frame delays and pause explicitly after a long interruption.
const FIXED_DT=1/60,MAX_FRAME=.75,MAX_STEPS=45;
let accumulator=0;
const readyOverlay=document.getElementById('readyOverlay'),startRun=document.getElementById('startRun'),pauseButton=document.getElementById('pause');

// RC6: terminal outcomes are distinct from Pause; existing physics and character loader are retained.
const resultOverlay=document.getElementById('resultOverlay');
// Keep full-screen dialogs above the isolated canvas and touch controls.
document.body.append(resultOverlay);document.body.append(document.getElementById('bootError'));
const resultNext=document.getElementById('resultNext'),resultReplay=document.getElementById('resultReplay'),resultRetry=document.getElementById('resultRetry'),resultHub=document.getElementById('resultHub');
const missingStars=document.getElementById('missingStars');
const attemptGoal=new URLSearchParams(location.search).get('goal')==='clean'?'clean':'explorer';
let attemptSetbacks=0,attemptRetries=0;
document.getElementById('goalReady').textContent='Goal: '+GOALS[attemptGoal];
let resultNavigating=false;
function hideResult(){
 if(resultOverlay.contains(document.activeElement))document.activeElement.blur();
 resultOverlay.hidden=true;missingStars.hidden=true;resultNavigating=false;
 document.querySelectorAll('#pad button,#jump').forEach(b=>b.disabled=false);
}
function startGame(){
 if(contextLost||won||sessionPending)return;
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
 const goalLine=document.getElementById('resultGoal'),badgeLine=document.getElementById('resultAchievements');
 badgeLine.textContent='';goalLine.textContent='Your earned badges stay yours. Try again when you are ready.';
 if(success){
  const outcome=recordCompletion('storm',{complete:won&&lives>0,score,seconds:runTime,setbacks:attemptSetbacks,retries:attemptRetries,challenge:challengeMode,eligible:runEligible});
  const achieved=attemptGoal==='explorer'||(attemptSetbacks===0&&attemptRetries===0);
  goalLine.textContent=achieved?'Goal complete! '+(attemptGoal==='clean'?'Clean run':'Star explorer'):'Stage complete! Clean run is still available to try another time.';
  badgeLine.textContent=(outcome.earned.length?'New badges: '+outcome.earned.map(k=>BADGES[k]).join(' · '):'Your island is powered. Earned badges are kept.')+(outcome.stored?' · Saved on this device.':' · Could not save progress. This result is visible for this attempt only.');
  sessionSend({type:'progress-updated'});
 }
 resultOverlay.dataset.outcome=kind;
 document.getElementById('resultSymbol').textContent=success?'★':'↻';
 document.getElementById('resultTitle').textContent=success?'Storm Circuit complete!':'Try again!';
 document.getElementById('resultSummary').textContent=success?(challengeMode?'Time Challenge':'Practice')+' · '+score+'/5 stars · '+runTime.toFixed(1)+'s':'No lives left. Return to your checkpoint or start a fresh attempt.';
 document.getElementById('resultRecord').textContent=success?msg.textContent:'Checkpoint retry is practice only; Play again starts a new eligible Time Challenge.';
 resultNext.hidden=!success||'storm'!=='lava';resultRetry.hidden=success;
 document.getElementById('resultModelNote').hidden=!approvedModel;
 resultOverlay.hidden=false;
 (success?(' storm'.trim()==='lava'?resultNext:resultReplay):resultRetry).focus({preventScroll:true});
}
function leaveResult(file){
 if(resultOverlay.hidden||resultNavigating)return;
 resultNavigating=true;clearInput();cancelDash();
 const url=new URL(file,location.href);url.searchParams.set('mode',challengeMode?'challenge':'practice');url.searchParams.set('goal',attemptGoal);
 if(window.parent!==window){sessionSend({type:'navigate',stage:file.includes('storm-')?'storm':'hub',mode:challengeMode?'challenge':'practice'});return}
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
function pauseGame(message='Paused — tap Resume when you are ready.'){
 if(won){clearInput();return}
 running=false;clearInput();lastFrame=null;accumulator=0;
 readyOverlay.hidden=false;startRun.textContent=hasStarted?'Resume':'Start playing';
 pauseButton.disabled=true;msg.textContent=message;
}
startRun.addEventListener('click',startGame);
bindAction(pauseButton,()=>pauseGame());
document.getElementById('approvedFile').addEventListener('click',()=>{if(running)pauseGame('Paused while you choose the approved V4.1 model.')});
window.addEventListener('sky-rush-fatal',()=>{running=false;clearInput();pauseButton.disabled=true});
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;pauseGame();window.skyRushBoot.fail('The 3D display was interrupted. Waiting for recovery, or reload the game.');});
renderer.domElement.addEventListener('webglcontextrestored',()=>{contextLost=false;window.skyRushBoot.ready();pauseGame('3D display recovered. Tap Resume.');renderer.render(scene,camera);});
function cancelDash(resetCooldown=false){dashUntil=0;dashFxTime=0;dashTrail.forEach(m=>m.visible=false);if(resetCooldown)dashReadyAt=runTime}

function dash(){if(!running||won||runTime<dashReadyAt)return;let x=Number(keys.has('right'))-Number(keys.has('left')),z=Number(keys.has('back'))-Number(keys.has('forward'));const l=Math.hypot(x,z);if(l){x/=l;z/=l}else{x=-Math.sin(player.rotation.y);z=-Math.cos(player.rotation.y)}dashX=x;dashZ=z;dashUntil=runTime+.23;dashReadyAt=runTime+3.5;dashFxTime=.25;msg.textContent='⚡ DASH!';}
bindAction(dashButton,dash);
function jump(){if(!running||won)return;jumpBuffer=.14;if(onGround||coyote>0)startJump()}function startJump(){vy=9.8;onGround=false;coyote=0;jumpBuffer=0;landedPlatform=null;playMotion('jump');msg.textContent='Jump!'}function retryCheckpoint(){
 hideResult();clearInput();cancelDash(true);
 if(won&&lives>0){reset();return}
 if(!hasStarted){reset();return}
 attemptRetries++;
 if(challengeMode)runEligible=false;
 won=false;celebrationAt=0;
 const safe=platforms.find(p=>Math.abs(p.z-checkpointZ)<.1)||platforms[0];
 player.position.set(safe.x,0,safe.z);vy=0;onGround=true;coyote=0;jumpBuffer=0;invulnerable=1.8;landedPlatform=safe;
 platforms.forEach(p=>{p.collapseAt=0;p.mesh.visible=true});
 if(lives<=0){lives=3;document.getElementById('lives').textContent=lives}
 dashButton.disabled=false;dashButton.textContent='⚡ DASH';
 msg.textContent=challengeMode?'Checkpoint retry: finish for practice. Restart for a new best time.':'🏁 Back to checkpoint — keep going!';
}
document.getElementById('retryCheckpoint').onclick=retryCheckpoint;
function reset(){attemptSetbacks=0;attemptRetries=0;hideResult();accumulator=0;running=false;hasStarted=false;runEligible=true;simTime=0;lastFrame=null;readyOverlay.hidden=false;startRun.textContent='Start playing';pauseButton.disabled=true;player.rotation.y=0;clearInput();movingPlatforms.forEach(p=>{p.platform.x=p.origin;p.mesh.position.x=p.origin});camera.position.set(0,5.3,12);camera.lookAt(0,1,-1);dashUntil=0;dashReadyAt=0;dashFxTime=0;dashTrail.forEach(m=>m.visible=false);dashButton.disabled=false;dashButton.textContent='⚡ DASH';clearInput();player.position.set(0,0,3);checkpointZ=3;checkpointX=0;runTime=0;document.getElementById('medal').textContent='—';shields=0;speedUntil=0;secretCollected=false;secretGem.visible=true;secretHalo.visible=true;document.getElementById('secrets').textContent='0';document.getElementById('shield').textContent='0';document.getElementById('boost').textContent='—';surpriseCrates.forEach(c=>{c.collected=false;c.group.visible=true});coyote=0;jumpBuffer=0;landedPlatform=null;platforms.forEach(p=>{p.collapseAt=0;p.mesh.visible=true});document.getElementById('timer').textContent='0.0';checkpoints.forEach(c=>{c.passed=false;c.flag.material.color.set('#5cf3b8')});document.getElementById('checkpointLabel').textContent='🏁 Checkpoint: Start';vy=0;onGround=true;score=0;lives=3;won=false;celebrationAt=0;invulnerable=0;stars.forEach(x=>x.mesh.visible=true);document.getElementById('score').textContent=0;document.getElementById('lives').textContent=3;msg.textContent='Ready — tap Start playing!';renderer.render(scene,camera)}document.getElementById('reset').onclick=reset;reset();
const modeSelect=document.getElementById('mode');const modeHelp=document.getElementById('modeHelp');let challengeMode=false;modeSelect.addEventListener('change',()=>{challengeMode=modeSelect.value==='challenge';reset();modeHelp.textContent=challengeMode?'Time Challenge: race for your best time.':'Practice: learn the route without a time target.'});let bestTime=null;try{const b=Number(localStorage.getItem('skyRushStormBestV29RC6Review'));if(b>0&&Number.isFinite(b))bestTime=b}catch(e){}document.getElementById('best').textContent=bestTime===null?'—':bestTime.toFixed(1)+'s';let lastGroundPlatform=platforms[0];function respawn(reason){
 if(won)return;
 attemptSetbacks++;
 clearInput();cancelDash();
 const shielded=shields>0;
 if(shielded){shields--;document.getElementById('shield').textContent=shields}
 else{lives--;document.getElementById('lives').textContent=lives}
 if(lives<=0){if(!challengeMode){lives=3;document.getElementById('lives').textContent=lives}else{won=true;clearInput();msg.textContent='Game over — tap Retry checkpoint or Restart';showResult('gameover');return}}
 platforms.forEach(p=>{p.collapseAt=0;p.mesh.visible=true});
 const safe=platforms.find(p=>Math.abs(p.z-checkpointZ)<.1)||platforms[0];
 player.position.set(safe.x,0,safe.z);
 vy=0;onGround=true;coyote=0;jumpBuffer=0;landedPlatform=safe;invulnerable=1.5;
 msg.textContent=shielded?'🛡️ Shield saved you — checkpoint restored!':reason+' — back to checkpoint!';
}
function loop(timestamp){
 requestAnimationFrame(loop);
 const elapsed=lastFrame===null?0:Math.max(0,(timestamp-lastFrame)/1000);
 lastFrame=timestamp;
 if(!running||document.hidden||contextLost){accumulator=0;return}
 if(elapsed>MAX_FRAME){pauseGame('Paused after an interruption. Tap Resume when you are ready.');return}
 accumulator+=elapsed;
 let steps=0;
 while(accumulator+1e-9>=FIXED_DT&&steps<MAX_STEPS&&running){
  simTime+=FIXED_DT;
  updateSimulation(FIXED_DT,simTime);
  accumulator=Math.max(0,accumulator-FIXED_DT);
  steps++;
 }
 renderer.render(scene,camera);
}
function updateSimulation(dt,time){if(!won)runTime+=dt;document.getElementById('progressBar').style.width=(Math.max(0,Math.min(1,(3-player.position.z)/(3-finish.z)))*100).toFixed(1)+'%';coyote=Math.max(0,coyote-dt);jumpBuffer=Math.max(0,jumpBuffer-dt);document.getElementById('timer').textContent=runTime.toFixed(1);
let dx=0,dz=0;if(keys.has('forward'))dz-=1;if(keys.has('back'))dz+=1;if(keys.has('left'))dx-=1;if(keys.has('right'))dx+=1;
const moving=dx!==0||dz!==0,len=Math.hypot(dx,dz)||1;const dashing=!won&&runTime<dashUntil;dashButton.disabled=won||runTime<dashReadyAt;dashButton.textContent=runTime<dashReadyAt?'⚡ '+Math.ceil(dashReadyAt-runTime)+'s':'⚡ DASH';document.getElementById('dashFill').style.width=(Math.max(0,Math.min(1,1-(dashReadyAt-runTime)/3.5))*100).toFixed(0)+'%';
if(!won){const travelSpeed=runTime<speedUntil?9:(onGround?6.5:7.5);player.position.x=THREE.MathUtils.clamp(player.position.x+(dashing?dashX*13:dx/len*travelSpeed)*dt,-8,8);player.position.z=THREE.MathUtils.clamp(player.position.z+(dashing?dashZ*13:dz/len*travelSpeed)*dt,-35,7);if(moving){const angle=Math.atan2(-dx,-dz);const difference=(angle-player.rotation.y+Math.PI*3)%(Math.PI*2)-Math.PI;player.rotation.y+=difference*Math.min(1,dt*12)}}
platforms.forEach(p=>{if(p.fragile&&p.collapseAt&&time-p.collapseAt>1.1){p.mesh.visible=false}});crumbleHints.forEach(({p,plate})=>{plate.material.opacity=p.collapseAt?.3+.25*Math.sin(time*22):.5});movingPlatforms.forEach(p=>{const previous=p.platform.x;p.platform.x=p.origin+Math.sin(time*1.2+p.phase)*.7;p.mesh.position.x=p.platform.x;if(onGround&&landedPlatform===p.platform)player.position.x+=p.platform.x-previous});
dashFxTime=Math.max(0,dashFxTime-dt);dashTrail.forEach((mesh,i)=>{mesh.visible=dashFxTime>0;if(mesh.visible){const back=(i+1)*.26;mesh.position.set(player.position.x-dashX*back,player.position.y+.65,player.position.z-dashZ*back);mesh.scale.setScalar(Math.max(.25,1-i*.09));mesh.material.opacity=.42*(1-i/9)}});
const wasY=player.position.y;
if(!onGround&&!won){vy-=20*dt;player.position.y+=vy*dt}
let supported=null;for(const p of platforms){if(p.mesh.visible&&Math.abs(player.position.x-p.x)<p.halfX-.15&&Math.abs(player.position.z-p.z)<p.halfZ-.12){supported=p;break}}
if(!onGround&&vy<=0&&wasY>=-.03&&player.position.y<=0&&supported){showLandingEffect(time);player.position.y=0;vy=0;onGround=true;landedPlatform=supported;coyote=0;lastClip='';playMotion(moving?'walk':'idle');if(jumpBuffer>0)startJump()}
if(onGround&&!supported){onGround=false;vy=0;coyote=.16;landedPlatform=null}if(onGround&&supported){landedPlatform=supported;if(supported.fragile&&!supported.collapseAt){supported.collapseAt=time;msg.textContent='⚠️ CRUMBLING PLATFORM — JUMP NOW!'}}
if(onGround&&!won)playMotion(moving?'walk':'idle');
shadowMarker.visible=!!supported;shadowMarker.position.set(player.position.x,.025,player.position.z);shadowMarker.material.opacity=Math.max(.09,.3-player.position.y*.09);landingBurst.forEach(({m,angle})=>{const age=time-landingEffectAt;m.visible=age>=0&&age<.5;if(m.visible){m.position.set(landingEffectX+Math.cos(angle)*age*2.4,.12+age*.8,landingEffectZ+Math.sin(angle)*age*2.4);m.material.opacity=.85*(1-age/.5)}});
surpriseCrates.forEach((c,i)=>{if(c.collected)return;c.group.position.x=c.p.x;c.group.rotation.y+=dt*1.5;c.group.position.y=1.05+Math.sin(time*3+i)*.12;if(!won&&player.position.y>=-.15&&Math.abs(player.position.x-c.group.position.x)<.8&&Math.abs(player.position.z-c.group.position.z)<.8&&player.position.y<1.5){c.collected=true;c.group.visible=false;if(c.kind==='shield'){shields++;document.getElementById('shield').textContent=shields;msg.textContent='🛡️ Shield collected!'}else{speedUntil=runTime+8;msg.textContent='⚡ Speed boost for 8 seconds!'}}});document.getElementById('boost').textContent=runTime<speedUntil?Math.ceil(speedUntil-runTime)+'s':'—';secretGem.rotation.y+=dt*1.8;secretHalo.rotation.z+=dt*.9;secretGem.position.y=1.4+Math.sin(time*3)*.18;if(!won&&player.position.y>=-.15&&!secretCollected&&Math.abs(player.position.x-secretX)<.85&&Math.abs(player.position.z-secretOrigin.z)<.85&&player.position.y<1.5){secretCollected=true;secretGem.visible=false;secretHalo.visible=false;shields++;document.getElementById('shield').textContent=shields;document.getElementById('secrets').textContent='1';msg.textContent='💎 SECRET FOUND! Bonus shield unlocked!'}if(!approvedModel)avatar.rotation.y+=dt*1.6;
if(mixer)mixer.update(dt);
if(player.position.y< -2.4&&!won){respawn('Lava fall')}
checkpoints.forEach((c,i)=>{const p=platforms[c.index];c.x=p.x;c.pole.position.x=p.x-1.3;c.flag.position.x=p.x-.85;if(!won&&!c.passed&&onGround&&supported===platforms[c.index]&&Math.abs(player.position.z-c.z)<1.1){c.passed=true;checkpointZ=c.z;checkpointX=c.x;c.flag.material.color.set('#ffe878');document.getElementById('checkpointLabel').textContent='🏁 Checkpoint '+(i+1);msg.textContent='Checkpoint saved!'}});
obstacles.forEach((o,i)=>{o.pivot.rotation.y=time*(i%2?1.6:-1.6);const rx=player.position.x-o.pivot.position.x,rz=player.position.z-o.pivot.position.z;const a=o.pivot.rotation.y;const along=rx*Math.cos(a)+rz*Math.sin(a),across=-rx*Math.sin(a)+rz*Math.cos(a);if(invulnerable<=0&&!won&&Math.abs(along)<1.52&&Math.abs(across)<.38&&player.position.y>=-.15&&player.position.y<1.05){respawn('Spinning obstacle')}});
invulnerable-=dt;
stars.forEach(({mesh:m,platform:p})=>{m.position.x=p.x;m.position.z=p.z;m.rotation.y+=dt*2;m.position.y=1.25+Math.sin(time*3+p.z)*.13;if(m.visible&&!won&&Math.hypot(player.position.x-m.position.x,player.position.z-m.position.z)<.8&&player.position.y>-.5){m.visible=false;score++;document.getElementById('score').textContent=score;msg.textContent='⭐ Star collected!'}});
fanDecor.forEach((f,i)=>f.rotation.z+=dt*(i%2?1.8:-2.1));boostRings.forEach(({ring,p},i)=>{ring.position.x=p.x;ring.scale.setScalar(1+.08*Math.sin(time*4+i))});lavaTexture.offset.y-=dt*.045;lavaTexture.offset.x+=dt*.018;finishHalo.rotation.z-=dt*.55;edgeLights.forEach(({light,p},i)=>{light.position.x=p.x;light.material.opacity=.35+.25*Math.sin(time*2+i)});particles.forEach(({m,speed,phase})=>{m.position.y+=dt*speed;if(m.position.y>2.2)m.position.y=-2.1;m.rotation.y+=dt*(1+phase*.1)});trophyParticles.forEach(({mesh,phase})=>{const age=time-celebrationAt;mesh.visible=won&&celebrationAt>0&&age<3;if(mesh.visible){mesh.position.set(finish.x+Math.sin(phase)*age*1.4,1.8+Math.cos(phase*2)*age*.6,finish.z+Math.cos(phase)*age*1.4);mesh.rotation.y+=dt*4}});portal.rotation.z+=dt*.25;arrows.forEach((a,i)=>a.position.y=2.8+Math.sin(time*2+i)*.2);
missingStars.hidden=!(score<5&&onGround&&Math.abs(player.position.z-finish.z)<1.1&&Math.abs(player.position.x-finish.x)<1.5&&!won);
if(!missingStars.hidden)missingStars.textContent='Find '+(5-score)+' more star'+(5-score===1?'':'s')+' — you can still move back!';
if(score<5&&onGround&&Math.abs(player.position.z-finish.z)<1.1&&Math.abs(player.position.x-finish.x)<1.5&&!won){msg.textContent='⭐ Find '+(5-score)+' missing star'+(5-score===1?'':'s')+' before finishing!'}if(score===5&&onGround&&Math.abs(player.position.z-finish.z)<1.1&&Math.abs(player.position.x-finish.x)<1.5&&!won){won=true;celebrationAt=time;const medal=!challengeMode?'PRACTICE':!runEligible?'RETRY RUN':runTime<=45?'GOLD':runTime<=75?'SILVER':'BRONZE';document.getElementById('medal').textContent=medal;if(challengeMode&&runEligible&&(bestTime===null||runTime<bestTime)){bestTime=runTime;try{localStorage.setItem('skyRushStormBestV29RC6Review',String(runTime))}catch(e){}document.getElementById('best').textContent=runTime.toFixed(1)+'s';msg.textContent='🏆 '+medal+' · NEW BEST! '+runTime.toFixed(1)+'s'}else{msg.textContent=challengeMode&&!runEligible?'🎉 Retry run complete! Restart for a new best time.':challengeMode?'🏆 '+medal+' · '+runTime.toFixed(1)+'s — beat '+bestTime.toFixed(1)+'s!':'🎉 Practice complete! Try Time Challenge next.'}showResult('complete');}
const follow=new THREE.Vector3(player.position.x,player.position.y+5.2,player.position.z+8.6);camera.position.lerp(follow,Math.min(1,dt*7));camera.lookAt(player.position.x,player.position.y+1.1,player.position.z-4)}
camera.position.set(0,5.3,12);camera.lookAt(0,1,-1);function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?70:62;camera.updateProjectionMatrix();if(!contextLost)renderer.render(scene,camera)}if(typeof ResizeObserver!=='undefined')new ResizeObserver(resize).observe(host);window.addEventListener('resize',resize);window.addEventListener('orientationchange',()=>setTimeout(resize,200));window.addEventListener('orientationchange',()=>clearInput());
/* sky-rush-test-hook */
const requestedMode=new URLSearchParams(location.search).get('mode');
if(requestedMode==='challenge'){modeSelect.value='challenge';modeSelect.dispatchEvent(new Event('change'))}
resize();renderer.render(scene,camera);window.skyRushBoot.ready();requestAnimationFrame(loop);
// Only the current same-origin session shell may restore a file or navigate the session.
if(window.parent!==window){
 sessionPending=true;startRun.disabled=true;
 const handshakeTimeout=setTimeout(()=>{sessionPending=false;startRun.disabled=contextLost;status.textContent='Session unavailable. Select your local file on this page.'},3000);
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==window.parent||event.data?.channel!=='sky-rc6')return;
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

