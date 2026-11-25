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

def build(key,spec):
    kind='a'
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    ivory=material('Cal',(.77,.70,.60))
    pale=material('Pedra',(.68,.61,.51))
    oak=material('Carvalho',(.44,.27,.15))
    linen=material('Linho',(.77,.70,.58))
    background=material('Fundo',(.17,.11,.075))
    block(-2000,-2000,2000,2000,0,0,-.38,.14,background)
    size=spec['size']
    slab('Contorno do book',spec['outline'],size,0,.22,None,pale)
    for rect in spec['walls']:
        block(*rect,*size,0,.58,ivory)
    def finish(rect,z,height,material):
        block(*rect,*size,z,height,material)
        obj=bpy.context.object
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        bevel=obj.modifiers.new('Arestas suaves','BEVEL')
        bevel.width=.025
        bevel.segments=3
        obj.modifiers.new('Normais ponderadas','WEIGHTED_NORMAL')
    for rect in spec['beds']:
        x1,y1,x2,y2=rect
        finish(rect,.01,.15,oak)
        finish((x1+2,y1+2,x2-2,y2-2),.16,.12,linen)
        finish((x1+3,y1+3,x2-3,y1+10),.28,.06,ivory)
    for rect in spec['loose']:
        finish(rect,0,.29,oak)
    location={'a':(3,-8,18),'b':(10,-10,11),'c':(7,-10,15)}[kind]
    bpy.ops.object.camera_add(location=location)
    camera=bpy.context.object
    camera.rotation_euler=(-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='PERSP' if kind=='a' else 'ORTHO'
    xs,ys=zip(*spec['outline'])
    span=max(max(xs)-min(xs),max(ys)-min(ys))
    camera.data.lens=61*840/span
    target=Vector((((max(xs)+min(xs))/2-size[0]/2)*scale,
                   (size[1]/2-(max(ys)+min(ys))/2)*scale,0))
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=10.8
    scene=bpy.context.scene
    scene.camera=camera
    for location,power,size,color in [
        ((-5,-4,8),2300,5,(1,.84,.65)),
        ((3,5,7),1700 if kind=='b' else 750,7,(.82,.9,1)),
    ]:
        bpy.ops.object.light_add(type='AREA',location=location)
        light=bpy.context.object
        light.rotation_euler=(-light.location).to_track_quat('-Z','Y').to_euler()
        light.data.energy=power
        light.data.size=size
        light.data.color=color
    scene.world.use_nodes=True
    scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.37
    scene.render.engine='CYCLES'
    scene.cycles.samples=48
    scene.cycles.use_denoising=False
    scene.render.resolution_x,scene.render.resolution_y=1500,1050
    scene.render.resolution_percentage=100
    scene.render.filepath=str(output / f'{key}-maquette.png')
    bpy.ops.render.render(write_still=True)

import json
for key,spec in json.loads((Path(__file__).with_name('maquette-geometry.json')).read_text()).items():
    if not (output / f"{key}-maquette.png").exists():
        build(key,spec)
