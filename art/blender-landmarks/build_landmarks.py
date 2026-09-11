"""PUI Fortune architectural miniatures. Run in Blender 5.x via MCP.

Creates its own scene; does not edit the game or the previously active scene.
All geometry is authored here. Blender Z-up; GLB export converts to Y-up.
"""
import bpy, math, json, os
from mathutils import Vector
from pathlib import Path

OUT = Path('/Users/janicefong/Desktop/PUI MONOPOLY/art/blender-landmarks')
OUT.mkdir(parents=True, exist_ok=True)
PROMPT = 'Create better all 3d landmark jail and train station in blender first'
PALETTE = {
    'ivory':'F3EBD9','stone':'D5BD93','sand':'DEBA7D','limestone':'BFA17C',
    'jade':'439A88','jade_light':'89C8B0','glass':'3A8295','night':'213C50',
    'silver':'B7CCD1','white':'F6F6EB','gold':'DAB15B','bronze':'90633E',
    'copper':'AD7046','red':'CE513C','brick':'AF694E','roof':'405C70',
    'green':'589366','leaf':'7AAF6B','pine':'2F7059','water':'51B4C2',
    'water_light':'A4DBD7','earth':'685C4D','rock':'838A7D','snow':'F6F8F4',
    'pink':'EFB2BC','warm':'FFE2A2','rail':'60707C','blue':'3679A0',
    'orange':'EB9B45','dark':'26333C','plaza':'D7D6C8','label':'E8EFE9'
}
MATS = {}
def material(key):
    if key in MATS: return MATS[key]
    c = PALETTE.get(key,key).lstrip('#')
    rgb = [int(c[i:i+2],16)/255 for i in (0,2,4)]
    rgb = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m = bpy.data.materials.new('PUI / '+key); m.diffuse_color=(*rgb,1); m.use_nodes=True
    p = m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*rgb,1)
    p.inputs['Roughness'].default_value=.34 if key in ('glass','water','jade') else .58
    p.inputs['Metallic'].default_value=.38 if key in ('gold','silver','bronze','rail') else .05
    if key == 'warm':
        p.inputs['Emission Color'].default_value=(*rgb,1); p.inputs['Emission Strength'].default_value=.3
    MATS[key]=m; return m

scene = bpy.data.scenes.get('PUI Fortune | Landmark Atelier') or bpy.data.scenes.new('PUI Fortune | Landmark Atelier')
bpy.context.window.scene = scene
ASSETS = sorted([o for o in scene.objects if o.get('pui_asset_id')],key=lambda o:o.get('asset_order',0))

