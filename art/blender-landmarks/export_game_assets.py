"""Export lighter game copies; never save simplification into the artist scene."""
import bpy, math, json
from pathlib import Path

DEST = Path('/Users/janicefong/Desktop/PUI MONOPOLY/assets/models/landmarks')
DEST.mkdir(parents=True, exist_ok=True)
scene = bpy.data.scenes['PUI Fortune | Landmark Atelier']
bpy.context.window.scene = scene
assets = sorted([o for o in scene.objects if o.get('pui_asset_id')], key=lambda o:o['asset_order'])
stats = []

def export_game_range(start, end):
    for obj in assets[start:end]:
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True); bpy.context.view_layer.objects.active = obj
        location = obj.location.copy()
        bevels = [(m, m.segments) for m in obj.modifiers if m.type == 'BEVEL']
        for m, _ in bevels: m.segments = 1
        dissolve = obj.modifiers.new('Web export · planar cleanup', 'DECIMATE')
        dissolve.decimate_type = 'DISSOLVE'; dissolve.angle_limit = math.radians(3)
        dissolve.delimit = {'MATERIAL', 'NORMAL'}
        simplify = None
        try:
            deps = bpy.context.evaluated_depsgraph_get()
            ev = obj.evaluated_get(deps); mesh = ev.to_mesh(); mesh.calc_loop_triangles()
            count = len(mesh.loop_triangles); ev.to_mesh_clear()
            target = 8000 if obj['pui_asset_id'] == 'colosseum' else 5500
            if count > target:
                simplify = obj.modifiers.new('Web export · small detail reduction', 'DECIMATE')
                simplify.ratio = min(1.0, target / count)
                simplify.delimit = {'MATERIAL'}
            obj.location = (0,0,0)
            bpy.ops.export_scene.gltf(filepath=str(DEST/(obj['pui_asset_id']+'.glb')),
                export_format='GLB', use_selection=True, use_active_scene=True,
                export_apply=True, export_extras=True, export_texcoords=False,
                export_tangents=False, export_animations=False)
            deps = bpy.context.evaluated_depsgraph_get()
            ev = obj.evaluated_get(deps); mesh = ev.to_mesh(); mesh.calc_loop_triangles()
            count = len(mesh.loop_triangles); ev.to_mesh_clear()
            stats.append({'id':obj['pui_asset_id'], 'name':obj.name, 'triangles':count})
            print(obj.name, count, 'triangles')
        finally:
            obj.location = location
            if simplify: obj.modifiers.remove(simplify)
            obj.modifiers.remove(dissolve)
            for m, segments in bevels: m.segments = segments
    (DEST/'manifest.json').write_text(json.dumps({'source':'art/blender-landmarks/PUI-Fortune-Landmark-Atelier.blend','assets':stats},indent=2,ensure_ascii=False))
