import * as THREE from '../../vendor/three.module.min.js';

// One shared geometry per architectural part. Every part is instanced by the city batch.
function partGeometry(kind) {
  if (kind === 'softBox') {
    const s = new THREE.Shape(); s.moveTo(-.47, -.47); s.lineTo(.47, -.47); s.lineTo(.47, .47); s.lineTo(-.47, .47); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: .94, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 1, steps: 1 });
    g.center(); return g;
  }
  if (kind === 'column') return new THREE.CylinderGeometry(1, 1, 1, 12);
  if (kind === 'cone') return new THREE.ConeGeometry(1, 1, 12);
  if (kind === 'pyramid') { const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4); g.rotateY(Math.PI / 4); return g; }
  if (kind === 'flare') { const g = new THREE.CylinderGeometry(Math.SQRT1_2, .52, 1, 4); g.rotateY(Math.PI / 4); return g; }
  if (kind === 'dome') return new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  if (kind === 'rock') return new THREE.IcosahedronGeometry(1, 0);
  if (kind === 'mesa') return new THREE.CylinderGeometry(.86, 1, 1, 7);
  if (kind === 'sphere') return new THREE.SphereGeometry(1,16,8);
  if (kind === 'onion') return new THREE.LatheGeometry([[0,0],[.7,0],[.94,.26],[1,.52],[.82,.79],[.42,1.02],[.12,1.25],[0,1.4]].map(([x,y])=>new THREE.Vector2(x,y)),16);
  if (kind === 'arch') {
    const s = new THREE.Shape(); s.moveTo(-.5,0); s.lineTo(-.5,.5); s.absarc(0,.5,.5,Math.PI,0,true); s.lineTo(.5,0); s.lineTo(.32,0); s.lineTo(.32,.5); s.absarc(0,.5,.32,0,Math.PI,false); s.lineTo(-.32,0); s.closePath();
    const g = new THREE.ExtrudeGeometry(s,{depth:1,bevelEnabled:false,curveSegments:6,steps:1}); g.translate(0,0,-.5); return g;
  }
  if (kind === 'sail') {
    // A curved wedge with a high pointed crest and a rounded trailing edge.
    const s = new THREE.Shape(); s.moveTo(-.5,0); s.quadraticCurveTo(-.38,.58,.33,1); s.quadraticCurveTo(.46,.48,.5,0); s.closePath();
    const g = new THREE.ExtrudeGeometry(s,{depth:.65,bevelEnabled:true,bevelSize:.055,bevelThickness:.07,bevelSegments:2,curveSegments:8,steps:1}); g.translate(0,0,-.325); return g;
  }
  if (kind === 'roof') {
    const s = new THREE.Shape(); s.moveTo(-.5,0); s.lineTo(0,.5); s.lineTo(.5,0); s.closePath();
    const g = new THREE.ExtrudeGeometry(s,{depth:1,bevelEnabled:false,steps:1}); g.translate(0,0,-.5); return g;
  }
  return new THREE.BoxGeometry(1,1,1);
}

export class LandmarkParts {
  constructor(batch, tile, palette, height) {
    this.batch = batch; this.p = palette; this.height = height;
    this.scale = Math.min(tile.alongSize, tile.radialSize) / 2.3;
    this.origin = new THREE.Vector3(tile.x + tile.inward[0]*tile.landmarkAt,.43,tile.z + tile.inward[1]*tile.landmarkAt);
    this.rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),tile.rotation);
  }
  put(kind, color, x, y, z, sx, sy, sz, rotation = [0,0,0], surface = 'stone') {
    const key = `landmark:${kind}`;
    if (!this.batch.resources.geometries.has(key)) this.batch.resources.geometries.set(key,partGeometry(kind));
    const position = new THREE.Vector3(x,y,z).multiplyScalar(this.scale).applyQuaternion(this.rotation).add(this.origin);
    const q = this.rotation.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)));
    this.batch.add(key,color,position.toArray(),[sx*this.scale,sy*this.scale,sz*this.scale],q.toArray(),surface);
  }
  box(x,y,z,w,h,d,color=this.p.wall,surface='stone') { this.put('softBox',color,x,y,z,w,h,d,[0,0,0],surface); }
  base(color=this.p.ground) { this.box(0,.035,0,1.52,.07,.78,color); }
  column(x,y,z,r,h,color=this.p.wall) { this.put('column',color,x,y,z,r,h,r); }
  spire(x,y,z,r,h,color=this.p.roof) { this.put('cone',color,x,y+h/2,z,r,h,r); }
  dome(x,y,z,r,h,color=this.p.wall) { this.put('dome',color,x,y,z,r,h,r); }
  arch(x,y,z,w,h,d,color=this.p.trim,rotation=[0,0,0]) { this.put('arch',color,x,y,z,w,h,d,rotation); }
  beam(a,b,width,color=this.p.trim) {
    const av=new THREE.Vector3(...a), bv=new THREE.Vector3(...b), delta=bv.clone().sub(av);
    const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
    const e=new THREE.Euler().setFromQuaternion(q); const middle=av.add(bv).multiplyScalar(.5);
    this.put('column',color,...middle.toArray(),width,delta.length(),width,[e.x,e.y,e.z],'metal');
  }
  windows(x,y,z,cols,rows,w,h,gap=.12) {
    for(let row=0;row<rows;row++) for(let col=0;col<cols;col++) {
      const warm=(row+col*3)%7===0;
      this.put('box',warm?this.p.light:this.p.glass,x+(col-(cols-1)/2)*gap,y+row*gap,z,w,h,.012,[0,0,0],warm?'lit':'glass');
    }
  }
  tree(x,z,size=.17,color=this.p.leaf) {
    this.column(x,.17,z,.025,.25,'#927353');
    this.put('rock',color,x,.34,z,size,size*1.35,size);
  }
  steps(x,z,width,count,height,depth,color=this.p.trim) {
    for(let i=0;i<count;i++) this.box(x,(i+.5)*height,z-i*depth,width,height,depth*1.1,color);
  }
}
