"""CodeBreakers HELM asset factory for Blender 5.2 (Cycles, CPU).

Builds every 3D asset the game ships, procedurally, from primitives and node
materials. Nothing is imported or downloaded.

  blender -b --factory-startup -P assets.py -- <out_dir> [groups]

groups: comma list of planets, thumbs, pieces, arcade, fighters (default: all)
"""
import bpy, math, os, sys
from mathutils import Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else os.getcwd())
GROUPS = set((ARGS[1] if len(ARGS) > 1 else 'all').split(','))
os.makedirs(OUT, exist_ok=True)


def want(group):
    return 'all' in GROUPS or group in GROUPS


# ---------------------------------------------------------------- colour + scene
def lin(hex_color):
    hex_color = hex_color.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(hex_color[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


HULL, STEEL, DARK, YEL = '#d9dcd4', '#3b444d', '#171c21', '#ffd21f'
CYAN, RED, GREEN, VIOLET, ORANGE, AMBER = '#7fd8ff', '#ff4b3a', '#5fe0a0', '#b48cff', '#ff8a2a', '#ffb35c'


def reset(res=256, samples=56):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    s.cycles.device = 'CPU'
    s.cycles.samples = samples
    s.cycles.use_denoising = True
    s.cycles.max_bounces = 6
    s.render.film_transparent = True
    s.render.resolution_x = s.render.resolution_y = res
    s.render.resolution_percentage = 100
    try:
        s.view_settings.view_transform = 'AgX'
        for look in ('AgX - Medium High Contrast', 'Medium High Contrast', 'AgX - Punchy', 'Punchy'):
            try:
                s.view_settings.look = look
                break
            except TypeError:
                continue
    except TypeError:
        pass
    s.render.image_settings.file_format = 'WEBP'
    s.render.image_settings.color_mode = 'RGBA'
    s.render.image_settings.quality = 84
    world = bpy.data.worlds.new('space')
    s.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs[0].default_value = lin('#0b1016')
    bg.inputs[1].default_value = 0.5
    return s


def material(name, color, metal=0.0, rough=0.45, emit=None, strength=0.0, alpha=1.0, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = lin(color)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    b.inputs['Coat Weight'].default_value = coat
    if emit:
        b.inputs['Emission Color'].default_value = lin(emit)
        b.inputs['Emission Strength'].default_value = strength
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
    return m


def hazard_material(name='hazard', a=YEL, b=DARK, scale=3.0):
    """Diagonal hazard stripes: the one painted pattern the whole kit shares."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    coord = nt.nodes.new('ShaderNodeTexCoord')
    wave = nt.nodes.new('ShaderNodeTexWave')
    wave.wave_type = 'BANDS'
    wave.bands_direction = 'DIAGONAL'
    wave.inputs['Scale'].default_value = scale
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    ramp.color_ramp.elements[0].color = lin(b)
    ramp.color_ramp.elements[1].position = 0.5
    ramp.color_ramp.elements[1].color = lin(a)
    nt.links.new(coord.outputs['Object'], wave.inputs['Vector'])
    nt.links.new(wave.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.5
    return m


MATS = {}


def mats():
    if MATS:
        return MATS
    MATS.update(
        hull=material('hull', HULL, 0.05, 0.38, coat=0.3),
        steel=material('steel', STEEL, 0.7, 0.34),
        dark=material('dark', DARK, 0.5, 0.42),
        yel=material('yel', YEL, 0.0, 0.4, coat=0.2),
        cyan=material('cyan', '#0b1e28', 0, 0.2, emit=CYAN, strength=6),
        red=material('red', '#2a0b08', 0, 0.3, emit=RED, strength=6),
        green=material('green', '#0a2418', 0, 0.3, emit=GREEN, strength=5),
        violet=material('violet', '#1a1030', 0, 0.3, emit=VIOLET, strength=6),
        orange=material('orange', '#2a1406', 0, 0.3, emit=ORANGE, strength=7),
        amber=material('amber', AMBER, 0.2, 0.35, emit=AMBER, strength=1.2),
        dim=material('dim', '#1e2a33', 0.3, 0.4, emit='#2c6a85', strength=0.6),
        glass=material('glass', '#7fd8ff', 0, 0.05, emit=CYAN, strength=1.6, alpha=0.55),
        redglass=material('redglass', '#ff4b3a', 0, 0.1, emit=RED, strength=2.5, alpha=0.5),
        hazard=hazard_material(),
    )
    for m in (MATS['glass'], MATS['redglass']):
        try:
            m.surface_render_method = 'BLENDED'
        except AttributeError:
            pass
    return MATS


# ---------------------------------------------------------------- primitives
def _active():
    return bpy.context.view_layer.objects.active


def _finish(o, mat=None, bevel=0.0, seg=2, smooth=False):
    if mat:
        o.data.materials.clear()
        o.data.materials.append(mat)
    if bevel:
        mod = o.modifiers.new('bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = seg
        mod.limit_method = 'ANGLE'
    if smooth:
        for p in o.data.polygons:
            p.use_smooth = True
    return o


def box(size, loc=(0, 0, 0), rot=(0, 0, 0), mat=None, bevel=0.03, seg=2):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=[math.radians(r) for r in rot])
    o = _active()
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return _finish(o, mat, bevel, seg)


def cyl(r, depth, loc=(0, 0, 0), rot=(0, 0, 0), mat=None, verts=40, bevel=0.015, smooth=True):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc,
                                        rotation=[math.radians(a) for a in rot])
    o = _finish(_active(), mat, bevel, 2, smooth)
    if smooth:
        try:
            bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
        except Exception:
            pass
    return o


def ball(r, loc=(0, 0, 0), mat=None, scale=(1, 1, 1), seg=48):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=r, location=loc)
    o = _active()
    o.scale = scale
    return _finish(o, mat, smooth=True)


def ring(major, minor, loc=(0, 0, 0), rot=(0, 0, 0), mat=None, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=64,
                                     minor_segments=16, location=loc, rotation=[math.radians(a) for a in rot])
    o = _active()
    o.scale = scale
    return _finish(o, mat, smooth=True)


def poly_prism(points, depth, loc=(0, 0, 0), rot=(0, 0, 0), mat=None, bevel=0.02):
    """Extruded 2D outline (used for bolts and chevrons)."""
    import bmesh
    mesh = bpy.data.meshes.new('prism')
    bm = bmesh.new()
    verts = [bm.verts.new((x, y, -depth / 2)) for x, y in points]
    face = bm.faces.new(verts)
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    for v in [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]:
        v.co.z += depth
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    o = bpy.data.objects.new('prism', mesh)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = [math.radians(a) for a in rot]
    return _finish(o, mat, bevel)


def octahedron(r, h, loc, mat):
    import bmesh
    mesh = bpy.data.meshes.new('oct')
    bm = bmesh.new()
    top, bot = bm.verts.new((0, 0, h)), bm.verts.new((0, 0, -h))
    mid = [bm.verts.new((r * math.cos(a), r * math.sin(a), 0)) for a in [i * math.pi / 2 + math.pi / 4 for i in range(4)]]
    for i in range(4):
        bm.faces.new((top, mid[i], mid[(i + 1) % 4]))
        bm.faces.new((bot, mid[(i + 1) % 4], mid[i]))
    bm.to_mesh(mesh)
    bm.free()
    o = bpy.data.objects.new('oct', mesh)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    return _finish(o, mat)


def shadow_floor(size=8):
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, 0))
    o = _active()
    o.is_shadow_catcher = True
    return o


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()


def camera(elev=52, azim=0, dist=12, ortho=2.15, target=(0, 0, 0.5), lens=None):
    data = bpy.data.cameras.new('cam')
    if lens:
        data.type = 'PERSP'
        data.lens = lens
    else:
        data.type = 'ORTHO'
        data.ortho_scale = ortho
    cam = bpy.data.objects.new('cam', data)
    bpy.context.scene.collection.objects.link(cam)
    e, a = math.radians(elev), math.radians(azim)
    t = Vector(target)
    cam.location = t + Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))) * dist
    look_at(cam, target)
    bpy.context.scene.camera = cam
    return cam


def light(kind, loc, energy, color='#ffffff', size=2.0, target=(0, 0, 0.4)):
    data = bpy.data.lights.new('light', kind)
    data.energy = energy
    data.color = lin(color)[:3]
    if kind == 'AREA':
        data.size = size
    elif kind == 'SUN':
        data.angle = math.radians(6)
    o = bpy.data.objects.new('light', data)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    look_at(o, target)
    return o


def studio(scale=1.0):
    light('AREA', (-1.6 * scale, -2.4 * scale, 7 * scale), 700 * scale * scale, '#fff4e6', 2.2 * scale)
    light('AREA', (4 * scale, 3.5 * scale, 3 * scale), 420 * scale * scale, '#7fd8ff', 2.5 * scale)
    light('AREA', (4.5 * scale, -3 * scale, 1.5 * scale), 120 * scale * scale, '#ffd9a8', 2 * scale)


def render(name):
    s = bpy.context.scene
    s.render.filepath = os.path.join(OUT, name + '.webp')
    bpy.ops.render.render(write_still=True)
    print('RENDERED', name)


def piece_scene():
    reset(256, 48)
    mats()
    shadow_floor()
    studio()
    camera()


# ---------------------------------------------------------------- board pieces
def p_agent():
    m = mats()
    ball(0.52, (0, 0, 0.8), m['hull'], (1, 0.92, 0.92))
    ring(0.53, 0.045, (0, 0, 0.74), mat=m['yel'], scale=(1, 0.92, 1))
    # Visor sits high on the front so the top-down board camera can see it.
    box((0.66, 0.2, 0.22), (0, -0.36, 1.08), (-38, 0, 0), m['cyan'], bevel=0.07, seg=3)
    for side in (-1, 1):
        cyl(0.15, 0.36, (side * 0.6, 0, 0.6), (0, 90, 0), m['steel'])
        cyl(0.1, 0.05, (side * 0.79, 0, 0.6), (0, 90, 0), m['cyan'])
    cyl(0.02, 0.32, (0.14, 0.05, 1.28), mat=m['steel'])
    ball(0.05, (0.14, 0.05, 1.45), m['cyan'])
    cyl(0.22, 0.03, (0, 0, 0.2), mat=m['cyan'])


def p_core():
    m = mats()
    cyl(0.6, 0.14, (0, 0, 0.07), mat=m['steel'], verts=8, smooth=False)
    ring(0.48, 0.03, (0, 0, 0.16), mat=m['cyan'])
    crystal = octahedron(0.36, 0.52, (0, 0, 0.92), m['glass'])
    crystal.rotation_euler = (0, 0, math.radians(18))
    octahedron(0.18, 0.26, (0, 0, 0.92), m['cyan']).rotation_euler = (0, 0, math.radians(18))
    for a in range(3):
        ang = a * 2 * math.pi / 3
        box((0.08, 0.08, 0.3), (0.5 * math.cos(ang), 0.5 * math.sin(ang), 0.3), mat=m['dark'])


def p_wall():
    m = mats()
    box((1.84, 1.84, 0.86), (0, 0, 0.43), mat=m['steel'], bevel=0.06)
    box((1.6, 1.6, 0.06), (0, 0, 0.88), mat=m['dark'], bevel=0.02)
    for i in range(3):
        box((1.3, 0.05, 0.08), (0, -0.93, 0.25 + i * 0.2), mat=m['orange'], bevel=0.01)
    for x in (-0.7, 0.7):
        for y in (-0.7, 0.7):
            cyl(0.05, 0.04, (x, y, 0.92), mat=m['steel'], verts=12)
    box((1.84, 0.12, 0.12), (0, -0.92, 0.82), mat=m['hazard'], bevel=0.01)


def _posts(top_light):
    m = mats()
    for x in (-0.72, 0.72):
        box((0.26, 0.3, 1.15), (x, 0, 0.58), mat=m['steel'], bevel=0.04)
        box((0.28, 0.32, 0.12), (x, 0, 0.12), mat=m['hazard'], bevel=0.02)
    box((1.7, 0.3, 0.16), (0, 0, 1.2), mat=m['dark'], bevel=0.03)
    ball(0.08, (0, -0.16, 1.2), top_light)


def p_gate():
    m = mats()
    _posts(m['red'])
    box((1.18, 0.04, 0.95), (0, 0, 0.6), mat=m['redglass'], bevel=0)
    for z in (0.3, 0.6, 0.9):
        box((1.18, 0.05, 0.03), (0, 0, z), mat=m['red'], bevel=0)


def p_gate_open():
    m = mats()
    _posts(m['green'])
    for z in (0.3, 0.6, 0.9):
        for x in (-0.56, 0.56):
            box((0.06, 0.05, 0.03), (x, 0, z), mat=m['green'], bevel=0)


def p_key():
    m = mats()
    card = box((0.95, 0.62, 0.07), (0, 0, 0.62), (24, 0, -14), m['hull'], bevel=0.03)
    stripe = box((0.95, 0.14, 0.075), (0, 0, 0.62), (24, 0, -14), m['yel'], bevel=0.01)
    stripe.location = card.location + Vector((0.03, 0.16, 0.08))
    chip = box((0.22, 0.18, 0.08), (0, 0, 0.62), (24, 0, -14), m['amber'], bevel=0.01)
    chip.location = card.location + Vector((-0.24, -0.1, 0.05))
    ring(0.36, 0.025, (0, 0, 0.08), mat=m['yel'])


def _frame():
    m = mats()
    box((1.7, 0.42, 0.22), (0, 0, 1.24), mat=m['steel'], bevel=0.04)
    for x in (-0.76, 0.76):
        box((0.2, 0.42, 1.32), (x, 0, 0.66), mat=m['steel'], bevel=0.04)


def p_door():
    m = mats()
    _frame()
    box((1.3, 0.22, 1.12), (0, 0, 0.58), mat=m['hazard'], bevel=0.03)
    box((0.3, 0.06, 0.18), (0, -0.14, 0.62), mat=m['red'], bevel=0.02)


def p_door_open():
    m = mats()
    _frame()
    box((1.3, 0.22, 0.22), (0, 0, 1.06), mat=m['hazard'], bevel=0.03)
    box((1.3, 0.3, 0.03), (0, 0, 0.02), mat=m['green'], bevel=0)


def p_data():
    m = mats()
    disc = cyl(0.42, 0.1, (0, 0, 0.62), (28, 0, 10), m['dark'])
    hub = cyl(0.14, 0.12, (0, 0, 0.62), (28, 0, 10), m['yel'])
    ring(0.32, 0.025, (0, 0, 0.62), (28, 0, 10), m['cyan'])
    for o in (disc, hub):
        o.location.z = 0.62
    ring(0.3, 0.022, (0, 0, 0.06), mat=m['cyan'])


def p_hazard():
    m = mats()
    cyl(0.66, 0.2, (0, 0, 0.1), mat=m['hazard'], verts=6, smooth=False)
    cyl(0.12, 0.8, (0, 0, 0.6), mat=m['steel'])
    for z in (0.42, 0.62, 0.82):
        ring(0.2, 0.035, (0, 0, z), mat=m['orange'])
    ball(0.17, (0, 0, 1.08), m['orange'])
    for a in range(3):
        ang = a * 2 * math.pi / 3 + 0.3
        box((0.5, 0.04, 0.04), (0.28 * math.cos(ang), 0.28 * math.sin(ang), 1.05), (0, 30, math.degrees(ang)), m['yel'], bevel=0)


def _switch(on):
    m = mats()
    cyl(0.64, 0.14, (0, 0, 0.07), mat=m['steel'], verts=8, smooth=False)
    cyl(0.4, 0.1 if on else 0.2, (0, 0, 0.18 if on else 0.24), mat=m['dark'])
    ring(0.42, 0.035, (0, 0, 0.16), mat=m['green'] if on else m['dim'])
    if on:
        cyl(0.3, 0.02, (0, 0, 0.24), mat=m['green'])


def p_switch():
    _switch(False)


def p_switch_on():
    _switch(True)


def _bridge(on):
    m = mats()
    for y in (-0.82, 0.82):
        box((1.6, 0.18, 0.16), (0, y, 0.08), mat=m['steel'], bevel=0.03)
        for x in (-0.62, 0, 0.62):
            box((0.12, 0.1, 0.1), (x, y * 0.92, 0.2), mat=m['green'] if on else m['red'], bevel=0.02)
    if on:
        box((1.5, 1.44, 0.04), (0, 0, 0.1), mat=m['glass'], bevel=0)
        for x in (-0.5, 0, 0.5):
            box((0.04, 1.44, 0.05), (x, 0, 0.11), mat=m['green'], bevel=0)


def p_bridge():
    _bridge(False)


def p_bridge_on():
    _bridge(True)


def p_portal():
    m = mats()
    box((1.1, 0.4, 0.14), (0, 0, 0.07), mat=m['steel'], bevel=0.03)
    ring(0.56, 0.085, (0, 0, 0.74), (90, 0, 0), m['violet'])
    ring(0.64, 0.03, (0, 0, 0.74), (90, 0, 0), m['steel'])
    swirl = cyl(0.5, 0.02, (0, 0, 0.74), (90, 0, 0), m['violet'])
    swirl.data.materials[0] = material('swirl', '#3a2266', 0, 0.2, emit=VIOLET, strength=2.2, alpha=0.6)
    try:
        swirl.data.materials[0].surface_render_method = 'BLENDED'
    except AttributeError:
        pass


PIECES = dict(agent=p_agent, core=p_core, wall=p_wall, gate=p_gate, gate_open=p_gate_open, key=p_key,
              door=p_door, door_open=p_door_open, data=p_data, hazard=p_hazard, switch=p_switch,
              switch_on=p_switch_on, bridge=p_bridge, bridge_on=p_bridge_on, portal=p_portal)


# ---------------------------------------------------------------- arcade icons
def a_bug():
    m = mats()
    ball(0.62, (0, 0, 0.42), material('shell', AMBER, 0.3, 0.3, coat=0.5), (0.85, 1.1, 0.6))
    box((0.06, 1.3, 0.06), (0, 0, 0.78), mat=m['dark'], bevel=0.01)
    ball(0.28, (0, -0.68, 0.38), m['dark'])
    for side in (-1, 1):
        ball(0.07, (side * 0.13, -0.88, 0.45), m['cyan'])
        for i, y in enumerate((-0.35, 0.05, 0.45)):
            box((0.5, 0.06, 0.06), (side * 0.65, y, 0.22), (0, side * -25, 0), m['steel'], bevel=0.01)


def a_network():
    m = mats()
    pts = []
    for i in range(5):
        a = i * 2 * math.pi / 5 + math.pi / 2
        pts.append(Vector((0.72 * math.cos(a), 0.72 * math.sin(a), 0.4 + 0.25 * (i % 2))))
    for i in range(5):
        a, b = pts[i], pts[(i + 2) % 5] if i % 2 else pts[(i + 1) % 5]
        mid, d = (a + b) / 2, b - a
        o = cyl(0.025, d.length, tuple(mid), mat=m['dim'], verts=8)
        o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    for i, p in enumerate(pts):
        ball(0.15, tuple(p), m['yel'] if i == 0 else m['cyan'])
        cyl(0.18, 0.04, (p.x, p.y, 0.02), mat=m['steel'])


def a_cipher():
    m = mats()
    box((1.3, 1.1, 1.2), (0, 0, 0.6), mat=m['steel'], bevel=0.06)
    box((1.1, 0.05, 1.0), (0, -0.56, 0.62), mat=m['dark'], bevel=0.02)
    cyl(0.28, 0.1, (0.05, -0.62, 0.68), (90, 0, 0), m['yel'])
    box((0.04, 0.06, 0.18), (0.05, -0.68, 0.82), mat=m['dark'], bevel=0)
    box((0.08, 0.1, 0.4), (-0.4, -0.62, 0.66), mat=m['hull'], bevel=0.02)
    ball(0.05, (0.42, -0.62, 1.0), m['red'])


def a_factory():
    m = mats()
    box((1.7, 0.5, 0.14), (0, 0.3, 0.2), mat=m['dark'], bevel=0.02)
    for x in (-0.6, -0.2, 0.2, 0.6):
        cyl(0.07, 0.52, (x, 0.3, 0.12), (90, 0, 0), m['steel'], verts=16)
    box((0.3, 0.3, 0.3), (0.45, 0.3, 0.42), mat=material('crate', AMBER, 0, 0.6), bevel=0.02)
    cyl(0.3, 0.16, (-0.55, -0.45, 0.08), mat=m['steel'])
    box((0.16, 0.16, 0.8), (-0.55, -0.45, 0.55), (0, 18, 0), m['yel'], bevel=0.03)
    box((0.7, 0.14, 0.14), (-0.2, -0.45, 0.98), (0, -12, 0), m['yel'], bevel=0.03)
    box((0.08, 0.2, 0.22), (0.15, -0.45, 0.86), mat=m['dark'], bevel=0.01)
    ball(0.08, (-0.55, -0.45, 0.96), m['cyan'])


def a_database():
    m = mats()
    for i in range(3):
        cyl(0.58, 0.32, (0, 0, 0.2 + i * 0.36), mat=m['steel'])
        ring(0.58, 0.025, (0, 0, 0.36 + i * 0.36), mat=m['cyan'])
        box((0.24, 0.04, 0.05), (-0.2, -0.57, 0.2 + i * 0.36), mat=m['green'], bevel=0)


def a_forensics():
    m = mats()
    box((1.0, 1.0, 0.12), (0.1, 0.15, 0.08), mat=m['dark'], bevel=0.02)
    for i in range(5):
        box((0.08, 0.16, 0.04), (-0.25 + i * 0.17, -0.42, 0.06), mat=m['amber'], bevel=0)
    box((0.4, 0.4, 0.05), (0.1, 0.15, 0.16), mat=m['cyan'], bevel=0.01)
    ring(0.36, 0.06, (-0.15, -0.1, 0.62), (60, 0, 0), m['yel'])
    disc = cyl(0.33, 0.02, (-0.15, -0.1, 0.62), (60, 0, 0), m['glass'])
    box((0.12, 0.12, 0.55), (0.25, 0.32, 0.4), (-60, 0, -35), m['steel'], bevel=0.03)


def a_circuit():
    m = mats()
    box((1.6, 1.3, 0.1), (0, 0, 0.06), mat=material('pcb', '#123a2c', 0.1, 0.5), bevel=0.02)
    for (x, y, l, r) in ((-0.3, 0.3, 0.9, 0), (0.2, -0.2, 0.8, 90), (-0.5, -0.3, 0.5, 0), (0.45, 0.35, 0.5, 90)):
        box((l, 0.04, 0.02), (x, y, 0.12), (0, 0, r), m['amber'], bevel=0)
    box((0.4, 0.4, 0.14), (0.25, 0.2, 0.18), mat=m['dark'], bevel=0.02)
    box((0.3, 0.24, 0.12), (-0.4, -0.25, 0.17), mat=m['dark'], bevel=0.02)
    ball(0.07, (0.6, -0.4, 0.17), m['green'])
    ball(0.07, (-0.62, 0.42, 0.17), m['red'])


def a_bot():
    m = mats()
    box((1.0, 0.9, 0.8), (0, 0, 0.62), mat=m['hull'], bevel=0.12, seg=3)
    box((0.76, 0.06, 0.24), (0, -0.46, 0.7), mat=m['cyan'], bevel=0.04)
    for side in (-1, 1):
        cyl(0.14, 0.14, (side * 0.56, 0, 0.62), (0, 90, 0), m['yel'])
    cyl(0.025, 0.3, (0, 0, 1.15), mat=m['steel'])
    ball(0.06, (0, 0, 1.32), m['red'])
    box((0.7, 0.6, 0.16), (0, 0, 0.1), mat=m['steel'], bevel=0.03)


def a_api():
    m = mats()
    box((0.7, 0.6, 1.2), (-0.45, 0.1, 0.6), mat=m['steel'], bevel=0.04)
    for z in (0.35, 0.6, 0.85):
        box((0.5, 0.04, 0.1), (-0.45, -0.21, z), mat=m['dark'], bevel=0)
        ball(0.03, (-0.62, -0.23, z), m['green'])
    box((0.4, 0.3, 0.3), (0.45, -0.1, 0.28), mat=m['yel'], bevel=0.04)
    for y in (-0.18, -0.02):
        box((0.05, 0.05, 0.16), (0.45, y, 0.5), mat=m['steel'], bevel=0)
    poly_prism([(-0.25, 0), (0.1, 0), (0.1, 0.08), (0.25, -0.05), (0.1, -0.18), (0.1, -0.1), (-0.25, -0.1)],
               0.06, (0.05, -0.32, 0.95), (90, 0, 0), m['cyan'])


def a_sprint():
    m = mats()
    cyl(0.62, 0.2, (0, 0, 0.62), (75, 0, 0), m['steel'])
    cyl(0.54, 0.22, (0, 0, 0.62), (75, 0, 0), m['dark'])
    ring(0.6, 0.04, (0, -0.1, 0.65), (75, 0, 0), m['yel'])
    cyl(0.08, 0.18, (0, 0.18, 1.3), mat=m['yel'])
    box((0.04, 0.03, 0.4), (0.08, -0.14, 0.75), (75, 0, -35), m['cyan'], bevel=0)
    ball(0.05, (0, -0.14, 0.62), m['cyan'])


def a_combat():
    m = mats()
    shield = ball(0.7, (0, 0, 0.7), m['steel'], (1, 0.25, 1.2))
    shield.rotation_euler = (math.radians(-8), 0, 0)
    ring(0.62, 0.05, (0, -0.15, 0.7), (90, 0, 0), m['cyan'], (1, 1, 1.2))
    poly_prism([(0.05, 0.42), (-0.2, 0.0), (-0.02, 0.0), (-0.1, -0.4), (0.2, 0.06), (0.02, 0.06), (0.12, 0.42)],
               0.08, (0, -0.2, 0.72), (90, 0, 0), m['yel'])


def a_maze():
    m = mats()
    box((1.6, 1.6, 0.1), (0, 0, 0.05), mat=m['dark'], bevel=0.02)
    for (x, y, sx, sy) in ((-0.55, 0, 0.12, 1.4), (0, 0.35, 0.9, 0.12), (0.55, -0.2, 0.12, 1.0), (-0.1, -0.4, 0.7, 0.12)):
        box((sx, sy, 0.34), (x, y, 0.27), mat=m['steel'], bevel=0.02)
    octahedron(0.12, 0.18, (0.3, 0.6, 0.4), m['cyan'])
    ball(0.13, (-0.25, -0.62, 0.25), m['hull'])
    box((0.16, 0.04, 0.05), (-0.25, -0.75, 0.27), mat=m['cyan'], bevel=0)


ARCADE = dict(bug=a_bug, network=a_network, cipher=a_cipher, factory=a_factory, database=a_database,
              forensics=a_forensics, circuit=a_circuit, bot=a_bot, api=a_api, sprint=a_sprint,
              combat=a_combat, maze=a_maze)


# ---------------------------------------------------------------- fighters
def guardian():
    m = mats()
    box((0.9, 0.62, 0.95), (0, 0, 1.55), mat=m['hull'], bevel=0.12, seg=3)
    box((0.5, 0.4, 0.42), (0, 0, 2.22), mat=m['hull'], bevel=0.1, seg=3)
    box((0.42, 0.08, 0.13), (0.06, -0.2, 2.24), mat=m['cyan'], bevel=0.04)
    box((0.92, 0.64, 0.12), (0, 0, 1.2), mat=m['hazard'], bevel=0.02)
    for side in (-1, 1):
        box((0.36, 0.5, 0.3), (side * 0.64, 0, 1.95), mat=m['yel'], bevel=0.08)
        box((0.22, 0.26, 0.7), (side * 0.66, 0, 1.45), mat=m['steel'], bevel=0.05)
        box((0.3, 0.34, 0.75), (side * 0.27, 0, 0.62), mat=m['steel'], bevel=0.06)
        box((0.36, 0.5, 0.18), (side * 0.27, -0.06, 0.12), mat=m['dark'], bevel=0.04)
    shield = ball(0.55, (0.95, -0.25, 1.35), m['steel'], (0.18, 1, 1.25))
    ring(0.5, 0.035, (1.04, -0.25, 1.35), (0, 90, 0), m['cyan'], (1.25, 1, 1))
    box((0.12, 0.1, 0.5), (-0.68, -0.15, 0.98), (20, 0, 0), m['cyan'], bevel=0.03)
    ball(0.1, (0, 0.33, 1.65), m['cyan'])


def sentinel():
    m = mats()
    core = ball(0.62, (0, 0, 1.45), m['dark'], (1, 1, 0.9))
    ring(0.64, 0.05, (0, 0, 1.45), mat=m['red'], scale=(1, 1, 0.9))
    ball(0.26, (-0.38, -0.42, 1.52), m['red'])
    ring(0.3, 0.04, (-0.4, -0.45, 1.52), (55, 0, -40), m['steel'])
    for i in range(4):
        a = math.radians(45 + i * 90)
        dx, dy = math.cos(a), math.sin(a)
        upper = box((0.75, 0.12, 0.12), (dx * 0.85, dy * 0.85, 1.65), (0, -25, math.degrees(a)), m['steel'], bevel=0.03)
        lower = box((0.12, 0.12, 0.95), (dx * 1.25, dy * 1.25, 1.05), (0, 0, 0), m['steel'], bevel=0.03)
        lower.rotation_euler = (math.radians(-dy * 14), math.radians(dx * 14), 0)
        ball(0.07, (dx * 1.3, dy * 1.3, 0.55), m['red'])
    for i in range(6):
        a = i * math.pi / 3
        box((0.06, 0.06, 0.34), (0.48 * math.cos(a), 0.48 * math.sin(a), 2.05), (math.degrees(math.sin(a)) * 0.4, 0, 0), m['red'], bevel=0)


def fighter_scene(builder, name, azim):
    reset(512, 64)
    mats()
    shadow_floor(12)
    studio(1.5)
    camera(elev=14, azim=azim, dist=6.6, target=(0, 0, 1.3), lens=58)
    builder()
    render(name)


# ---------------------------------------------------------------- player avatars
# Pilot helmets for local player profiles: (shell, accent, visor glow).
AVATARS = [
    (HULL, AMBER, CYAN), ('#2c333b', '#c9a0e6', VIOLET), (HULL, '#ff7a63', ORANGE), ('#d4dbe3', '#8db4dc', CYAN),
    ('#1f2429', YEL, RED), (HULL, '#63e2a3', GREEN), ('#2a3540', CYAN, CYAN), ('#e8b36a', HULL, '#4f8cff'),
]


def helmet(shell, accent, glow):
    shell_m = material('shell', shell, 0.1, 0.3, coat=0.6)
    accent_m = material('accent', accent, 0.1, 0.35, coat=0.3)
    visor_m = material('visor', '#05080b', 0.2, 0.08, emit=glow, strength=1.4, coat=1.0)
    dark = mats()['dark']
    ball(0.82, (0, 0, 0.95), shell_m, (1, 1.04, 1.02))
    ball(0.56, (0, -0.66, 1.0), visor_m, (1.12, 0.44, 0.68))
    ring(0.5, 0.035, (0, -0.74, 1.0), (90, 0, 0), accent_m, (1.25, 0.78, 1))
    box((0.16, 1.5, 0.12), (0, 0.06, 1.66), (12, 0, 0), accent_m, bevel=0.05)
    box((0.86, 0.34, 0.24), (0, -0.62, 0.36), mat=dark, bevel=0.08, seg=3)
    for side in (-1, 1):
        cyl(0.26, 0.16, (side * 0.82, 0.02, 0.92), (0, 90, 0), accent_m)
        cyl(0.12, 0.18, (side * 0.86, 0.02, 0.92), (0, 90, 0), dark)
    box((0.5, 0.06, 0.07), (0, -0.78, 0.36), mat=accent_m, bevel=0.02)


# ---------------------------------------------------------------- planets
PLANETS = [
    # name, recipe parameters
    dict(id='w0', kind='terra'),
    dict(id='w1', kind='lava'),
    dict(id='w2', kind='ice'),
    dict(id='w3', kind='gas'),
    dict(id='w4', kind='machine'),
]


def planet_nodes(nt, kind):
    """Returns (albedo_socket, emission_mask_socket) built from 3D object-space noise."""
    n = nt.nodes
    L = nt.links
    coord = n.new('ShaderNodeTexCoord')

    def noise(scale, detail=8, rough=0.55, distort=0.0, vector=None):
        t = n.new('ShaderNodeTexNoise')
        t.inputs['Scale'].default_value = scale
        t.inputs['Detail'].default_value = detail
        t.inputs['Roughness'].default_value = rough
        t.inputs['Distortion'].default_value = distort
        L.new(vector or coord.outputs['Object'], t.inputs['Vector'])
        return t.outputs['Fac']

    def ramp(fac, stops, interp='LINEAR'):
        r = n.new('ShaderNodeValToRGB')
        r.color_ramp.interpolation = interp
        els = r.color_ramp.elements
        while len(els) < len(stops):
            els.new(0.5)
        for el, (pos, col) in zip(els, stops):
            el.position = pos
            el.color = lin(col) if isinstance(col, str) else col
        L.new(fac, r.inputs['Fac'])
        return r.outputs['Color']

    def voronoi_edges(scale, vector=None, randomness=1.0):
        v = n.new('ShaderNodeTexVoronoi')
        v.feature = 'DISTANCE_TO_EDGE'
        v.inputs['Scale'].default_value = scale
        v.inputs['Randomness'].default_value = randomness
        L.new(vector or coord.outputs['Object'], v.inputs['Vector'])
        return v.outputs['Distance']

    def mix(a, b, fac):
        mx = n.new('ShaderNodeMix')
        mx.data_type = 'RGBA'
        L.new(fac, mx.inputs['Factor'])
        L.new(a, mx.inputs[6])
        L.new(b, mx.inputs[7])
        return mx.outputs[2]

    def math_node(op, a, b=None, val=None):
        m = n.new('ShaderNodeMath')
        m.operation = op
        if isinstance(a, float):
            m.inputs[0].default_value = a
        else:
            L.new(a, m.inputs[0])
        if b is not None:
            if isinstance(b, float):
                m.inputs[1].default_value = b
            else:
                L.new(b, m.inputs[1])
        return m.outputs[0]

    def sep_z():
        s = n.new('ShaderNodeSeparateXYZ')
        L.new(coord.outputs['Object'], s.inputs[0])
        return s.outputs['Z']

    if kind == 'terra':
        h = noise(1.6, 10, 0.58, 0.25)
        land = ramp(h, [(0.0, '#06263d'), (0.47, '#0d4a66'), (0.52, '#1f6a76'), (0.535, '#4b6f48'), (0.62, '#6f7c4e'), (0.75, '#8d8a6a')])
        lat = math_node('ABSOLUTE', sep_z())
        cap = ramp(math_node('ADD', lat, math_node('MULTIPLY', noise(5, 4), 0.12)), [(0.9, (0, 0, 0, 1)), (0.94, (1, 1, 1, 1))])
        sepc = n.new('ShaderNodeSeparateColor')
        L.new(cap, sepc.inputs[0])
        albedo = mix(land, ramp(h, [(0, '#dfe8ec'), (1, '#f4f8f9')]), sepc.outputs[0])
        clouds = ramp(noise(3.2, 6, 0.6, 0.6), [(0.55, (0, 0, 0, 1)), (0.72, (1, 1, 1, 1))])
        sepcl = n.new('ShaderNodeSeparateColor')
        L.new(clouds, sepcl.inputs[0])
        albedo = mix(albedo, ramp(h, [(0, '#e8eef0'), (1, '#ffffff')]), math_node('MULTIPLY', sepcl.outputs[0], 0.75))
        canyon = ramp(voronoi_edges(9), [(0.0, (1, 1, 1, 1)), (0.035, (0, 0, 0, 1))])
        landmask = ramp(h, [(0.53, (0, 0, 0, 1)), (0.56, (1, 1, 1, 1))])
        mask = n.new('ShaderNodeMix')
        mask.data_type = 'RGBA'
        mask.blend_type = 'MULTIPLY'
        mask.inputs['Factor'].default_value = 1
        L.new(canyon, mask.inputs[6])
        L.new(landmask, mask.inputs[7])
        return albedo, mask.outputs[2]
    if kind == 'lava':
        h = noise(2.2, 10, 0.6, 0.4)
        rock = ramp(h, [(0.3, '#120c0b'), (0.55, '#2c1f1a'), (0.75, '#4a3428')])
        cracks = voronoi_edges(5.5)
        crack = ramp(math_node('ADD', cracks, math_node('MULTIPLY', noise(14, 3), 0.03)), [(0.0, (1, 1, 1, 1)), (0.05, (0, 0, 0, 1))])
        sep = n.new('ShaderNodeSeparateColor')
        L.new(crack, sep.inputs[0])
        albedo = mix(rock, ramp(h, [(0, '#ff7a1f'), (1, '#ffc15a')]), sep.outputs[0])
        return albedo, crack
    if kind == 'ice':
        h = noise(2.4, 8, 0.5, 0.2)
        ice = ramp(h, [(0.3, '#3c6f98'), (0.5, '#8fb9d8'), (0.68, '#d3e9f5'), (0.85, '#f2f9fc')])
        cr = ramp(voronoi_edges(7, randomness=0.85), [(0.0, (1, 1, 1, 1)), (0.03, (0, 0, 0, 1))])
        sep = n.new('ShaderNodeSeparateColor')
        L.new(cr, sep.inputs[0])
        albedo = mix(ice, ramp(h, [(0, '#2ad0ff'), (1, '#9df0ff')]), math_node('MULTIPLY', sep.outputs[0], 0.8))
        return albedo, cr
    if kind == 'gas':
        z = sep_z()
        warp = math_node('ADD', z, math_node('MULTIPLY', noise(2.5, 6, 0.6, 1.2), 0.22))
        bands = n.new('ShaderNodeTexWave')
        bands.wave_type = 'BANDS'
        bands.bands_direction = 'Z'
        bands.inputs['Scale'].default_value = 1.2
        bands.inputs['Distortion'].default_value = 4
        bands.inputs['Detail'].default_value = 3
        L.new(coord.outputs['Object'], bands.inputs['Vector'])
        comb = math_node('ADD', math_node('MULTIPLY', bands.outputs['Fac'], 0.6), math_node('MULTIPLY', warp, 0.4))
        albedo = ramp(comb, [(0.0, '#2a1d4a'), (0.25, '#5a3f8c'), (0.45, '#9c84c9'), (0.6, '#d9c7ec'), (0.75, '#6a8fc2'), (1.0, '#1f2f5e')])
        storm = ramp(noise(9, 2, 0.4), [(0.74, (0, 0, 0, 1)), (0.8, (1, 1, 1, 1))])
        return albedo, storm
    # machine
    v = n.new('ShaderNodeTexVoronoi')
    v.feature = 'F1'
    v.distance = 'CHEBYCHEV'
    v.inputs['Scale'].default_value = 7
    v.inputs['Randomness'].default_value = 0.5
    L.new(coord.outputs['Object'], v.inputs['Vector'])
    plates = ramp(v.outputs['Distance'], [(0.0, '#2b3036'), (0.4, '#1d2126'), (0.5, '#121519')])
    edge = n.new('ShaderNodeTexVoronoi')
    edge.feature = 'DISTANCE_TO_EDGE'
    edge.distance = 'CHEBYCHEV'
    edge.inputs['Scale'].default_value = 7
    edge.inputs['Randomness'].default_value = 0.5
    L.new(coord.outputs['Object'], edge.inputs['Vector'])
    trench = ramp(edge.outputs['Distance'], [(0.0, (1, 1, 1, 1)), (0.03, (0, 0, 0, 1))])
    hot = ramp(noise(3, 4, 0.5), [(0.45, (0, 0, 0, 1)), (0.6, (1, 1, 1, 1))])
    mask = n.new('ShaderNodeMix')
    mask.data_type = 'RGBA'
    mask.blend_type = 'MULTIPLY'
    mask.inputs['Factor'].default_value = 1
    L.new(trench, mask.inputs[6])
    L.new(hot, mask.inputs[7])
    sep = n.new('ShaderNodeSeparateColor')
    L.new(mask.outputs[2], sep.inputs[0])
    albedo = mix(plates, ramp(v.outputs['Distance'], [(0, '#ff3b30'), (1, '#ff7a5c')]), sep.outputs[0])
    return albedo, mask.outputs[2]


def bake_planet(p, w=768, h=384):
    """Bakes an opaque equirect colour map and a half-size glow mask (WebP drops
    colour under zero alpha, so the mask cannot ride in the alpha channel)."""
    reset(64, 4)
    s = bpy.context.scene
    s.cycles.samples = 4
    bpy.ops.mesh.primitive_uv_sphere_add(segments=256, ring_count=128, radius=1)
    sphere = _active()
    m = bpy.data.materials.new('planet_' + p['id'])
    m.use_nodes = True
    nt = m.node_tree
    for node in list(nt.nodes):
        if node.type != 'OUTPUT_MATERIAL':
            nt.nodes.remove(node)
    out = [x for x in nt.nodes if x.type == 'OUTPUT_MATERIAL'][0]
    albedo, mask = planet_nodes(nt, p['kind'])
    emit = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(emit.outputs[0], out.inputs['Surface'])
    sphere.data.materials.append(m)
    results = {}
    for label, sock, scale in (('albedo', albedo, 1), ('mask', mask, 2)):
        img = bpy.data.images.new(p['id'] + label, w // scale, h // scale, alpha=False)
        node = nt.nodes.new('ShaderNodeTexImage')
        node.image = img
        nt.nodes.active = node
        for l in list(emit.inputs[0].links):
            nt.links.remove(l)
        nt.links.new(sock, emit.inputs[0])
        bpy.context.view_layer.objects.active = sphere
        sphere.select_set(True)
        bpy.ops.object.bake(type='EMIT', margin=4, use_clear=True)
        results[label] = img
        nt.nodes.remove(node)
    s.view_settings.view_transform = 'Standard'
    s.render.image_settings.file_format = 'WEBP'
    s.render.image_settings.color_mode = 'RGB'
    for label, suffix, quality in (('albedo', '', 74), ('mask', '_glow', 70)):
        img = results[label]
        s.render.image_settings.quality = quality
        img.save_render(os.path.join(OUT, 'planet_' + p['id'] + suffix + '.webp'), scene=s)
        img.filepath_raw = os.path.join(OUT, '_planet_' + p['id'] + suffix + '.png')
        img.file_format = 'PNG'
        img.save()
    print('BAKED', p['id'])


def planet_thumb(p):
    reset(256, 64)
    s = bpy.context.scene
    img = bpy.data.images.load(os.path.join(OUT, '_planet_' + p['id'] + '.png'))
    glow = bpy.data.images.load(os.path.join(OUT, '_planet_' + p['id'] + '_glow.png'))
    glow.colorspace_settings.name = 'Non-Color'
    bpy.ops.mesh.primitive_uv_sphere_add(segments=128, ring_count=64, radius=1)
    sphere = _active()
    for poly in sphere.data.polygons:
        poly.use_smooth = True
    sphere.rotation_euler = (math.radians(18), 0, math.radians(-30))
    m = bpy.data.materials.new('thumb')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage')
    t.image = img
    nt.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
    nt.links.new(t.outputs['Color'], bsdf.inputs['Emission Color'])
    g = nt.nodes.new('ShaderNodeTexImage')
    g.image = glow
    strength = nt.nodes.new('ShaderNodeMath')
    strength.operation = 'MULTIPLY'
    strength.inputs[1].default_value = 3.0
    nt.links.new(g.outputs['Color'], strength.inputs[0])
    nt.links.new(strength.outputs[0], bsdf.inputs['Emission Strength'])
    bsdf.inputs['Roughness'].default_value = 0.8 if p['kind'] != 'ice' else 0.35
    sphere.data.materials.append(m)
    atmo_color = {'terra': '#7fd8ff', 'lava': '#ff8a2a', 'ice': '#bfeaff', 'gas': '#c9a2e0', 'machine': '#ff4b3a'}[p['kind']]
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=1.045)
    shell = _active()
    for poly in shell.data.polygons:
        poly.use_smooth = True
    am = bpy.data.materials.new('atmo')
    am.use_nodes = True
    ant = am.node_tree
    for node in list(ant.nodes):
        if node.type != 'OUTPUT_MATERIAL':
            ant.nodes.remove(node)
    aout = [x for x in ant.nodes if x.type == 'OUTPUT_MATERIAL'][0]
    lw = ant.nodes.new('ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.2
    pw = ant.nodes.new('ShaderNodeMath')
    pw.operation = 'POWER'
    pw.inputs[1].default_value = 2.6
    ant.links.new(lw.outputs['Facing'], pw.inputs[0])
    em = ant.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = lin(atmo_color)
    em.inputs['Strength'].default_value = 1.1
    tr = ant.nodes.new('ShaderNodeBsdfTransparent')
    mx = ant.nodes.new('ShaderNodeMixShader')
    ant.links.new(pw.outputs[0], mx.inputs['Fac'])
    ant.links.new(tr.outputs[0], mx.inputs[1])
    ant.links.new(em.outputs[0], mx.inputs[2])
    ant.links.new(mx.outputs[0], aout.inputs['Surface'])
    try:
        am.surface_render_method = 'BLENDED'
    except AttributeError:
        pass
    shell.data.materials.append(am)
    if p['kind'] == 'gas':
        rim = ring(1.62, 0.3, (0, 0, 0), mat=None, scale=(1, 1, 0.015))
        rim.rotation_euler = (math.radians(14), math.radians(-22), 0)
        rim.data.materials.append(material('ringmat', '#b9a6d6', 0, 0.6, emit='#c9a2e0', strength=0.35, alpha=0.5))
        try:
            rim.data.materials[0].surface_render_method = 'BLENDED'
        except AttributeError:
            pass
    light('SUN', (-7, -2.5, 2.2), 5.5, '#fff1de', target=(0, 0, 0))
    camera(elev=8, azim=0, dist=12, ortho=2.5 if p['kind'] != 'gas' else 3.9, target=(0, 0, 0))
    s.world.node_tree.nodes['Background'].inputs[1].default_value = 0.02
    render('planet_' + p['id'] + '_thumb')


# ---------------------------------------------------------------- main
if want('planets'):
    for p in PLANETS:
        bake_planet(p)
if want('thumbs'):
    for p in PLANETS:
        planet_thumb(p)
if want('pieces'):
    for name, fn in PIECES.items():
        MATS.clear()
        piece_scene()
        fn()
        render('piece_' + name)
if want('arcade'):
    for name, fn in ARCADE.items():
        MATS.clear()
        piece_scene()
        bpy.context.scene.camera.data.ortho_scale = 2.25
        fn()
        render('arcade_' + name)
if want('avatars'):
    for i, (shell, accent, glow) in enumerate(AVATARS):
        MATS.clear()
        reset(192, 48)
        mats()
        studio(1.1)
        camera(elev=12, azim=-24, dist=12, ortho=2.25, target=(0, 0, 0.95))
        helmet(shell, accent, glow)
        render('avatar_%d' % i)
if want('fighters'):
    MATS.clear()
    fighter_scene(guardian, 'fighter_guardian', azim=-38)
    MATS.clear()
    fighter_scene(sentinel, 'fighter_sentinel', azim=38)
print('DONE', OUT)
