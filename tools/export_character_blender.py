"""Run inside Blender: blender -b character.blend --python tools/export_character_blender.py
Requires an artist-created, approved character .blend. Does not generate a likeness.
"""
import bpy, os, sys
from pathlib import Path

ROOT=Path(bpy.path.abspath("//"))
OUT=ROOT/"assets"/"girl.glb"
required={"idle","walk","run","jump","celebrate"}
armatures=[o for o in bpy.data.objects if o.type=="ARMATURE"]
if not armatures:
    raise RuntimeError("No armature found. Create and rig the approved character first.")
skinned=[o for o in bpy.data.objects if o.type=="MESH" and any(m.type=="ARMATURE" for m in o.modifiers)]
if not skinned:
    raise RuntimeError("No skinned mesh bound to armature.")
actions={a.name.lower() for a in bpy.data.actions}
missing={name for name in required if not any(name in action for action in actions)}
if missing:
    raise RuntimeError("Missing required animation actions: "+", ".join(sorted(missing)))
shape_keys={k.name.lower() for o in skinned if o.data.shape_keys for k in o.data.shape_keys.key_blocks}
facial={"blink","smile","mouth","brow","eye"}
if not any(any(f in key for f in facial) for key in shape_keys):
    raise RuntimeError("No facial shape keys detected. Add face expressions before export.")
OUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format="GLB",export_animations=True,export_skins=True,export_morph=True,export_yup=True)
print("Exported:",OUT,"size:",OUT.stat().st_size)
print("NOTE: Export success does not certify likeness, animation quality, licensing or iPad performance.")
