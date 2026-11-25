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

def build(kind):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    ivory = material('Cal',(.77,.70,.60))
    oak = material('Carvalho',(.44,.27,.15))
    linen = material('Linho',(.77,.70,.58))
    pale = material('Pedra',(.68,.61,.51))
    brass = material('Latão acetinado',(.58,.34,.13))
    background = material('Fundo', {'a':(.17,.11,.075),'b':(.52,.51,.47),'c':(.76,.65,.48)}[kind])
    block(-2000,-2000,2000,2000,0,0,-.38,.14,background)
    size = (888,471)
    outline = [(16,64),(117,64),(117,21),(392,21),(392,143),(494,143),(494,231),(550,231),(550,210),(709,210),(709,71),(849,71),(869,81),(869,119),(850,119),(850,187),(869,187),(869,221),(850,221),(850,272),(869,272),(869,312),(850,312),(850,363),(869,363),(869,393),(850,393),(850,440),(810,440),(810,416),(766,416),(766,440),(729,440),(729,416),(657,416),(657,440),(626,440),(626,417),(622,417),(622,440),(585,440),(585,415),(556,415),(556,440),(522,440),(522,416),(453,416),(453,440),(417,440),(417,418),(301,418),(301,440),(264,440),(264,416),(155,416),(155,440),(114,440),(114,427),(28,427),(28,96),(16,96)]
    slab('Contorno do book p. 16',outline,size,0,.22,None,pale)
    walls = [(121,21,389,26),(263,26,270,98),(332,26,338,98),(385,26,391,106),
             (19,80,160,89),(145,89,152,115),(262,92,291,100),(291,143,488,150),
             (292,150,299,226),(342,150,348,202),(342,219,364,227),
             (404,150,411,233),(486,149,494,238),(407,232,550,240),
             (550,210,707,216),(708,72,850,79),(708,78,715,215),(843,80,850,272),
             (146,149,152,195),(288,279,296,415),(295,278,386,283),(417,285,433,416),
             (435,273,548,280),(581,279,588,315),(624,279,632,417),
             (769,282,776,415),(843,312,850,417)]
    # Conservative cutaway: clear wall strokes only. Leave ambiguous openings unbuilt.
    for rectangle in walls:
        block(*rectangle,*size,0,.58,ivory)
    rooms = [(32,98,141,407),(156,198,286,407),(301,286,407,408),
             (440,242,841,270),(439,294,539,410),(640,291,747,409),(719,81,840,205)]
    for rectangle in rooms:
        block(*rectangle,*size,0,.014,oak)
    def piece(rectangle,z,height,finish,radius=.033):
        block(*rectangle,*size,z,height,finish)
        obj=bpy.context.object
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        bevel=obj.modifiers.new('Arestas suaves','BEVEL')
        bevel.width=radius
        bevel.segments=3
        obj.modifiers.new('Normais ponderadas','WEIGHTED_NORMAL')
    for x1,y1,x2,y2 in [(741,84,831,174),(448,298,516,359),(704,309,764,369)]:
        piece((x1,y1,x2,y2),.02,.14,oak)
        piece((x1+2,y1+2,x2-2,y2-2),.16,.13,linen)
        mid=(x1+x2)/2
        for lo,hi in [(x1+4,mid-2),(mid+2,x2-4)]:
            piece((lo,y1+4,hi,y1+17),.29,.05,ivory)
    for rect in [(162,370,257,403),(316,301,347,374),(162,248,252,277)]:
        x1,y1,x2,y2=rect
        piece(rect,.02,.19,linen)
        piece((x1,y1,x1+8,y2),.21,.17,linen)
        piece((x1+8,y2-7,x2,y2),.21,.13,linen)
    for rect in [(58,226,124,299),(183,305,228,335),(356,334,389,365)]:
        x1,y1,x2,y2=rect
        for x in (x1+2,x2-7):
            for y in (y1+2,y2-7):
                piece((x,y,x+5,y+5),.02,.22,brass,.012)
        piece(rect,.24,.06,oak)
    for rect in [(149,112,230,142),(148,152,171,194),(181,152,253,176),
                 (32,96,107,117),(35,384,111,406),(272,31,320,53),
                 (119,26,171,46),(777,285,840,304)]:
        piece(rect,.02,.32,pale)
    for rect in [(730,213,838,233),(744,255,837,270),(554,215,655,232),(640,282,708,299)]:
        piece(rect,.02,.46,oak)
    for rect in [(361,153,396,168),(594,288,618,307),(639,299,661,318),(795,311,833,331)]:
        piece(rect,.02,.27,ivory)
    if kind=='c':
        for y in (-6.5,6.5):
            bpy.ops.mesh.primitive_cube_add(size=1,location=(0,y,-.232))
            bpy.context.object.dimensions=(21,.012,.008)
            bpy.context.object.data.materials.append(brass)
    location={'a':(3,-8,18),'b':(10,-10,11),'c':(7,-10,15)}[kind]
    bpy.ops.object.camera_add(location=location)
    camera=bpy.context.object
    camera.rotation_euler=(-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='PERSP' if kind=='a' else 'ORTHO'
    camera.data.lens=61
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
    scene.render.filepath=str(output / f'maquette-{kind}.png')
    bpy.ops.render.render(write_still=True)

for kind in ('a','b','c'):
    build(kind)
