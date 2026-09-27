"""Local, non-destructive scan/reference study. Never runs the production pipeline."""
import bpy
import numpy as np
import json
import struct
import hashlib
import math
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(r'D:/SynologyDrive/Free_handsss/freehandsss_dashboard')
RAW = ROOT / '3d/input/Level0(Orginal)/2026-34/Amen/Amen-leftleg/Amen-leftleg.obj'
REF = ROOT / '3d/input/Level0(Orginal)/2026-34/Amen/Amen-leftleg-925-CF.stl'
OUT = ROOT / '3d/output/astra-texture-study-2026-09-27'
PROJECT = ROOT / '3d/projects/astra-texture-study-2026-09-27'
STATE = bpy.app.driver_namespace.setdefault('ASTRA_TEXTURE_STUDY', {})

def resume():
    scene=bpy.data.scenes['Astra_Texture_Study_2026_09_27']
    STATE['scene']=scene
    STATE['meshes']={key:dict(obj=scene.objects[key]) for key in ['RAW','MASTER']}
    STATE['labels']=[scene.objects[n] for n in ['RAW SCAN','SCULPTED REFERENCE']]
    STATE['stats']=json.loads((OUT/'measurements.json').read_text(encoding='utf-8'))
    bpy.context.window.scene=scene

def read_obj(path):
    vertices, faces = [], []
    with path.open(encoding='utf-8', errors='replace') as f:
        for line in f:
            if line.startswith('v '):
                vertices.append(tuple(map(float, line.split()[1:4])))
            elif line.startswith('f '):
                indices = [int(t.split('/')[0]) for t in line.split()[1:]]
                indices = [i-1 if i>0 else len(vertices)+i for i in indices]
                faces.extend((indices[0], indices[j], indices[j+1]) for j in range(1,len(indices)-1))
    return np.asarray(vertices,dtype=np.float32), np.asarray(faces,dtype=np.int32)

def read_stl(path):
    with path.open('rb') as f:
        f.seek(80)
        count=struct.unpack('<I',f.read(4))[0]
    assert path.stat().st_size == 84 + 50*count
    dt=np.dtype([('normal','<f4',(3,)),('v','<f4',(3,3)),('attr','<u2')])
    data=np.memmap(path,dtype=dt,mode='r',offset=84,shape=(count,))
    # Exact welding solely for smooth display; no coordinate changes.
    vertices,inverse=np.unique(data['v'].reshape(-1,3),axis=0,return_inverse=True)
    return vertices.astype(np.float32),inverse.reshape(-1,3).astype(np.int32)

def summary(v,f,path):
    triangles=v[f]
    areas=np.linalg.norm(np.cross(triangles[:,1]-triangles[:,0],triangles[:,2]-triangles[:,0]),axis=1)*0.5
    edges=np.concatenate((f[:,[0,1]],f[:,[1,2]],f[:,[2,0]]))
    edges.sort(axis=1)
    _,counts=np.unique(edges,axis=0,return_counts=True)
    return dict(source=str(path),bytes=path.stat().st_size,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
        vertices=len(v),triangles=len(f),finite=bool(np.isfinite(v).all()),bounds_min=v.min(0).tolist(),
        bounds_max=v.max(0).tolist(),extents_native=v.ptp(0).tolist() if hasattr(v,'ptp') else np.ptp(v,axis=0).tolist(),
        area_native=float(areas.sum()),zero_area_triangles=int((areas<1e-12).sum()),
        boundary_edges=int((counts==1).sum()),edges_over_two_faces=int((counts>2).sum()))

def principal_frame(v,f):
    # Area-weighted triangle centres reduce bias from differing tessellation density.
    t=v[f].astype(np.float64)
    a=np.linalg.norm(np.cross(t[:,1]-t[:,0],t[:,2]-t[:,0]),axis=1)*0.5
    centres=t.mean(axis=1)
    c=np.average(centres,axis=0,weights=a)
    z=centres-c
    cov=(z*a[:,None]).T@z/a.sum()
    values,vectors=np.linalg.eigh(cov)
    y=vectors[:,2]; x=vectors[:,1]; z=np.cross(x,y)
    frame=np.column_stack((x,y,z))
    aligned=(v-c)@frame
    factor=30.5/np.ptp(aligned,axis=0)[1]
    aligned*=factor
    aligned-=(aligned.min(0)+aligned.max(0))*0.5
    return aligned.astype(np.float32),dict(frame=frame.tolist(),centroid=c.tolist(),display_scale=float(factor),
        display_note='Independently normalized principal-axis length to 30.5 display units; not a production-size measurement.')

def add_mesh(name,v,f,scene):
    mesh=bpy.data.meshes.new(name+'_mesh')
    mesh.vertices.add(len(v));mesh.vertices.foreach_set('co',v.ravel())
    mesh.loops.add(f.size);mesh.loops.foreach_set('vertex_index',f.ravel())
    mesh.polygons.add(len(f));mesh.polygons.foreach_set('loop_start',np.arange(0,f.size,3,dtype=np.int32))
    mesh.polygons.foreach_set('loop_total',np.full(len(f),3,dtype=np.int32))
    mesh.polygons.foreach_set('use_smooth',np.ones(len(f),dtype=bool))
    mesh.update(calc_edges=True)
    obj=bpy.data.objects.new(name,mesh);scene.collection.objects.link(obj)
    return obj

