// Model recipes use a common footprint and shared architectural parts.
// Coordinates are miniature art units, independent of game positions and property values.
export const landmarkModels = {
  taipei(b) {
    const p=b.p,h=b.height; b.base(); b.box(0,.15,0,.53,.23,.48,p.roof);
    for(let i=0;i<8;i++) {
      const y=.28+i*.175, w=.47-i*.009;
      b.put('flare',p.wall,0,y,0,w,.16,w,[0,0,0],'glass');
      b.box(0,y+.075,0,w+.035,.025,w+.035,p.trim,'metal');
      b.windows(0,y-.035,w/2+.004,3,1,.028,.06,.12);
    }
    b.box(0,1.73,0,.24,.2,.24,p.roof); b.spire(0,1.83,0,.05,h-1.83,p.trim);
    b.tree(-.6,0); b.tree(.6,0);
  },
  petronas(b) {
    const p=b.p,h=b.height; b.base();
    for(const x of [-.37,.37]) {
      b.column(x,.73,0,.2,1.3,p.wall);
      for(let i=0;i<9;i++) b.column(x,.17+i*.135,0,.218,.035,p.trim);
      for(const dx of [-.09,.09]) b.box(x+dx,.75,.191,.025,1.05,.02,p.glass,'glass');
      for(let i=0;i<3;i++) b.column(x,1.41+i*.12,0,.17-i*.035,.12,p.wall);
      b.spire(x,1.71,0,.055,h-1.71,p.trim);
    }
    b.box(0,.94,0,.48,.11,.16,p.glass,'glass'); b.box(0,.87,0,.52,.035,.2,p.trim);
    b.beam([-.19,.65,0],[0,.87,0],.024); b.beam([.19,.65,0],[0,.87,0],.024);
  },
  marina(b) {
    const p=b.p,h=b.height; b.base();
    for(const x of [-.46,0,.46]) {
      b.box(x,.5,0,.25,.88,.4,p.wall); b.box(x,.53,.208,.17,.78,.015,p.glass,'glass');
      for(let i=0;i<6;i++) b.box(x,.2+i*.12,.225,.24,.02,.024,p.trim);
    }
    b.put('sphere',p.trim,0,h-.12,0,.75,.12,.32);
    b.box(0,h-.03,-.04,1.27,.045,.39,'#548b49'); b.box(.17,h,-.1,.77,.02,.13,p.water,'glass');
    for(const x of [-.55,-.35]) b.put('rock',p.leaf,x,h+.07,.15,.065,.08,.065);
  },
  burj(b) {
    const p=b.p,h=b.height; b.base();
    const towers=[[-.23,.08,.32,1.02],[.19,.08,.3,1.32],[0,-.12,.33,1.72],[0,0,.2,1.96]];
    towers.forEach(([x,z,w,t])=>{
      b.box(x,t/2+.08,z,w,t,w,p.glass,'glass');
      for(const dx of [-w*.4,w*.4]) b.box(x+dx,t/2+.08,z+w/2,.023,t,.024,p.trim,'metal');
      for(let i=1;i<5;i++) b.box(x,i*t/5,z+w/2,.9*w,.022,.025,p.wall,'metal');
    }); b.spire(0,2.03,0,.045,h-2.03,p.trim);
  },
  eiffel(b) {
    const p=b.p,h=b.height; b.base();
    for(const sx of [-1,1]) for(const sz of [-1,1]) {
      b.beam([sx*.54,.07,sz*.28],[sx*.19,.84,sz*.12],.048,p.wall);
      b.beam([sx*.19,.84,sz*.12],[sx*.055,h-.18,sz*.035],.033,p.wall);
    }
    for(const z of [-.14,.14]) for(let i=0;i<3;i++) {
      const y=.6+i*.29,w=.29-i*.065;
      b.beam([-w,y,z],[w*.75,y+.26,z],.016,p.trim);
      b.beam([w,y,z],[-w*.75,y+.26,z],.016,p.trim);
    }
    b.box(0,.56,0,.76,.065,.42,p.roof); b.box(0,1.1,0,.36,.055,.25,p.wall);
    b.box(0,h-.2,0,.2,.09,.15,p.trim); b.spire(0,h-.15,0,.022,.15,p.wall);
  },
  sagrada(b) {
    const p=b.p,h=b.height; b.base(); b.box(0,.32,-.06,.96,.53,.42,p.wall);
    b.put('roof',p.trim,0,.57,-.06,.96,.5,.45);
    [-.48,-.25,.25,.48].forEach((x,i)=>{
      const t=i===1||i===2?1.23:1.04;
      b.column(x,t/2,.16,.085,t,p.wall); b.spire(x,t,.16,.09,.22,p.trim);
      b.put('rock',i%2?p.gold:'#77a568',x,t+.22,.16,.055,.07,.055);
    });
    b.column(0,.92,-.12,.12,.8,p.trim); b.spire(0,1.31,-.12,.13,h-1.31,p.wall);
    b.beam([-.09,h,-.12],[.09,h,-.12],.02,p.gold);
    b.arch(0,.08,.23,.32,.43,.055); b.put('column',p.glass,0,.61,.254,.105,.025,.105,[Math.PI/2,0,0],'glass');
  },
  colosseum(b) {
    const p=b.p; b.base(); b.put('column','#b78d60',0,.08,0,.58,.04,.29);
    for(let i=0;i<18;i++) {
      const a=i*Math.PI*2/18, x=Math.sin(a)*.62,z=Math.cos(a)*.28;
      for(let row=0;row<2;row++) b.arch(x,.1+row*.22,z,.205,.205,.09,p.wall,[0,a,0]);
      b.put('softBox',p.trim,x,.31,z,.24,.035,.11,[0,a,0]);
      b.put('softBox',p.trim,x,.54,z,.24,.04,.11,[0,a,0]);
      if(i>6&&i<15) b.put('softBox',p.wall,x,.6,z,.21,.12,.08,[0,a,0]);
    }
  },
  bigben(b) {
    const p=b.p,h=b.height; b.base(); b.box(0,.62,0,.4,1.1,.4,p.wall);
    for(const x of [-.17,.17]) b.box(x,.63,.21,.045,1.05,.04,p.trim);
    b.windows(0,.25,.213,2,4,.035,.09,.15); b.box(0,1.15,0,.46,.31,.46,p.trim);
    for(let i=0;i<4;i++) {
      const a=i*Math.PI/2,s=Math.sin(a),c=Math.cos(a);
      b.put('column',p.dark,s*.238,1.16,c*.238,.145,.016,.145,[Math.PI/2,0,-a]);
      b.put('column',p.light,s*.249,1.16,c*.249,.116,.016,.116,[Math.PI/2,0,-a]);
      b.beam([s*.259,1.16,c*.259],[s*.259,1.245,c*.259],.012,p.dark);
      b.beam([s*.259,1.16,c*.259],[s*.259+c*.055,1.16,c*.259-s*.055],.012,p.dark);
    }
    b.put('pyramid',p.roof,0,1.46,0,.48,.3,.48); b.spire(0,1.61,0,.035,h-1.61,p.gold);
  },
  acropolis(b) {
    const p=b.p; b.base('#c4a77d'); b.box(0,.13,0,1.28,.19,.68,p.trim);
    for(const x of [-.48,-.29,-.1,.1,.29,.48]) for(const z of [-.23,.23]) {
      b.column(x,.41,z,.038,.43,p.wall); b.box(x,.62,z,.105,.055,.11,p.trim);
    }
    b.box(0,.66,0,1.16,.075,.62,p.wall); b.put('roof',p.trim,0,.7,0,1.22,.25,.65);
    b.steps(0,.34,.68,3,.055,.055,p.wall);
  },
  christ(b) {
    const p=b.p; b.base('#638450'); b.put('rock',p.leaf,0,.2,0,.63,.2,.33);
    b.box(0,.34,0,.33,.16,.3,p.trim); b.put('flare',p.wall,0,.73,0,.27,.67,.23,[0,0,Math.PI]);
    b.box(0,1.02,0,.97,.13,.15,p.wall); b.put('rock',p.wall,0,1.19,0,.11,.145,.1);
    b.box(0,.77,.118,.035,.44,.023,p.trim); b.tree(-.56,.05,.14);
  },
  machu(b) {
    const p=b.p; b.base(); b.put('rock',p.roof,-.18,.44,-.11,.37,.48,.25);
    b.put('rock',p.leaf,.28,.32,-.11,.36,.33,.24);
    for(let i=0;i<4;i++) b.box(0,.1+i*.075,.22-i*.08,1.1-i*.12,.06,.13,i%2?p.ground:p.trim);
    for(const x of [-.43,-.12,.2,.44]) { b.box(x,.3,.13,.15,.18,.13,p.wall); b.box(x,.4,.13,.17,.035,.15,p.trim); }
  },
  taj(b) {
    const p=b.p; b.base(); b.box(0,.11,-.05,1.22,.13,.62,p.wall);
    b.box(0,.4,-.06,.58,.49,.38,p.wall); b.arch(0,.19,.142,.28,.34,.04,p.trim);
    b.put('onion',p.wall,0,.65,-.06,.25,.28,.25); b.spire(0,1.04,-.06,.025,.08,p.gold);
    for(const x of [-.53,.53]) for(const z of [-.25,.25]) {
      b.column(x,.41,z,.047,.62,p.wall); b.column(x,.65,z,.071,.045,p.trim); b.dome(x,.73,z,.07,.09); b.spire(x,.82,z,.016,.06,p.gold);
    }
    b.box(0,.081,.29,.19,.012,.18,p.water,'glass');
  },
  angkor(b) {
    const p=b.p; b.base(p.water); b.box(0,.09,0,1.32,.1,.63,p.ground);
    for(let i=0;i<3;i++) b.box(0,.18+i*.095,0,1.19-i*.23,.11,.54-i*.08,p.wall);
    [[0,0,1],[-.42,.15,.66],[.42,.15,.66],[-.28,-.18,.8],[.28,-.18,.8]].forEach(([x,z,h])=>{
      for(let i=0;i<4;i++) { const r=.105-i*.017; b.column(x,.38+i*h*.13,z,r,h*.14,p.trim); }
      b.spire(x,.39+h*.51,z,.06,.14,p.roof);
    }); b.arch(0,.13,.3,.18,.25,.04,p.dark);
  },
  opera(b) {
    const p=b.p; b.base(p.water); b.box(0,.12,0,1.3,.14,.65,p.trim);
    for(const z of [-.18,.18]) for(let i=0;i<3;i++) {
      const x=-.39+i*.34,h=.6-i*.1;
      b.box(x,.24,z,.32,.15,.24,p.dark,'glass');
      b.put('sail',p.wall,x,.23,z,.42,h,.35,[0,i===2?Math.PI:0,0]);
    }
  },
  bridge(b) {
    const p=b.p; b.base(); b.box(0,.32,0,1.5,.07,.24,p.roof);
    for(const x of [-.43,.43]) {
      for(const z of [-.135,.135]) b.box(x,.55,z,.07,.96,.06,p.wall,'metal');
      for(const y of [.52,.77,.98]) b.box(x,y,0,.085,.055,.33,p.wall,'metal');
    }
    for(const z of [-.135,.135]) {
      for(let i=0;i<12;i++) {
        const x=-.43+i*.86/12,n=x+.86/12, y=.49+.49*(x/.43)**2,ny=.49+.49*(n/.43)**2;
        b.beam([x,y,z],[n,ny,z],.018,p.wall); if(i%2===0)b.beam([x,.36,z],[x,y,z],.01,p.trim);
      }
      b.beam([-.73,.35,z],[-.43,.98,z],.018,p.wall); b.beam([.43,.98,z],[.73,.35,z],.018,p.wall);
    }
  },
  liberty(b) {
    const p=b.p; b.base(p.water); b.box(0,.1,0,.7,.13,.56,'#638450');
    b.box(0,.27,0,.4,.28,.33,'#c4a77d'); b.box(0,.43,0,.48,.075,.39,p.trim);
    b.put('flare',p.wall,0,.73,0,.29,.56,.23,[0,0,Math.PI]); b.put('rock',p.wall,0,1.09,0,.105,.14,.095);
    b.beam([-.08,.94,0],[-.26,1.33,0],.042,p.wall); b.column(-.26,1.38,0,.065,.065,p.trim);
    b.put('onion',p.gold,-.26,1.4,0,.05,.09,.05);
    b.box(.18,.86,.07,.14,.27,.065,p.trim); b.beam([.08,.98,0],[.2,.83,.07],.04,p.wall);
    for(let i=0;i<7;i++) {const a=(i/6)*Math.PI; b.beam([Math.cos(a)*.08,1.15,0],[Math.cos(a)*.2,1.15+Math.sin(a)*.17,0],.013,p.wall);}
  },
  moai(b) {
    const p=b.p; b.base();
    [-.43,0,.43].forEach((x,i)=>{
      const h=i===1?.74:.59;
      b.box(x,.2,0,.25,.3,.21,p.roof); b.box(x,h-.22,.025,.24,.4,.23,p.wall);
      b.box(x,h-.18,.158,.24,.055,.08,p.roof); b.box(x,h-.29,.176,.07,.18,.12,p.trim);
      b.box(x,h-.41,.158,.18,.055,.06,p.roof); if(i===1)b.column(x,h+.01,0,.14,.13,'#b56c50');
    });
  },
  chichen(b) {
    const p=b.p; b.base('#638450');
    for(let i=0;i<9;i++) b.box(0,.1+i*.067,0,1.12-i*.095,.07,.66-i*.052,i%2?p.wall:p.trim);
    b.box(0,.77,0,.32,.2,.22,p.wall); b.box(0,.88,0,.39,.045,.28,p.trim); b.box(0,.77,.117,.12,.15,.015,p.dark);
    b.steps(0,.36,.18,9,.075,.032,p.wall);
  },
  giza(b) {
    const p=b.p; b.base();
    [[-.35,-.07,.76,.78],[.34,.05,.57,.55],[.6,-.2,.29,.27]].forEach(([x,z,w,h])=>{
      b.put('pyramid',p.wall,x,.07+h/2,z,w,h,w*.65); b.put('pyramid',p.trim,x,.07+h*.9,z,w*.2,h*.2,w*.13);
    });
    b.box(-.46,.12,.28,.26,.11,.11,'#b78d60'); b.put('rock',p.trim,-.57,.2,.28,.06,.08,.055);
  },
  castle(b) {
    const p=b.p; b.base('#638450'); b.box(-.1,.54,-.04,.78,.79,.37,p.wall);
    b.put('roof',p.roof,-.1,.94,-.04,.85,.36,.43); b.windows(-.1,.33,.153,4,3,.05,.08,.16);
    [[-.55,0,1.17],[.31,-.15,1.23],[.49,.14,.88]].forEach(([x,z,h])=>{
      b.column(x,h/2,z,.1,h,p.wall); b.column(x,h-.03,z,.13,.08,p.trim); b.spire(x,h,z,.16,.24,p.roof);
    }); b.box(.13,.26,.23,.39,.39,.23,'#c27d61'); b.arch(.13,.07,.36,.2,.29,.04,p.trim);
    b.tree(-.66,-.18,.12);
  },
  fuji(b) {
    const p=b.p; b.base(); b.put('cone',p.wall,0,.47,-.04,.63,.8,.31);
    b.put('cone',p.trim,0,.77,-.04,.21,.27,.104); b.put('column',p.water,.36,.075,.21,.25,.015,.12,[0,0,0],'glass');
    b.tree(-.54,.22,.12,'#d8a0ad'); b.tree(.56,-.21,.12);
  },
  wall(b) {
    const p=b.p; b.base();
    const points=[[-.65,.12],[-.31,-.09],[.1,.07],[.58,-.13]];
    points.forEach(([x,z],i)=>{ b.put('rock',p.leaf,x,.22,z,.26,.24,.22); if(i%2===0||i===3){b.box(x,.41,z,.24,.31,.24,p.wall);b.box(x,.58,z,.29,.045,.29,p.trim); b.windows(x,.41,z+.127,1,1,.065,.085);}});
    for(let i=0;i<points.length-1;i++) {
      const a=points[i],c=points[i+1],dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx);
      b.put('softBox',p.wall,(a[0]+c[0])/2,.28,(a[1]+c[1])/2,len,.24,.15,[0,angle,0]);
      for(let j=0;j<4;j++) {const t=(j+.5)/4; b.box(a[0]+dx*t,.43,a[1]+dz*t,.07,.075,.18,p.trim);}
    }
  },
  hagia(b) {
    const p=b.p; b.base(); b.box(0,.35,0,.83,.5,.47,p.wall);
    b.dome(0,.72,0,.32,.31,p.roof); b.column(0,.69,0,.33,.13,p.trim);
    for(const x of [-.36,.36]) b.dome(x,.51,0,.21,.19,p.roof);
    for(const x of [-.62,.62]) for(const z of [-.24,.24]) { b.column(x,.49,z,.033,.88,p.trim); b.column(x,.75,z,.05,.045,p.wall); b.spire(x,.93,z,.05,.19,p.roof); }
    b.windows(0,.33,.244,5,1,.055,.12,.13); b.arch(0,.11,.26,.19,.22,.04,p.trim);
  },
  canyon(b) {
    const p=b.p; b.base();
    for(const side of [-1,1]) for(let i=0;i<4;i++) {
      const x=side*(.39+i*.025),w=.48-i*.075,y=.13+i*.105;
      b.put('mesa',[p.wall,'#b56c50',p.trim,'#995c45'][i],x,y,-.02+side*i*.015,w*.57,.13,(.6-i*.065)*.5,[0,side*.18,0]);
    }
    for(let i=0;i<5;i++) b.box(Math.sin(i*1.4)*.065,.074,-.29+i*.145,.1,.014,.17,p.water,'glass');
    b.put('rock',p.trim,.52,.54,-.07,.15,.12,.16);
  }
};
