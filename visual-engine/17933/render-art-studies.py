import bpy, math, sys
from pathlib import Path
from mathutils import Vector

source = Path(sys.argv[-2])
output = Path(sys.argv[-1])
scale = .01

def material(name, color, image=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = .72
    if image:
        texture = mat.node_tree.nodes.new('ShaderNodeTexImage')
        texture.image = bpy.data.images.load(str(source / image), check_existing=True)
        mat.node_tree.links.new(texture.outputs['Color'], bsdf.inputs['Base Color'])
    return mat

def slab(name, outline, size, height, depth, image, face):
    width, length = size
    points = [((x-width/2)*scale, (length/2-y)*scale) for x,y in outline]
    n = len(points)
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([(x,y,z) for z in (height,height-depth) for x,y in points], [],
                     [tuple(reversed(range(n))), tuple(range(n, 2*n))] +
                     [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)])
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material(name,(.8,.75,.65),image))
    obj.data.materials.append(face)
    uv = mesh.uv_layers.new()
    for poly in mesh.polygons:
        poly.material_index = int(poly.index != 0)
        for loop in poly.loop_indices:
            x,y = outline[mesh.loops[loop].vertex_index % n]
            uv.data[loop].uv = (x/width, 1-y/length)

def block(x1,y1,x2,y2,width,length,z,height,mat):
    bpy.ops.mesh.primitive_cube_add(size=1,location=((x1+x2-width)*scale/2,(length-y1-y2)*scale/2,z+height/2))
    obj = bpy.context.object
    obj.dimensions = ((x2-x1)*scale,(y2-y1)*scale,height)
    obj.data.materials.append(mat)

def render(kind):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    ivory = material('Marfim',(.73,.65,.53))
    floor = material('Travertino',(.79,.72,.62))
    block(-1400,-1400,1400,1400,0,0,-.5,.2,floor)
    if kind == 'maquette':
        size = (888,471)
        outline = [(16,64),(117,64),(117,21),(392,21),(392,143),(494,143),(494,231),(550,231),(550,210),(709,210),(709,71),(849,71),(869,81),(869,119),(850,119),(850,187),(869,187),(869,221),(850,221),(850,272),(869,272),(869,312),(850,312),(850,363),(869,363),(869,393),(850,393),(850,440),(810,440),(810,416),(766,416),(766,440),(729,440),(729,416),(657,416),(657,440),(626,440),(626,417),(622,417),(622,440),(585,440),(585,415),(556,415),(556,440),(522,440),(522,416),(453,416),(453,440),(417,440),(417,418),(301,418),(301,440),(264,440),(264,416),(155,416),(155,440),(114,440),(114,427),(28,427),(28,96),(16,96)]
        slab('Base 191 m²',outline,size,0,.16,'original-16.webp',ivory)
        # Raise only clearly legible solid strokes; openings and less legible details remain in the book texture.
        walls = [(121,21,389,26),(263,26,270,98),(332,26,338,98),(385,26,391,106),
                 (19,80,160,89),(145,89,152,115),(262,92,291,100),(291,143,488,150),
                 (292,150,299,226),(342,150,348,202),(342,219,364,227),
                 (404,150,411,233),(486,149,494,238),(407,232,550,240),
                 (550,210,707,216),(708,72,850,79),(708,78,715,215),(843,80,850,272),
                 (146,149,152,195),(288,279,296,415),(295,278,386,283),(417,285,433,416),
                 (435,273,548,280),(581,279,588,315),(624,279,632,417),
                 (769,282,776,415),(843,312,850,417)]
        for rectangle in walls:
            block(*rectangle,*size,0,.36,ivory)
        target, ortho = (0,0,0), 10.9
    else:
        size = (913,619)
        slab('Térreo',[(10,0),(902,0),(902,596),(10,596)],size,0,.22,'original-5.webp',ivory)
        slab('Primeiro pavimento',[(419,86),(775,86),(775,163),(873,163),(873,433),(652,433),(652,405),(592,405),(592,439),(419,439)],size,2.28,.18,'original-6.webp',ivory)
        target, ortho = (0,0,.95), 12.0
    bpy.ops.object.camera_add(location=(10,-12,13))
    camera = bpy.context.object
    camera.rotation_euler = (Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = ortho
    scene = bpy.context.scene
    scene.camera = camera
    for location, power, size in [((-5,-4,10),2400,7),((5,3,8),1250,6)]:
        bpy.ops.object.light_add(type='AREA',location=location)
        lamp = bpy.context.object
        lamp.rotation_euler = (-lamp.location).to_track_quat('-Z','Y').to_euler()
        lamp.data.energy = power
        lamp.data.shape = 'DISK'
        lamp.data.size = size
    scene.world.use_nodes = True
    scene.world.node_tree.nodes.get('Background').inputs[0].default_value = (.55,.50,.44,1)
    scene.world.node_tree.nodes.get('Background').inputs[1].default_value = .45
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 48
    scene.cycles.use_denoising = False
    scene.render.resolution_x, scene.render.resolution_y = 1450, 1200
    scene.render.resolution_percentage = 100
    scene.render.filepath = str(output / (kind + '.png'))
    bpy.ops.wm.save_as_mainfile(filepath=str(output / (kind + '.blend')))
    bpy.ops.render.render(write_still=True)

for kind in ('maquette','implantacao'):
    render(kind)
