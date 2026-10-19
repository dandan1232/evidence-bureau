"""Rebuild the desk with Blender: blender -b --python scripts/build-desk.py.

All dimensions are in meters. Helpers accept the game's Y-up coordinates;
Blender's glTF exporter converts its Z-up scene back to those coordinates.
"""

import json
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "evidence"
PUBLIC = ROOT / "public" / "cases" / "vanished-tenant"
PREVIEWS = ROOT / "node_modules" / ".cache" / "desk-previews"
for folder in (SOURCE, PUBLIC / "evidence", PUBLIC / "images", PREVIEWS):
    folder.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
random.seed(407)


def position(point):
    return (point[0], -point[2], point[1])


def material(name, color, roughness=0.7, metalness=0):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*color, 1)
    result.use_nodes = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metalness
    return result


wood = material("Aged walnut", (0.23, 0.18, 0.125), 0.74)
fresh = material("Exposed wood fibers", (0.49, 0.39, 0.25), 0.93)
iron = material("Oxidized iron", (0.095, 0.105, 0.1), 0.65, 0.6)
brass = material("Dulled brass", (0.29, 0.23, 0.12), 0.45, 0.72)
dust = material("Accumulated plaster dust", (0.39, 0.38, 0.33), 1)
paper = material("Evidence label paper", (0.63, 0.61, 0.51), 0.95)
ink = material("Label ink", (0.08, 0.08, 0.07), 1)

# A packed, deterministic texture survives GLB export without external files.
image = bpy.data.images.new("Walnut grain", width=512, height=256)
pixels = []
for row in range(256):
    for column in range(512):
        u, v = column / 512, row / 256
        flow = v * 78 + 0.75 * math.sin(u * 8) + 0.25 * math.sin(u * 29 + v * 9)
        grain = math.sin(flow * math.tau)
        pores = max(0, math.sin(flow * math.tau * 3.7)) ** 16
        variation = 0.89 + grain * 0.075 - pores * 0.08 + random.random() * 0.035
        pixels.extend((0.34 * variation, 0.26 * variation, 0.18 * variation, 1))
image.pixels.foreach_set(pixels)
image.pack()
texture = wood.node_tree.nodes.new("ShaderNodeTexImage")
texture.image = image
wood.node_tree.links.new(texture.outputs["Color"], wood.node_tree.nodes.get("Principled BSDF").inputs["Base Color"])

parts = []


def finish(obj, name, mat, bevel=0):
    obj.name = name
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new("Worn edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    parts.append(obj)
    return obj


def box(name, center, size, mat=wood, bevel=0.003):
    bpy.ops.mesh.primitive_cube_add(size=1, location=position(center))
    obj = bpy.context.object
    obj.dimensions = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, bevel)


def polygon_prism(name, outline, bottom, top, mat):
    count = len(outline)
    vertices = [position((x, y, z)) for y in (bottom, top) for x, z in outline]
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    faces.extend((index, (index + 1) % count, (index + 1) % count + count, index + count) for index in range(count))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.uv.cube_project(cube_size=1)
    bpy.ops.object.mode_set(mode="OBJECT")
    obj.select_set(False)
    return finish(obj, name, mat, 0.0015)


def screw(center, radius=0.004):
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=radius, depth=0.002, location=position(center), rotation=(math.pi / 2, 0, 0))
    finish(bpy.context.object, "Slotted fastener", brass, 0.0005)
    box("Screw slot", (center[0], center[1], center[2] + 0.0012), (radius * 1.3, 0.0007, 0.0006), iron, 0)


# Four separate planks and a chipped rear edge, rather than painted damage.
for index in range(4):
    near, far = -0.38 + index * 0.19 + 0.0006, -0.38 + (index + 1) * 0.19 - 0.0006
    outline = [(-0.71, near), (0.71, near), (0.71, far), (-0.71, far)]
    if index == 0:
        outline = [(-0.71, near), (0.39, near), (0.409, near + 0.013), (0.422, near + 0.008), (0.44, near + 0.033), (0.455, near + 0.018), (0.471, near + 0.021), (0.49, near), (0.71, near), (0.71, far), (-0.71, far)]
    plank = polygon_prism(f"Tabletop plank {index + 1}", outline, 0.725, 0.76, wood)
    if index == 0:
        plank["clueId"] = "desk-wall-impact-notch"
        plank.data.materials.append(fresh)
        for face in plank.data.polygons:
            midpoint = plank.matrix_world @ face.center
            if 0.39 < midpoint.x < 0.49 and midpoint.y > 0.345:
                face.material_index = 1

for x in (-0.585, 0.585):
    for z in (-0.265, 0.265):
        outline = [(x - 0.024, z - 0.024), (x + 0.024, z - 0.024), (x + 0.024, z + 0.024), (x - 0.024, z + 0.024)]
        polygon_prism("Square walnut leg", outline, 0.012, 0.725, wood)
        box("Iron foot collar", (x, 0.025, z), (0.052, 0.025, 0.052), iron, 0.001)

box("Rear apron", (0, 0.652, -0.268), (1.22, 0.135, 0.032))
for x in (-0.585, 0.585):
    box("Side apron", (x, 0.652, 0), (0.032, 0.135, 0.55))
    box("Lower side stretcher", (x, 0.21, 0), (0.027, 0.038, 0.53))
