#!/usr/bin/env python3
"""Validate structural readiness of a candidate glTF/GLB character (no visual likeness claim)."""
import json,struct,sys,pathlib
p=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else "assets/girl.glb")
if not p.is_file():
 print("NOT READY: production model absent:",p);sys.exit(2)
data=p.read_bytes()
if p.suffix.lower()==".glb":
 if len(data)<20 or data[:4]!=b"glTF": print("FAIL: invalid GLB");sys.exit(1)
 _,version,total=struct.unpack_from("<4sII",data)
 if version!=2 or total!=len(data): print("FAIL: invalid GLB header/length");sys.exit(1)
 length,kind=struct.unpack_from("<II",data,12)
 if kind!=0x4E4F534A: print("FAIL: missing JSON chunk");sys.exit(1)
 doc=json.loads(data[20:20+length].decode("utf-8"))
else: doc=json.loads(data.decode("utf-8"))
skins=doc.get("skins",[]);nodes=doc.get("nodes",[]);anims=doc.get("animations",[])
names=[a.get("name","").lower() for a in anims]
required=["idle","walk","run","jump","celebrate"]
missing=[a for a in required if not any(a in n for n in names)]
morphs=sum(len(m.get("weights",[])) for m in doc.get("meshes",[]))
print(json.dumps({"file":str(p),"skins":len(skins),"nodes":len(nodes),"animations":names,"missing_animations":missing,"mesh_weight_targets":morphs},indent=2))
if not skins or missing: print("FAIL: skeletal rig or animation clips incomplete");sys.exit(1)
print("STRUCTURAL CHECK PASS. Face quality, likeness, animation naturalness and iPad remain manual acceptance gates.")