class Model:
    def __init__(self, slug, title, features):
        self.slug=slug; self.title=title; self.features=features
        self.v=[]; self.f=[]; self.fm=[]; self.keys=[]; self.smooth=[]
    def mesh(self, verts, faces, mat, smooth=False):
        if mat not in self.keys: self.keys.append(mat)
        idx=self.keys.index(mat); start=len(self.v)
        self.v.extend(verts); self.f.extend([tuple(start+i for i in f) for f in faces])
        self.fm.extend([idx]*len(faces)); self.smooth.extend([smooth]*len(faces))
    def box(self,x,y,z,w,d,h,mat='ivory',ang=0):
        c,s=math.cos(ang),math.sin(ang)
        verts=[]
        for a,b,k in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]:
            xx=a*w/2; yy=b*d/2; verts.append((x+xx*c-yy*s,y+xx*s+yy*c,z+k*h/2))
        self.mesh(verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat)
    def lathe(self,x,y,z,profile,mat='ivory',n=16,sx=1,sy=1,phase=0):
        verts=[(x+r*math.cos(i*math.tau/n+phase)*sx,y+r*math.sin(i*math.tau/n+phase)*sy,z+zz) for r,zz in profile for i in range(n)]
        faces=[]
        for j in range(len(profile)-1):
            for i in range(n): faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
        faces += [tuple(reversed(range(n))),tuple((len(profile)-1)*n+i for i in range(n))]
        self.mesh(verts,faces,mat,n>8)
    def cone(self,x,y,z,r,h,mat='ivory',top=0,n=16):
        self.lathe(x,y,z,[(r,0),(top,h)],mat,n)
    def sphere(self,x,y,z,rx,ry,rz,mat='ivory',n=16):
        prof=[(math.sin(math.pi*i/8),-math.cos(math.pi*i/8)*rz) for i in range(9)]
        self.lathe(x,y,z,prof,mat,n,rx,ry)
    def dome(self,x,y,z,r,h,mat='ivory'):
        self.lathe(x,y,z,[(r*math.cos(math.pi*i/16),h*math.sin(math.pi*i/16)) for i in range(9)],mat,20)
    def onion(self,x,y,z,r,h,mat='ivory'):
        self.lathe(x,y,z,[(r*a,h*b) for a,b in [(0.7,0),(1,.24),(.95,.5),(.7,.73),(.35,.88),(0,1)]],mat,20)
    def beam(self,a,b,r,mat='stone',n=8):
        av,bv=Vector(a),Vector(b); direction=bv-av
        q=Vector((0,0,1)).rotation_difference(direction.normalized())
        verts=[tuple(p+q@Vector((r*math.cos(i*math.tau/n),r*math.sin(i*math.tau/n),0))) for p in (av,bv) for i in range(n)]
        faces=[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]+[tuple(reversed(range(n))),tuple(n+i for i in range(n))]
        self.mesh(verts,faces,mat,True)
    def arch(self,x,y,z,w,h,mat='stone',depth=.07,ang=0):
        # Real open arcade; no dark painted rectangle pretending to be a hole.
        r=w/2; spring=h-r; t=w*.15; c,s=math.cos(ang),math.sin(ang)
        def tr(xx,yy,zz): return (x+xx*c-yy*s,y+xx*s+yy*c,z+zz)
        for side in (-1,1):
            xx=side*(r-t/2); self.box(x+xx*c,y+xx*s,z+spring/2,t,depth,spring,mat,ang)
        vs=[]
        for yy in (-depth/2,depth/2):
            for rad in (r,r-t):
                for i in range(13):
                    a=math.pi*i/12; vs.append(tr(rad*math.cos(a),yy,spring+rad*math.sin(a)))
        fs=[]
        for i in range(12):
            fs.extend([(i,i+1,14+i,13+i),(26+i,39+i,40+i,27+i),(i,26+i,27+i,i+1),(13+i,14+i,40+i,39+i)])
        fs.extend([(0,13,39,26),(12,38,51,25)]); self.mesh(vs,fs,mat)
    def roof(self,x,y,z,w,d,h,mat='roof'):
        self.mesh([(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x,y-d/2,z+h),(x-w/2,y+d/2,z),(x+w/2,y+d/2,z),(x,y+d/2,z+h)],[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],mat)
    def base(self,mat='plaza'):
        self.box(0,0,.035,1.52,1.12,.07,'ivory'); self.box(0,0,.078,1.48,1.08,.035,mat)
    def tree(self,x,y,size=.16,mat='leaf'):
        self.cone(x,y,.09,.018,size*1.5,'bronze',top=.015,n=6)
        self.sphere(x,y,.13+size*1.5,size*.7,size*.7,size,mat,n=10)
    def cypress(self,x,y,size=.24):
        self.cone(x,y,.1,.038,size,'pine',top=.01,n=10)
    def windows(self,x,y,z,cols,rows,dx=.09,dz=.12,mat='glass',side=False):
        for i in range(cols):
            for j in range(rows):
                xx=x+(i-(cols-1)/2)*dx
                key='warm' if (i+3*j)%11==0 else mat
                if side: self.box(y,xx,z+j*dz,.012,dx*.52,dz*.52,key)
                else: self.box(xx,y,z+j*dz,dx*.52,.012,dz*.52,key)
    def stairs(self,x,y,z,w,count=6,rise=.025,run=.04,mat='stone'):
        for i in range(count): self.box(x,y+i*run,z+(i+1)*rise/2,w,run,(i+1)*rise,mat)
    def finish(self):
        # Consolidate each model into one mesh and shared material slots.
        mesh=bpy.data.meshes.new(self.slug+' / geometry'); mesh.from_pydata(self.v,[],self.f); mesh.update()
        for k in self.keys: mesh.materials.append(material(k))
        for p,idx,smooth in zip(mesh.polygons,self.fm,self.smooth): p.material_index=idx; p.use_smooth=smooth
        obj=bpy.data.objects.new(self.title,mesh); scene.collection.objects.link(obj)
        bevel=obj.modifiers.new('Miniature softened edges','BEVEL'); bevel.width=.007; bevel.segments=2; bevel.limit_method='ANGLE'
        bevel.angle_limit=.6
        # Width/depth respect the existing compact landmark area; native Z is height.
        obj.scale=(.97,.72,1)
        i=len(ASSETS); obj.location=((i%7-3)*2.3,(1.5-i//7)*3.4,0)
        obj['pui_asset_id']=self.slug; obj['property_name']=self.title; obj['signature_features']=' | '.join(self.features)
        obj['asset_order']=i
        obj['role']='visual_only'; obj['authoring']='Original procedural Blender miniature'
        ASSETS.append(obj); return obj

def clock(m,x,y,z,r=.105):
    m.sphere(x,y,z,r,.013,r,'gold')
    m.sphere(x,y-.013,z,r*.85,.009,r*.85,'ivory')
    m.beam((x,y-.03,z),(x,y-.03,z+r*.65),.007,'night')
    m.beam((x,y-.03,z),(x+r*.43,y-.03,z-r*.12),.008,'night')
    for i in range(12):
        a=i*math.tau/12; m.sphere(x+math.sin(a)*r*.71,y-.025,z+math.cos(a)*r*.71,.008,.005,.008,'night',8)

def podium(m):
    m.base(); m.box(0,0,.145,.76,.65,.12,'stone')
    m.stairs(0,-.49,.09,.42,3,.027,.05)

def taipei():
    m=Model('taipei-101','Taipei 101',['Eight jade pagoda tiers','Gold corner medallions','Stepped crown and mast'])
    podium(m); m.box(0,0,.35,.48,.45,.35,'jade')
    for i in range(8):
        z=.51+i*.17
        m.lathe(0,0,z,[(.235,0),(.295,.145)],'jade',4,phase=math.pi/4)
        m.lathe(0,0,z+.145,[(.295,0),(.295,.024)],'jade_light',4,phase=math.pi/4)
        for x in (-.12,0,.12): m.box(x,-.19,z+.075,.012,.055,.1,'silver')
        m.sphere(0,-.214,z+.055,.025,.015,.025,'gold',8)
    m.box(0,0,1.98,.25,.25,.24,'jade'); m.box(0,0,2.11,.3,.3,.045,'jade_light')
    m.cone(0,0,2.13,.055,.29,'silver',top=.008)
    for x in (-.54,.54): m.tree(x,.25)
    return m.finish()

def petronas():
    m=Model('petronas-twin-towers','Petronas Twin Towers',['Paired silver scalloped towers','Double-deck skybridge','Tiered needle crowns'])
    m.base(); m.box(0,0,.17,1.05,.7,.15,'night')
    for x in (-.28,.28):
        for i in range(11):
            r=.177 if i<7 else .177-(i-6)*.024; z=.24+i*.135
            m.cone(x,0,z,r,.127,'glass',top=r,n=16)
            m.cone(x,0,z+.11,r+.015,.026,'silver',top=r+.015,n=16)
        for a in range(8):
            ang=a*math.tau/8; m.beam((x+.17*math.cos(ang),.17*math.sin(ang),.25),(x+.17*math.cos(ang),.17*math.sin(ang),1.12),.009,'silver')
        m.cone(x,0,1.73,.075,.23,'silver',top=.025); m.cone(x,0,1.96,.025,.22,'gold')
    for z in (.97,1.055): m.box(0,0,z,.42,.16,.055,'silver')
    m.box(0,-.084,1.01,.4,.012,.055,'glass')
    for x in (-.18,.18): m.beam((x,0,.73),(0,0,.98),.013,'silver')
    m.box(0,-.36,.15,.35,.12,.08,'water'); m.tree(-.62,.31); m.tree(.62,.31)
    return m.finish()

def marina():
    m=Model('marina-bay-sands','Marina Bay Sands',['Three split hotel towers','Curved boat-shaped SkyPark','Turquoise infinity pool and roof gardens'])
    m.base(); m.box(0,0,.16,1.35,.68,.14,'stone')
    for x in (-.43,0,.43):
        m.box(x,.03,.68,.25,.32,1.04,'ivory'); m.box(x,-.14,.7,.19,.025,.91,'glass')
        for i in range(10): m.box(x,-.16,.29+i*.085,.22,.025,.013,'silver')
        for dx in (-.125,.125): m.beam((x+dx,-.04,.22),(x+dx*.72,-.08,1.18),.016,'ivory')
    m.lathe(0,0,1.21,[(1,0),(1.1,.065),(1.08,.115)],'bronze',32,.67,.27)
    m.box(0,-.03,1.33,1.04,.23,.035,'water'); m.box(0,.18,1.33,.97,.1,.035,'green')
    for x in (-.47,-.22,.22,.47): m.tree(x,.18,.055)
    for x in (-.58,.58): m.sphere(x,0,1.32,.11,.16,.04,'ivory')
    return m.finish()

def burj():
    m=Model('burj-khalifa','Burj Khalifa',['Asymmetric bundled setbacks','Blue-silver vertical ribs','Very long tapered spire'])
    m.base(); m.lathe(0,0,.1,[(.49,0),(.4,.1)],'silver',12)
    for j in range(8):
        h=1.82-j*.19; a=j*2.4; r=.19*(1-j*.055); x=math.cos(a)*r; y=math.sin(a)*r
        m.cone(x,y,.19,.115,h,'glass',top=.075,n=12)
        for k in range(9):
            z=.23+k*h/9; m.cone(x,y,z,.117-(z-.19)/h*.04,.018,'silver',top=.117-(z-.19)/h*.04,n=12)
        for k in range(4):
            aa=k*math.tau/4; m.beam((x+.105*math.cos(aa),y+.105*math.sin(aa),.22),(x+.07*math.cos(aa),y+.07*math.sin(aa),h+.16),.008,'silver')
    m.cone(0,0,.22,.12,1.98,'silver',top=.035); m.cone(0,0,2.15,.035,.43,'silver',top=.002)
    m.box(0,-.39,.115,.55,.17,.025,'water'); m.tree(-.55,.27,.12); m.tree(.55,.27,.12)
    return m.finish()

def eiffel():
    m=Model('eiffel-tower','Eiffel Tower',['Four open splayed lattice legs','Cross-braced ironwork','Two decks and tapering mast'])
    m.base('green'); m.box(0,0,.12,1.03,.83,.055,'plaza')
    levels=[(.14,.43),(.7,.24),(1.16,.13),(1.81,.045)]
    for j in range(len(levels)-1):
        za,ra=levels[j]; zb,rb=levels[j+1]
        for sx,sy in [(-1,-1),(-1,1),(1,-1),(1,1)]: m.beam((sx*ra,sy*ra*.72,za),(sx*rb,sy*rb*.72,zb),.034 if j==0 else .023,'bronze')
        for side in (-1,1):
            for axis in (0,1):
                for k in range(3):
                    t0=k/3;t1=(k+1)/3; r0=ra+(rb-ra)*t0;r1=ra+(rb-ra)*t1;z0=za+(zb-za)*t0;z1=za+(zb-za)*t1
                    for sign in (-1,1):
                        a=(sign*r0,side*r0*.72,z0); b=(-sign*r1,side*r1*.72,z1)
                        if axis: a=(a[1]/.72,a[0]*.72,a[2]);b=(b[1]/.72,b[0]*.72,b[2])
                        m.beam(a,b,.012,'copper')
    for z,r in [( .69,.3),(1.15,.19),(1.82,.1)]: m.box(0,0,z,r*2,r*1.6,.065,'bronze')
    for y in (-.3,.3): m.arch(0,y,.13,.65,.46,'copper',.035)
    m.cone(0,0,1.85,.053,.25,'bronze',top=.015); m.cone(0,0,2.1,.01,.15,'gold')
    for x in (-.63,.63): m.tree(x,.31,.12)
    return m.finish()

def sagrada():
    m=Model('sagrada-familia','Sagrada Família',['Perforated clustered spires','Nativity portal and rose window','Colourful finials and central cross'])
    m.base(); m.box(0,.02,.38,.89,.62,.55,'stone'); m.roof(0,.05,.65,.55,.54,.24,'limestone')
    for x,y,h in [(-.34,-.2,1.18),(-.13,-.2,1.39),(.13,-.2,1.39),(.34,-.2,1.18),(-.32,.22,1.17),(.32,.22,1.17),(0,.15,1.84)]:
        m.cone(x,y,.48,.077,h-.48,'stone',top=.035,n=12)
        for k in range(5):
            z=.64+k*(h-.65)/6;m.box(x,y-.067,z,.021,.012,.055,'night')
        m.sphere(x,y,h+.01,.05,.05,.065,'gold' if x==0 else 'jade',10)
        if x!=0:m.sphere(x,y,h+.07,.025,.025,.035,'red',8)
    m.beam((0,.15,1.87),(0,.15,2.04),.014,'gold'); m.beam((-.065,.15,1.985),(.065,.15,1.985),.013,'gold')
    for x in (-.26,0,.26): m.arch(x,-.315,.12,.2,.39,'ivory',.06)
    m.sphere(0,-.333,.63,.11,.015,.11,'gold');m.sphere(0,-.35,.63,.082,.008,.082,'glass')
    for i in range(8):
        a=i*math.tau/8;m.beam((0,-.365,.63),(.08*math.cos(a),-.365,.63+.08*math.sin(a)),.007,'stone')
    return m.finish()

def colosseum():
    m=Model('colosseum','Colosseum',['Open oval arena','Three storeys of real arcades','Broken upper rim'])
    m.base('sand'); m.lathe(0,0,.11,[(.49,0),(.49,.04)],'limestone',32,1.15,.76)
    for level in range(3):
        z=.14+level*.205
        for i in range(20):
            if level==2 and 1<i<7:continue
            a=i*math.tau/20;x=.56*math.cos(a);y=.39*math.sin(a)
            tangent=math.atan2(.39*math.cos(a),-.56*math.sin(a))
            width=math.hypot(.56*math.sin(a),.39*math.cos(a))*math.tau/20
            m.arch(x,y,z,width,.195,'stone' if level%2 else 'ivory',.075,tangent)
            verts=[]
            for zz in (z+.185,z+.212):
                for r in (.91,1.09):
                    for aa in (a-math.pi/20,a+math.pi/20):verts.append((.56*r*math.cos(aa),.39*r*math.sin(aa),zz))
            m.mesh(verts,[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)],'limestone')
    for r,z in [(.43,.15),(.37,.12)]:
        for i in range(24):
            a=i*math.tau/24;m.box(r*math.cos(a),r*.69*math.sin(a),z,.12,.08,.04,'stone',a+math.pi/2)
    return m.finish()

def bigben():
    m=Model('big-ben','Big Ben',['Four clock faces','Gothic pinnacles and slate roof','Warm sandstone buttresses'])
    podium(m);m.box(0,0,.76,.36,.36,1.12,'stone')
    for x in (-.18,.18):
        for y in (-.18,.18):m.box(x,y,.79,.045,.045,1.19,'ivory')
    m.windows(0,-.188,.35,3,6,.075,.12,'night'); m.windows(0,.19,.35,3,6,.075,.12,'glass')
    m.box(0,0,1.37,.47,.47,.35,'stone'); clock(m,0,-.245,1.38,.15)
    # Additional clock faces are authored as geometry rotated around the tower.
    start=len(m.v);clock(m,0,-.245,1.38,.15)
    for i in range(start,len(m.v)):
        x,y,z=m.v[i];m.v[i]=(-y,x,z)
    for z in (1.19,1.56):m.box(0,0,z,.5,.5,.055,'gold')
    m.lathe(0,0,1.59,[(.28,0),(.08,.36)],'roof',4,phase=math.pi/4)
    for x in (-.22,.22):
        for y in (-.22,.22):m.cone(x,y,1.6,.035,.28,'gold')
    m.cone(0,0,1.95,.025,.17,'gold');m.tree(-.54,.2,.14);m.tree(.54,.2,.14)
    return m.finish()

def acropolis():
    m=Model('acropolis','Acropolis',['Rocky sacred plateau','Open Doric colonnade','Sculpted pediment and terracotta roof'])
    m.base('earth');m.lathe(0,0,.1,[(.68,0),(.62,.18)],'limestone',9,1,.7)
    for i in range(3):m.box(0,0,.27+i*.035,1.05-i*.07,.72-i*.045,.035,'ivory')
    for x in (-.42,-.25,-.08,.08,.25,.42):
        for y in (-.245,.245):
            m.cone(x,y,.36,.025,.35,'ivory',top=.022,n=10);m.box(x,y,.715,.072,.072,.035,'stone')
    for x in (-.42,.42):
        for y in (-.08,.08):m.cone(x,y,.36,.025,.35,'ivory',top=.022,n=10)
    m.box(0,0,.755,1.04,.67,.08,'ivory');m.roof(0,0,.8,1.09,.71,.22,'brick')
    for y in (-.362,.362):m.roof(0,y,.8,1.08,.03,.2,'ivory')
    for x in (-.3,-.15,0,.15,.3):m.sphere(x,-.387,.845,.027,.012,.035,'stone',8)
    m.stairs(0,-.48,.1,.28,6,.034,.04);return m.finish()

def christ():
    m=Model('christ-the-redeemer','Christ the Redeemer',['Outstretched robe sleeves','Sculpted head and draped torso','Green mountain and viewing terrace'])
    m.base('pine');m.lathe(0,0,.09,[(.57,0),(.36,.28),(.23,.51)],'green',9,1,.78)
    m.box(0,0,.65,.46,.35,.12,'stone');m.box(0,0,.74,.23,.2,.12,'ivory')
    m.lathe(0,0,.8,[(.15,0),(.12,.31),(.1,.45)],'ivory',10,.8,.6)
    m.sphere(0,0,1.39,.075,.07,.11,'ivory')
    m.box(0,-.012,1.51,.12,.105,.035,'limestone')
    for sign in (-1,1):
        m.beam((sign*.065,0,1.21),(sign*.48,0,1.23),.065,'ivory',10)
        m.sphere(sign*.51,0,1.24,.065,.03,.023,'stone',10)
        m.beam((sign*.07,-.058,.83),(sign*.044,-.061,1.2),.013,'stone')
    for x,y in [(-.52,.2),(.49,.23),(-.4,-.25)]:m.tree(x,y,.12)
    return m.finish()

def machu():
    m=Model('machu-picchu','Machu Picchu',['Huayna Picchu peak','Alternating agricultural terraces','Open stone houses and zigzag paths'])
    m.base('pine');m.lathe(.15,.25,.12,[(.36,0),(.25,.4),(.12,.77),(.01,1.06)],'green',7,.85,.7)
    for i in range(5):
        w=1.25-i*.16;d=.68-i*.075;z=.11+i*.095
        m.box(-.09,-.13,z+.025,w,d,.055,'rock');m.box(-.09,-.13,z+.064,w-.025,d-.02,.025,'leaf')
    for x,y,z in [(-.37,-.17,.62),(-.12,-.13,.62),(.18,-.25,.43),(-.5,-.33,.34)]:
        m.box(x-.075,y,z,.035,.15,.14,'stone');m.box(x+.075,y,z,.035,.15,.14,'stone');m.box(x,y+.065,z,.15,.025,.14,'stone')
        m.roof(x,y+.07,z+.07,.18,.025,.08,'stone')
    m.stairs(.32,-.46,.12,.105,10,.034,.03,'limestone');return m.finish()

def taj():
    m=Model('taj-mahal','Taj Mahal',['White onion dome and golden finial','Four independent minarets','Arched entrance and reflecting garden'])
    m.base('green');m.box(0,.11,.15,1.19,.72,.1,'ivory');m.box(0,.12,.4,.6,.43,.4,'ivory')
    m.arch(0,-.11,.21,.24,.32,'stone',.025);m.box(0,-.124,.335,.145,.009,.2,'night')
    m.cone(0,.12,.6,.21,.085,'ivory',top=.21);m.onion(0,.12,.685,.23,.34)
    m.cone(0,.12,1.025,.014,.12,'gold')
    for x in (-.5,.5):
        for y in (-.2,.4):
            m.cone(x,y,.2,.04,.56,'ivory',top=.026)
            for z in (.39,.61,.77):m.cone(x,y,z,.055,.026,'stone',top=.055)
            m.onion(x,y,.795,.049,.084);m.cone(x,y,.88,.009,.07,'gold')
    for x in (-.235,.235):
        for y in (-.025,.26):m.onion(x,y,.62,.07,.13)
    m.box(0,-.37,.115,.19,.27,.025,'water')
    for x in (-.17,.17):
        for y in (-.29,-.44):m.cypress(x,y,.14)
    return m.finish()

def angkor():
    m=Model('angkor-wat','Angkor Wat',['Five lotus towers','Stepped stone galleries','Moat and processional causeway'])
    m.base('water');m.box(0,.04,.135,1.23,.72,.075,'green')
    for i in range(3):m.box(0,.08,.19+i*.055,.97-i*.15,.59-i*.09,.06,'rock')
    for x,y,h in [(-.32,-.1,.66),(.32,-.1,.66),(-.28,.26,.73),(.28,.26,.73),(0,.09,1.05)]:
        for i in range(6):m.cone(x,y,.32+i*(h-.32)/6,.105*(1-i*.12),(h-.32)/6,'limestone' if i%2 else 'rock',top=.095*(1-i*.12),n=8)
        m.onion(x,y,h,.037,.085,'stone')
    for x in (-.34,-.17,0,.17,.34):m.arch(x,-.225,.2,.13,.17,'stone',.05)
    m.box(0,-.35,.13,.2,.35,.06,'stone');m.stairs(0,-.23,.16,.18,4,.026,.028)
    m.tree(-.59,.33,.12);m.tree(.59,.33,.12);return m.finish()

def opera():
    m=Model('sydney-opera-house','Sydney Opera House',['Curved overlapping shell vaults','Blue glass beneath white sails','Harbour promenade'])
    m.base('water');m.box(0,0,.16,1.25,.8,.13,'stone');m.stairs(0,-.5,.1,.82,4,.027,.045)
    # Closed, thin curved vaults. Each sail has an arched dark-glass end facade.
    for x,y,w,d,h in [(-.31,.15,.4,.45,.75),(.07,.2,.4,.43,.88),(.35,.12,.32,.36,.64),(-.28,-.2,.35,.3,.48),(.13,-.2,.36,.31,.56)]:
        vs=[];nx=17;nu=17
        for layer in range(2):
            for j in range(nx):
                t=j/(nx-1);height=h*math.sin(math.pi*t*.7)**.82;spread=d*.5*(.32+.68*t)
                for k in range(nu):
                    u=-math.pi/2+math.pi*k/(nu-1)
                    vs.append((x-w/2+w*t,y+spread*math.sin(u),.29+height*math.cos(u)-layer*.012))
        fs=[];offset=nx*nu
        for j in range(nx-1):
            for k in range(nu-1):
                a=j*nu+k;b=(j+1)*nu+k;c=b+1;dd=a+1
                fs.extend([(a,b,c,dd),(dd+offset,c+offset,b+offset,a+offset)])
        for j in range(nx-1):
            for k in (0,nu-1):
                a=j*nu+k;b=(j+1)*nu+k;fs.append((a,a+offset,b+offset,b))
        for j in (0,nx-1):
            for k in range(nu-1):
                a=j*nu+k;fs.append((a,a+1,a+1+offset,a+offset))
        m.mesh(vs,fs,'white',True)
        # Recess the end glazing just behind the clean shell edge.
        end=[(px-.012,py,pz-.015) for px,py,pz in vs[(nx-1)*nu:nx*nu]]
        end.append((x+w/2-.012,y,.29));center=len(end)-1
        m.mesh(end,[(center,k,k+1) for k in range(nu-1)],'glass')
        for k in (4,8,12):
            px,py,pz=end[k];m.beam((px,py,.29),(px,py,pz),.005,'ivory')
        for j in (5,10,16):
            for k in range(nu-1):m.beam(vs[j*nu+k],vs[j*nu+k+1],.0035,'ivory',6)
    return m.finish()

def bridge():
    m=Model('golden-gate-bridge','Golden Gate Bridge',['International Orange portal towers','Sweeping suspension cables','Road deck over blue bay'])
    m.base('water');m.box(0,0,.36,1.43,.25,.07,'rail')
    for x in (-.43,.43):
        for y in (-.14,.14):m.box(x,y,.72,.07,.06,1.12,'red')
        for z in (.51,.82,1.1,1.25):m.box(x,0,z,.09,.34,.055,'red')
        m.box(x,0,.17,.18,.4,.12,'stone')
    for y in (-.17,.17):
        segments=[(-.71,.47),(-.43,1.25)]
        segments += [(-.43+.86*i/16,.57+.68*(2*i/16-1)**2) for i in range(1,17)]
        segments +=[(.71,.47)]
        for a,b in zip(segments,segments[1:]):m.beam((a[0],y,a[1]),(b[0],y,b[1]),.011,'red')
        for i in range(13):
            x=-.39+i*.065;z=.57+.68*(x/.43)**2;m.beam((x,y,.4),(x,y,z),.005,'ivory')
    for x in (-.24,.12):m.box(x,0,.42,.07,.075,.035,'warm')
    m.box(-.58,-.33,.103,.17,.04,.007,'water_light');return m.finish()

def liberty():
    m=Model('statue-of-liberty','Statue of Liberty',['Raised torch and golden flame','Seven-point crown and tablet','Copper-green robes on stone pedestal'])
    m.base('water');m.lathe(0,0,.1,[(.55,0),(.45,.08)],'green',8,1,.7)
    for z,w,h in [(.24,.46,.16),(.43,.31,.24),(.57,.38,.07)]:m.box(0,0,z,w,w,h,'stone')
    m.lathe(0,0,.61,[(.16,0),(.11,.31),(.09,.5)],'jade',10,.85,.7)
    m.sphere(0,0,1.2,.075,.07,.11,'jade_light')
    m.beam((-.07,0,1.04),(-.25,0,1.41),.041,'jade');m.beam((-.25,0,1.4),(-.25,0,1.58),.027,'jade_light')
    m.cone(-.25,0,1.56,.065,.075,'bronze',top=.045);m.onion(-.25,0,1.635,.049,.12,'gold')
    m.beam((.08,0,1.04),(.2,-.06,.9),.037,'jade');m.box(.16,-.092,.94,.12,.045,.2,'jade_light',-.15)
    for i in range(7):
        a=math.pi*(i/6);m.beam((.071*math.cos(a),0,1.255+.045*math.sin(a)),(.14*math.cos(a),0,1.27+.13*math.sin(a)),.011,'jade_light')
    for x in (-.06,0,.06):m.beam((x,-.085,.65),(x*.45,-.07,1.04),.008,'jade_light')
    m.stairs(0,-.35,.13,.25,5,.032,.035);return m.finish()

def moai():
    m=Model('moai-of-rapa-nui','Moai of Rapa Nui',['Three elongated carved faces','Heavy brows and long noses','Red pukao and volcanic grass base'])
    m.base('green');m.box(0,0,.16,1.18,.4,.13,'rock')
    for x,h in [(-.4,.66),(0,.88),(.4,.59)]:
        m.box(x,.04,.22+h*.3,.2,.22,h*.48,'rock');m.box(x,0,.22+h*.72,.21,.22,h*.54,'rock')
        m.box(x,-.124,.22+h*.74,.052,.072,h*.25,'limestone')
        m.box(x,-.13,.22+h*.91,.23,.055,.045,'earth')
        m.box(x,-.13,.22+h*.53,.12,.03,.025,'earth')
        for xx in (-.069,.069):m.box(x+xx,-.12,.22+h*.83,.04,.009,.018,'night')
        if x==0:m.cone(x,.01,.22+h*1.01,.14,.13,'brick',top=.12,n=10)
    for x in (-.65,.62):m.sphere(x,.3,.15,.1,.08,.05,'limestone',8)
    return m.finish()

def chichen():
    m=Model('chichen-itza','Chichén Itzá',['Nine stepped pyramid terraces','Broad central staircase','Summit temple and serpent balustrades'])
    m.base('green')
    for i in range(9):
        w=1.16-i*.105;m.box(0,.04,.12+i*.072,w,w*.7,.072,'stone' if i%2 else 'sand')
    m.box(0,.04,.87,.28,.25,.21,'limestone');m.box(0,.04,.99,.34,.29,.045,'ivory')
    m.box(0,-.094,.85,.1,.015,.15,'night')
    m.stairs(0,-.43,.1,.22,18,.04,.025,'ivory')
    for x in (-.15,.15):
        m.beam((x,-.46,.13),(x,0,.83),.022,'limestone');m.sphere(x,-.46,.15,.035,.065,.035,'stone',8)
    return m.finish()

def giza():
    m=Model('pyramids-of-giza','Pyramids of Giza',['Three unequal pyramids','Stone course lines and pale caps','Miniature reclining Sphinx'])
    m.base('sand')
    for x,y,w,h in [(-.25,.11,.76,.84),(.35,.16,.51,.57),(.37,-.31,.28,.3)]:
        m.lathe(x,y,.1,[(w/math.sqrt(2),0),(0,h)],'stone',4,phase=math.pi/4)
        for j in range(1,7):
            r=w/math.sqrt(2)*(1-j/8);m.lathe(x,y,.1+h*j/8,[(r+.003,0),(r,.008)],'limestone',4,phase=math.pi/4)
        m.lathe(x,y,.1+h*.84,[(w/math.sqrt(2)*.16,0),(0,h*.16)],'ivory',4,phase=math.pi/4)
    m.box(-.4,-.34,.15,.24,.12,.09,'limestone');m.sphere(-.4,-.4,.23,.055,.06,.08,'stone',10)
    m.box(-.4,-.425,.27,.13,.06,.05,'sand');m.box(-.4,-.475,.16,.16,.12,.035,'stone')
    return m.finish()

def castle():
    m=Model('neuschwanstein-castle','Neuschwanstein Castle',['Ivory palace and blue conical turrets','Terracotta gatehouse','Steep green crag and courtyard'])
    m.base('pine');m.lathe(0,.04,.1,[(.66,0),(.5,.22)],'rock',8,1,.72)
    m.box(0,.08,.64,.72,.44,.64,'ivory');m.roof(0,.08,.96,.8,.5,.23,'roof')
    for x,y,h in [(-.38,.13,1.23),(.38,.15,1.42),(-.24,-.2,.92),(.23,-.18,1.07)]:
        m.cone(x,y,.32,.085,h-.32,'ivory',top=.085,n=12)
        m.cone(x,y,h,.12,.26,'roof',top=.005,n=12);m.cone(x,y,h+.25,.008,.08,'gold')
        m.box(x,y-.09,h-.13,.034,.008,.09,'night')
    m.windows(0,-.147,.48,5,3,.115,.135,'night')
    m.box(0,-.32,.48,.31,.21,.34,'brick');m.roof(0,-.32,.65,.37,.27,.19,'roof');m.arch(0,-.437,.31,.145,.24,'ivory',.025)
    m.stairs(0,-.49,.1,.2,5,.043,.033);m.tree(-.59,.3,.13);m.tree(.6,.29,.13);return m.finish()

def fuji():
    m=Model('mount-fuji','Mount Fuji',['Broad volcanic cone','Irregular snow line and crater','Lake, cherry blossoms and red torii'])
    m.base('green');m.lathe(.04,.12,.1,[(.59,0),(.46,.22),(.3,.52),(.13,.86),(.09,.9)],'blue',28,1,.74)
    verts=[]
    for ring in range(3):
        for i in range(28):
            a=i*math.tau/28;r=[.25,.135,.088][ring];z=[.66+.04*math.sin(i*2.3),.96,1][ring]
            verts.append((.04+r*math.cos(a),.12+r*.74*math.sin(a),z))
    fs=[(j*28+i,j*28+(i+1)%28,(j+1)*28+(i+1)%28,(j+1)*28+i) for j in range(2) for i in range(28)]
    m.mesh(verts,fs,'snow');m.cone(.04,.12,.976,.086,.012,'rock',top=.083,n=28)
    m.sphere(-.12,-.34,.11,.37,.15,.025,'water');m.tree(-.53,-.12,.15,'pink');m.tree(.52,-.2,.13,'pink')
    for x in (.3,.48):m.beam((x,-.4,.1),(x,-.4,.32),.016,'red')
    m.box(.39,-.4,.33,.27,.05,.027,'red');m.box(.39,-.4,.275,.24,.03,.022,'red');return m.finish()

def wall():
    m=Model('great-wall-of-china','Great Wall of China',['Winding crenellated ramparts','Three roofed watchtowers','Rolling green ridgeline'])
    m.base('green')
    pts=[(-.64,-.2,.25),(-.4,-.08,.41),(-.17,.16,.56),(.08,.19,.48),(.31,-.06,.36),(.61,.07,.5)]
    for x,y,z in pts:m.sphere(x,y,.13,.22,.25,z-.02,'leaf',10)
    for a,b in zip(pts,pts[1:]):
        av,bv=Vector(a),Vector(b);d=bv-av;n=7
        for i in range(n):
            p=av+d*((i+.5)/n);ang=math.atan2(d.y,d.x)
            m.box(p.x,p.y,p.z,.11,.2,.2,'stone',ang)
            for sign in (-1,1):m.box(p.x-sign*math.sin(ang)*.1,p.y+sign*math.cos(ang)*.1,p.z+.135,.05,.04,.07,'ivory',ang)
    for i in (0,2,5):
        x,y,z=pts[i];m.box(x,y,z+.12,.24,.27,.28,'limestone');m.roof(x,y,z+.27,.3,.33,.13,'roof');m.box(x,y-.14,z+.15,.055,.012,.095,'night')
    return m.finish()

def hagia():
    m=Model('hagia-sophia','Hagia Sophia',['Broad lead-grey central dome','Cascading half-domes','Four slender minarets and brick galleries'])
    m.base();m.box(0,.04,.4,.7,.57,.55,'brick');m.cone(0,.04,.68,.3,.11,'stone',top=.3,n=24);m.dome(0,.04,.79,.31,.27,'roof')
    m.cone(0,.04,1.06,.012,.13,'gold')
    for x in (-.36,.36):
        m.box(x,.04,.29,.26,.42,.33,'brick');m.dome(x,.04,.455,.2,.19,'roof')
    for x,y in [(-.59,-.29),(.59,-.29),(-.56,.32),(.56,.32)]:
        m.cone(x,y,.1,.038,.92,'ivory',top=.022);m.cone(x,y,.85,.058,.026,'stone',top=.058);m.cone(x,y,1.02,.047,.2,'roof');m.cone(x,y,1.22,.007,.065,'gold')
    for x in (-.24,-.12,0,.12,.24):m.arch(x,-.255,.15,.095,.21,'ivory',.025)
    for i in range(12):
        a=i*math.tau/12;m.box(.3*math.cos(a),.04+.3*math.sin(a),.73,.038,.025,.065,'warm',a-math.pi/2)
    m.stairs(0,-.44,.09,.48,3,.024,.04);return m.finish()

def canyon():
    m=Model('grand-canyon','Grand Canyon',['Layered red sandstone mesas','Deep winding gorge','Turquoise river and sparse desert shrubs'])
    m.base('sand')
    # Opposing terraced walls keep a visible river gap down the middle.
    m.box(0,0,.11,.18,.93,.025,'water',-.17)
    for x,y,h in [(-.42,-.28,.56),(-.36,.22,.76),(.37,-.18,.7),(.41,.3,.52)]:
        for i in range(6):
            r=.28-i*.021;m.lathe(x,y,.13+i*h/6,[(r,0),(r*.94,h/6)],['brick','red','stone','brick','orange','sand'][i],7,1,.9,phase=i*.035)
    for x,y in [(-.64,.32),(.64,-.32),(-.55,-.4)]:m.sphere(x,y,.15,.07,.055,.06,'pine',8)
    return m.finish()

def jail(go=False):
    m=Model('go-to-jail' if go else 'jail','Go to Jail' if go else 'Jail',['Open barred entrance','Corner watchtowers and warm lamps','Stone walls with blue roofs' if not go else 'Civic guardhouse and police beacon'])
    m.base();m.box(0,.09,.41,1.0,.58,.61,'stone');m.box(0,.09,.735,1.08,.65,.075,'roof')
    m.box(0,-.208,.38,.32,.012,.46,'night');m.arch(0,-.225,.15,.39,.52,'ivory',.045)
    for x in (-.12,-.06,0,.06,.12):m.box(x,-.25,.38,.017,.025,.42,'rail')
    for z in (.2,.55):m.box(0,-.265,z,.3,.02,.018,'rail')
    for x in (-.38,.38):
        m.box(x,-.211,.47,.17,.02,.19,'night')
        for dx in (-.055,0,.055):m.box(x+dx,-.23,.47,.013,.02,.2,'silver')
        m.box(x,-.27,.69,.05,.07,.07,'warm')
    for x in (-.5,.5):
        m.box(x,.24,.65,.22,.24,1.1,'limestone');m.box(x,.24,1.19,.29,.3,.07,'roof')
        m.box(x,.109,1.025,.16,.018,.14,'glass');m.roof(x,.24,1.23,.32,.34,.13,'roof')
    m.box(0,-.265,.735,.5,.03,.09,'roof')
    # Engraved-style slats and stonework are deliberately large enough for mobile.
    for i in range(5):
        z=.19+i*.09
        for sign in (-1,1):m.box(sign*.37,-.208,z,.22,.011,.009,'limestone')
    m.stairs(0,-.45,.09,.42,3,.021,.047)
    if go:
        m.box(0,.03,.86,.32,.22,.12,'ivory');m.sphere(-.085,.03,.95,.07,.06,.05,'red');m.sphere(.085,.03,.95,.07,.06,.05,'blue')
        for x in (-.59,.59):m.cone(x,-.38,.09,.04,.13,'orange',top=.008,n=8)
    else:
        m.box(.5,-.38,.16,.27,.1,.04,'bronze');m.tree(-.59,-.32,.1)
    return m.finish()

def station(modern=False):
    m=Model('transit-station-east' if modern else 'transit-station-west','Transit Station · East' if modern else 'Transit Station · West',['Visible rails and miniature train','Arched glass concourse' if modern else 'Brick clock hall','Teal canopy and platform lamps'])
    m.base();m.box(0,-.04,.15,1.34,.49,.09,'stone')
    for x in [i*.11-.66 for i in range(13)]:m.box(x,-.32,.11,.045,.28,.025,'bronze')
    for y in (-.41,-.24):m.box(0,y,.137,1.43,.019,.028,'rail')
    m.box(-.12,-.32,.25,.75,.19,.2,'ivory');m.box(-.12,-.32,.356,.77,.21,.025,'jade')
    for x in (-.37,-.23,-.09,.05,.18):m.box(x,-.423,.278,.09,.013,.074,'glass')
    for x in (-.34,.1):
        for y in (-.405,-.24):m.sphere(x,y,.16,.039,.018,.039,'night',10)
    for y in (-.4,-.25):m.sphere(.268,y,.23,.008,.013,.016,'warm',8)
    if modern:
        for x in (-.51,-.17,.17,.51):m.arch(x,.13,.2,.54,.67,'ivory',.034,math.pi/2)
        for j in range(16):
            a=math.pi*j/16;b=math.pi*(j+1)/16
            yy=.13+.27*math.cos(a);zz=.6+.27*math.sin(a)
            yy2=.13+.27*math.cos(b);zz2=.6+.27*math.sin(b)
            m.mesh([(-.6,yy,zz),(.6,yy,zz),(.6,yy2,zz2),(-.6,yy2,zz2)],[(0,1,2,3)],'glass' if j%3 else 'silver')
        m.box(.51,.13,.46,.06,.48,.48,'ivory');m.box(.475,-.07,.49,.012,.15,.29,'glass')
    else:
        m.box(0,.22,.42,.73,.33,.5,'brick');m.roof(0,.22,.68,.86,.44,.25,'roof')
        m.box(0,.02,.63,.22,.12,.45,'ivory');clock(m,0,-.049,.73,.09);m.roof(0,.02,.86,.29,.2,.15,'roof')
        for x in (-.25,.25):m.arch(x,.035,.19,.17,.31,'ivory',.025)
        m.box(0,-.025,.59,1.17,.27,.045,'jade')
        for x in (-.55,.55):m.beam((x,-.13,.18),(x,-.13,.59),.017,'ivory')
    for x in (-.63,.63):
        m.beam((x,-.06,.19),(x,-.06,.56),.012,'roof');m.sphere(x,-.06,.6,.043,.04,.053,'warm',10)
    return m.finish()

BUILDERS=[taipei,petronas,marina,burj,eiffel,sagrada,colosseum,bigben,acropolis,christ,machu,taj,angkor,opera,bridge,liberty,moai,chichen,giza,castle,fuji,wall,hagia,canyon,lambda:jail(False),lambda:jail(True),lambda:station(False),lambda:station(True)]

def build_range(start,end):
    for index,fn in enumerate(BUILDERS[start:end],start):
        if index < len(ASSETS):continue
        obj=fn();print('BUILT',obj.name,len(obj.data.polygons),'faces')

def setup_studio():
    scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
    scene.world=bpy.data.worlds.new('PUI / soft blue studio');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.3,.37,.45,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
    scene.view_settings.view_transform='AgX'
    groundmat=material('203C43')
    mesh=bpy.data.meshes.new('Studio floor');mesh.from_pydata([(-200,-200,-.04),(200,-200,-.04),(200,200,-.04),(-200,200,-.04)],[],[(0,1,2,3)])
    ground=bpy.data.objects.new('STUDIO · floor',mesh);scene.collection.objects.link(ground);mesh.materials.append(groundmat)
    for name,loc,power,size,color in [('Key',(-7,-9,17),2100,10,(1,.89,.72)),('Fill',(10,-3,12),1700,9,(.73,.86,1)),('Rim',(2,10,15),2400,8,(1,1,.94))]:
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
        obj=bpy.data.objects.new('STUDIO · '+name,data);scene.collection.objects.link(obj);obj.location=loc;obj.rotation_euler=(Vector((0,0,0))-obj.location).to_track_quat('-Z','Y').to_euler()
    camdata=bpy.data.cameras.new('PUI architectural camera');cam=bpy.data.objects.new('STUDIO · camera',camdata);scene.collection.objects.link(cam);scene.camera=cam;camdata.type='ORTHO'
    cam.location=(9,-18,22);cam.rotation_euler=(Vector((0,0,.4))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.ortho_scale=22
    scene.render.resolution_x=2200;scene.render.resolution_y=1700;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    for a in ASSETS:
        curve=bpy.data.curves.new(a.name+' label','FONT');curve.body=a.name;curve.align_x='CENTER';curve.size=.115;curve.extrude=0
        label=bpy.data.objects.new('LABEL · '+a.name,curve);scene.collection.objects.link(label);label.location=(a.location.x,a.location.y-.69,.025);curve.materials.append(material('label'))
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.overlay.show_overlays=False
                area.spaces.active.shading.type='MATERIAL'
    print('Studio ready:',len(ASSETS),'miniatures')

def export_range(start,end):
    exportdir=OUT/'glb';exportdir.mkdir(exist_ok=True)
    for a in ASSETS[start:end]:
        bpy.ops.object.select_all(action='DESELECT');a.select_set(True);bpy.context.view_layer.objects.active=a
        loc=a.location.copy();a.location=(0,0,0)
        try:
            bpy.ops.export_scene.gltf(filepath=str(exportdir/(a['pui_asset_id']+'.glb')),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True,export_extras=True)
        finally:a.location=loc
    print('Exported',start,end)

def save_library():
    deps=bpy.context.evaluated_depsgraph_get();metadata=[]
    for a in ASSETS:
        ev=a.evaluated_get(deps);mesh=ev.to_mesh();mesh.calc_loop_triangles()
        metadata.append({'id':a['pui_asset_id'],'name':a.name,'features':a['signature_features'].split(' | '),'file':'glb/'+a['pui_asset_id']+'.glb','dimensions_blender_xyz':[round(v,3) for v in a.dimensions],'triangles':len(mesh.loop_triangles),'materials':len(mesh.materials)})
        ev.to_mesh_clear()
    (OUT/'manifest.json').write_text(json.dumps({'version':1,'status':'Blender review only; game not integrated','source':PROMPT,'assets':metadata},ensure_ascii=False,indent=2))
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'PUI-Fortune-Landmark-Atelier.blend'))
    print('Saved',len(metadata),'models;',sum(a['triangles'] for a in metadata),'total triangles')