box("Front rail left", (-0.462, 0.655, 0.268), (0.27, 0.13, 0.034))
box("Front rail right", (0.462, 0.655, 0.268), (0.27, 0.13, 0.034))
box("Drawer body", (0, 0.66, 0.02), (0.65, 0.09, 0.46))
box("Inset drawer front", (0, 0.65, 0.29), (0.65, 0.105, 0.022))
box("Drawer inset field", (0, 0.65, 0.303), (0.59, 0.065, 0.004), wood, 0.001)
for x in (-0.07, 0.07):
    box("Handle mount", (x, 0.655, 0.313), (0.025, 0.024, 0.007), brass, 0.003)
    box("Handle stem", (x, 0.646, 0.33), (0.009, 0.025, 0.025), brass, 0.003)
    screw((x, 0.655, 0.318))
box("Drawer pull", (0, 0.635, 0.34), (0.15, 0.01, 0.01), brass, 0.004)

# Added metalwork is structurally independent and tagged for wireframe inspection.
bracket = box("Added transverse hold-down bracket", (0, 0.555, -0.13), (1.08, 0.035, 0.055), iron, 0.0015)
bracket["clueId"] = "desk-underside-bracket"
bracket["inspectionTool"] = "wireframe"
for x in (-0.51, 0.51):
    obj = box("Retrofitted bracket mount", (x, 0.615, -0.13), (0.038, 0.12, 0.055), iron, 0.001)
    obj["inspectionTool"] = "wireframe"
    screw((x, 0.64, -0.099))
    screw((x, 0.573, -0.099))

# A broken dust boundary and raised splinters make the low side light useful.
scuff = box("Fresh abrasion on front left leg", (-0.585, 0.085, 0.2893), (0.042, 0.065, 0.001), fresh, 0.0003)
scuff["clueId"] = "desk-leg-fresh-scrape"
for index in range(8):
    x = -0.603 + index * 0.005
    fiber = box("Exposed abrasion fiber", (x, 0.067 + random.random() * 0.021, 0.2902), (0.0012, 0.029 + random.random() * 0.014, 0.0008), dust if index % 3 == 0 else fresh, 0.0002)
    fiber.rotation_euler.y = random.uniform(-0.12, 0.12)
box("Old dust above abrasion", (-0.585, 0.121, 0.2892), (0.046, 0.006, 0.0005), dust, 0)

# Small fibers curl out of the rear impact notch.
for index in range(5):
    fiber = box("Rear edge splinter", (0.412 + index * 0.013, 0.751, -0.367 + random.random() * 0.012), (0.002, 0.003, 0.018), fresh, 0.0005)
    fiber.rotation_euler.x = 0.15 + index * 0.06

tag = box("Evidence inventory plate", (0.53, 0.654, 0.287), (0.09, 0.035, 0.0015), paper, 0.0005)
bpy.ops.object.text_add(location=position((0.492, 0.648, 0.288)))
label = bpy.context.object
label.data.body = "EB / 017"
label.data.size = 0.012
label.data.extrude = 0
label.rotation_euler = (math.pi / 2, 0, 0)
bpy.ops.object.convert(target="MESH")
finish(bpy.context.object, "Inventory plate lettering", ink)

# Only the evidence is selected for export: no floor, lights or cameras in GLB.
bpy.ops.object.select_all(action="DESELECT")
for part in parts:
    part.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(PUBLIC / "evidence" / "desk.glb"), export_format="GLB", use_selection=True, export_extras=True, export_animations=False, export_yup=True, export_cameras=False, export_lights=False)

scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.render.engine = "CYCLES"
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.resolution_x = 1000
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.world.color = (0.1, 0.1, 0.1)


def area(name, center, energy, size, target):
    bpy.ops.object.light_add(type="AREA", location=position(center))
    lamp = bpy.context.object
    lamp.name = name
    lamp.data.energy = energy
    lamp.data.shape = "DISK"
    lamp.data.size = size
    lamp.rotation_euler = (Vector(position(target)) - lamp.location).to_track_quat("-Z", "Y").to_euler()


area("Large laboratory softbox", (1.4, 2.8, 1.2), 180, 2, (0, 0.4, 0))
area("Rear edge light", (-1.6, 1.6, -1), 120, 1.5, (0, 0.5, 0))
area("Front fill", (-1, 0.5, 1.5), 35, 1, (0, 0.35, 0))
bpy.ops.object.camera_add(location=position((1.6, 1.12, 1.9)))
camera = bpy.context.object
scene.camera = camera
camera.data.lens = 50
camera.rotation_euler = (Vector(position((0, 0.38, 0))) - camera.location).to_track_quat("-Z", "Y").to_euler()
scene.render.film_transparent = True
scene.render.filepath = str(PUBLIC / "images" / "desk-poster.png")
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / "desk.blend"), compress=True)
bpy.ops.render.render(write_still=True)

manifest = {"generator": "scripts/build-desk.py", "units": "meters", "dimensions": {"width": 1.42, "depth": 0.76, "height": 0.76}, "meshes": len(parts), "glbBytes": (PUBLIC / "evidence" / "desk.glb").stat().st_size}
print("DESK_ASSET " + json.dumps(manifest))
