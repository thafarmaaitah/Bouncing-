export function validateLocalGLB(buffer) {
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