def render_overview():
    scene.render.filepath=str(OUT/'landmark-collection.png');bpy.ops.render.render(write_still=True)

def render_asset(index):
    a=ASSETS[index];cam=scene.camera
    for other in ASSETS:other.hide_render=other!=a
    for o in scene.objects:
        if o.name.startswith('LABEL'):o.hide_render=True
    target=a.location+Vector((0,0,max(.43,a.dimensions.z*.43)))
    cam.location=target+Vector((3,-5,3.1));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.ortho_scale=max(1.98,a.dimensions.z*1.13+ .22)
    scene.render.resolution_x=600;scene.render.resolution_y=600;scene.cycles.samples=20
    (OUT/'previews').mkdir(exist_ok=True);scene.render.filepath=str(OUT/'previews'/(a['pui_asset_id']+'.png'));bpy.ops.render.render(write_still=True)
    print('Preview',index,a.name)

def restore_gallery():
    for o in scene.objects:o.hide_render=False
    cam=scene.camera;cam.location=(9,-18,22);cam.rotation_euler=(Vector((0,0,.4))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=22
    scene.render.resolution_x=2200;scene.render.resolution_y=1700;scene.cycles.samples=24

def organize_library():
    collections={}
    for name in ('01 · World landmarks','02 · Jail and transit','03 · Studio and labels'):
        col=bpy.data.collections.get(name)
        if col is None:
            col=bpy.data.collections.new(name);scene.collection.children.link(col)
        collections[name]=col
    for i,a in enumerate(ASSETS):
        a['asset_order']=i;a.asset_mark()
        a.asset_data.description=a['signature_features']
        a.asset_data.author='PUI Fortune — original Blender miniatures'
        a.asset_data.tags.new('PUI Fortune');a.asset_data.tags.new('Architecture')
        col=collections['01 · World landmarks' if i<24 else '02 · Jail and transit']
        if a.name not in col.objects:col.objects.link(a)
        for old in list(a.users_collection):
            if old!=col:old.objects.unlink(a)
        preview=OUT/'previews'/(a['pui_asset_id']+'.png')
        if preview.exists():
            with bpy.context.temp_override(id=a):bpy.ops.ed.lib_id_load_custom_preview(filepath=str(preview))
    for a in list(scene.objects):
        if a.name.startswith(('STUDIO','LABEL')):
            col=collections['03 · Studio and labels']
            if a.name not in col.objects:col.objects.link(a)
            for old in list(a.users_collection):
                if old!=col:old.objects.unlink(a)
    bpy.ops.object.select_all(action='DESELECT')
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                sp=area.spaces.active;sp.region_3d.view_perspective='CAMERA';sp.region_3d.view_camera_zoom=0
                sp.overlay.show_overlays=False
    print('Organized 28 assets, with custom thumbnails, in the Blender Asset Browser')