def set_enum(owner,key,value):
    valid=[i.identifier for i in owner.bl_rna.properties[key].enum_items]
    if value not in valid: raise ValueError((key,value,valid))
    setattr(owner,key,value)

def prepare():
    if 'Astra_Texture_Study_2026_09_27' in bpy.data.scenes:
        raise RuntimeError('Study scene already exists; call resume() rather than duplicating it.')
    OUT.mkdir(parents=True,exist_ok=True);PROJECT.mkdir(parents=True,exist_ok=True)
    backup=PROJECT/'before_analysis.blend'
    if not backup.exists(): bpy.ops.wm.save_as_mainfile(filepath=str(backup),copy=True)
    scene=bpy.data.scenes.new('Astra_Texture_Study_2026_09_27')
    bpy.context.window.scene=scene
    STATE['scene']=scene;STATE['meshes']={};STATE['stats']={}
    for key,path,reader in [('RAW',RAW,read_obj),('MASTER',REF,read_stl)]:
        v,f=reader(path)
        assert len(v)>0 and np.isfinite(v).all()
        info=summary(v,f,path)
        normalized,alignment=principal_frame(v,f)
        obj=add_mesh(key,normalized,f,scene)
        STATE['meshes'][key]=dict(v=v,f=f,display=normalized,obj=obj)
        STATE['stats'][key]=dict(**info,**alignment)
    STATE['meshes']['MASTER']['obj'].rotation_euler=(math.pi,0,0)
    STATE['stats']['MASTER']['display_rotation_radians']=[math.pi,0,0]
    camera=bpy.data.cameras.new('Study_Ortho');camera.type='ORTHO'
    cam=bpy.data.objects.new('Study_Camera',camera);scene.collection.objects.link(cam);scene.camera=cam
    scene.render.engine='BLENDER_WORKBENCH'
    shading=scene.display.shading
    set_enum(shading,'light','STUDIO');set_enum(shading,'color_type','SINGLE')
    shading.single_color=(0.65,0.65,0.65)
    set_enum(shading,'background_type','WORLD')
    scene.world=bpy.data.worlds.new('Study_Background');scene.world.color=(0.035,0.035,0.035)
    shading.show_cavity=False;shading.show_shadows=False;shading.show_specular_highlight=False
    scene.render.resolution_x=1800;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
    labels=[]
    for title in ['RAW SCAN','SCULPTED REFERENCE']:
        curve=bpy.data.curves.new(title,'FONT');curve.body=title;curve.align_x='CENTER';curve.size=1.05
        obj=bpy.data.objects.new(title,curve);scene.collection.objects.link(obj);labels.append(obj)
    STATE['labels']=labels
    (OUT/'measurements.json').write_text(json.dumps(STATE['stats'],indent=2),encoding='utf-8')
    print(json.dumps(STATE['stats']))

def render_pair(tag,direction,flip_master=None,focus=(0,0,0),width=65,gap=26):
    scene=STATE['scene'];cam=scene.camera
    scene.display.shading.show_shadows=False
    if flip_master is not None:
        obj=STATE['meshes']['MASTER']['obj'];obj.rotation_euler=flip_master
    direction=Vector(direction).normalized()
    up_hint=Vector((0,-1,0)) if abs(direction.y)<0.95 else Vector((0,0,1))
    right=up_hint.cross(direction).normalized();up=direction.cross(right).normalized()
    rot=Matrix((right,up,direction)).transposed().to_quaternion()
    target=Vector(focus)
    cam.rotation_euler=rot.to_euler();cam.location=target+direction*110
    half_height=width*scene.render.resolution_y/scene.render.resolution_x/2
    for idx,key in enumerate(['RAW','MASTER']):
        STATE['meshes'][key]['obj'].location=right*((idx-0.5)*gap)
        text=STATE['labels'][idx];text.rotation_euler=rot.to_euler()
        text.data.size=width/62
        text.location=target+right*((idx-0.5)*gap)+up*(half_height-width/24)+direction*24
    cam.data.ortho_scale=width
    scene.render.filepath=str(OUT/(tag+'.png'))
    bpy.ops.render.render(write_still=True,scene=scene.name)
    print(scene.render.filepath)

def viewport_camera():
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                area.spaces.active.region_3d.view_perspective='CAMERA'
                area.spaces.active.overlay.show_overlays=False
                area.spaces.active.shading.show_cavity=False
                area.spaces.active.shading.color_type='SINGLE'
                area.spaces.active.shading.single_color=(0.65,0.65,0.65)

def save_project():
    bpy.ops.wm.save_as_mainfile(filepath=str(PROJECT/'texture_comparison.blend'),copy=True)

def render_suite():
    STATE['meshes']['MASTER']['obj'].rotation_euler=(math.pi,0,0)
    render_pair('07_dorsal_comparison',(0,0,1))
    render_pair('08_sole_comparison',(0,0,-1))
    render_pair('09_nails_detail',(0,0,1),focus=(0,-10.5,0),width=34,gap=15)
    render_pair('10_sole_detail',(0,0,-1),focus=(0,-7.5,0),width=36,gap=16)
    render_pair('11_ankle_oblique',(1,0,0.6),focus=(0,7,0),width=39,gap=17)
