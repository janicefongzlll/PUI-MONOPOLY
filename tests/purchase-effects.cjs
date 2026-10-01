// Presentation-only tests: no browser account, game state or network access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
function fixture(reduced = false) {
  let now = 0, next = 0; const tasks = new Map(), nodes = new Map();
  const schedule = (fn, delay = 0) => { tasks.set(++next, {fn, time: now + delay}); return next; };
  const element = id => {
    if (!nodes.has(id)) {
      const classes = new Set(), listeners = new Map();
      nodes.set(id, { open: false, textContent: '', style: { setProperty() {} }, setAttribute() {},
        classList: {add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c)},
        addEventListener: (type, fn) => listeners.set(type, fn), fire: type => listeners.get(type)?.({target:null, preventDefault(){}}),
        showModal() { this.open = true; }, close() { this.open = false; schedule(() => this.fire('close')); }, focus() {}
      });
    }
    return nodes.get(id);
  };
  const images = [];
  const ctx = vm.createContext({ document: {getElementById:element}, window:{matchMedia:()=>({matches:reduced})},
    Image: function() { images.push(this); }, performance:{now:()=>now},
    setTimeout:schedule, clearTimeout:id=>tasks.delete(id), cancelAnimationFrame:id=>tasks.delete(id),
    requestAnimationFrame:fn=>schedule(()=>fn(now),16)
  });
  vm.runInContext(fs.readFileSync(path.join(root,'purchase-effects.js'),'utf8'),ctx);
  const tick = ms => {
    const end = now + ms;
    while (true) {
      const item = [...tasks].sort((a,b)=>a[1].time-b[1].time)[0];
      if (!item || item[1].time > end) break;
      tasks.delete(item[0]); now=item[1].time; item[1].fn();
    }
    now=end;
  };
  return {api:ctx.window.PUILandmarkAcquisition,element,tick,images};
}
const receipt = Object.freeze({name:'Taipei 101',team:'Team <One>',price:80,balance:920,color:'#abc'});
for (const mode of ['automatic','continue','escape','navigation','reduced']) {
  const f=fixture(mode==='reduced'); let completed=0;
  f.api.show(receipt,()=>completed++);
  if(mode==='navigation') { f.api.cancel(); f.tick(4000); assert.equal(f.element('acquisition-dialog').open,false); }
  else {
    f.tick(190); assert.equal(f.element('acquisition-dialog').open,true);
    assert.equal(f.element('acquisition-team').textContent,'Team <One>');
    assert.equal(f.element('acquisition-price').textContent,'−$80');
    f.tick(1100); assert.equal(f.element('acquisition-balance').textContent,'$920');
    if(mode==='continue') { f.element('acquisition-continue').fire('click'); f.element('acquisition-continue').fire('click'); }
    if(mode==='escape') f.element('acquisition-dialog').fire('cancel');
    f.tick(4000); assert.equal(f.element('acquisition-dialog').open,false);
  }
  assert.equal(completed,1,mode); assert.equal(receipt.balance,920);
  console.log('PASS',mode,'dismissal completes once and leaves receipt untouched');
}
// The asynchronous native close event of one receipt must not close the next queued one.
{
  const f=fixture(); let finished=0;
  f.api.show(receipt,()=>f.api.show({...receipt,name:'Colosseum'},()=>finished++));
  f.tick(3500); assert.equal(f.element('acquisition-dialog').open,true);
  assert.equal(f.element('acquisition-name').textContent,'Colosseum');
  f.tick(4000); assert.equal(finished,1);
  console.log('PASS queued receipts survive native close events');
}
const f=fixture();
const map=fs.readFileSync(path.join(root,'components/board3d/BlenderLandmarks.mjs'),'utf8');
for(const [,name,slug] of map.matchAll(/  '([^']+)': '([^']+)'/g)) {
  f.api.preload(name);
  assert.equal(f.images.at(-1).src,`art/blender-landmarks/previews/${slug}.png`);
  assert.ok(fs.existsSync(path.join(root,f.images.at(-1).src)));
}
assert.equal(f.images.length,24);
f.api.show(receipt,()=>{}); f.element('acquisition-image').fire('error');
assert.equal(f.element('acquisition-dialog').classList.contains('no-art'),true);
f.api.cancel();
console.log('PASS all 24 previews map correctly, with missing-image fallback');
