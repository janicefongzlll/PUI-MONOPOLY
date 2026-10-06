const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function fixture({failure=false,reduced=false}={}) {
  let now=0, next=0; const timers=new Map(), animations=[];
  const schedule=(fn,ms=0)=>{timers.set(++next,{at:now+ms,fn});return next;};
  const element=()=>({hidden:true,inert:false,isConnected:true,focus(){},animate(frames,options){
    const animation={frames,options,currentTime:0,pause(){},cancel(){this.cancelled=true;}};
    animations.push(animation);return animation;
  }});
  const root=element(), icon=element(), title=element(), main=element(), previous=element();
  root.querySelector=selector=>selector.endsWith('icon')?icon:title;
  const listeners=new Map(); let audio;
  class Audio {
    constructor(src){audio=this;this.src=src;this.currentTime=0;this.plays=0;this.running=false;}
    addEventListener(type,fn){listeners.set(type,fn);}
    removeEventListener(type,fn){if(listeners.get(type)===fn)listeners.delete(type);}
    play(){this.plays++;this.running=!failure;return failure?Promise.reject(new Error('blocked')):Promise.resolve();}
    pause(){this.running=false;}
  }
  const context=vm.createContext({window:{matchMedia:()=>({matches:reduced})}, Audio,
    document:{getElementById:()=>root,querySelectorAll:()=>[main],activeElement:previous},
    performance:{now:()=>now},setTimeout:schedule,clearTimeout:id=>timers.delete(id),
    requestAnimationFrame:fn=>schedule(()=>fn(now),16),cancelAnimationFrame:id=>timers.delete(id)
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../minigame-transition.js'),'utf8'),context);
  const advance=(endTime,playing=true)=>{
    const move=time=>{
      if(audio.running&&playing)audio.currentTime+=(time-now)/1000;
      now=time;
      if(audio.currentTime>=1.92){audio.running=false;listeners.get('ended')?.();}
    };
    while(true){const task=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!task||task[1].at>endTime)break;
      timers.delete(task[0]);move(task[1].at);task[1].fn();}
    move(endTime);
  };
  return {api:context.window.PUIMinigameTransition,root,main,audio,animations,advance};
}
(async()=>{
  const f=fixture(); let frames=0,finished=0;
  const task=f.api.play({onFrame:()=>frames++,onFinish:()=>finished++});
  assert.equal(f.api.play(),task);assert.equal(f.audio.plays,1);assert.equal(f.main.inert,true);
  f.advance(700);assert.ok(f.animations[2].currentTime<f.animations[2].options.delay);
  f.advance(1000);assert.ok(f.animations[2].currentTime>f.animations[2].options.delay);
  const paused=f.audio.currentTime*1000;f.advance(1300,false);
  assert.equal(f.animations[2].currentTime,paused,'visual clock must freeze when audio stalls');
  f.advance(5400);assert.equal(await task,true);assert.equal(f.main.inert,false);assert.equal(f.root.hidden,true);
  assert.equal(finished,1);assert.ok(frames>0);
  console.log('PASS audio clock drives cues, repeated clicks share one sound, completion releases input');
  for(const options of [{failure:true},{reduced:true}]){
    const f=fixture(options);const task=f.api.play();await Promise.resolve();await Promise.resolve();
    f.advance(7600);assert.equal(await task,true);assert.equal(f.root.hidden,true);assert.equal(f.main.inert,false);
  }
  console.log('PASS blocked audio and reduced motion still reach the challenge');
  const c=fixture();const cancelled=c.api.play();c.advance(500);c.api.cancel();c.advance(8000);
  assert.equal(await cancelled,false);assert.equal(c.audio.running,false);assert.equal(c.main.inert,false);
  console.log('PASS navigation cancels audio, animation and continuation');
  const s=fixture();const stalled=s.api.play();s.advance(8000,false);
  assert.equal(await stalled,true);assert.equal(s.root.hidden,true);
  console.log('PASS stalled audio cannot permanently block the board');
})().catch(error=>{console.error(error);process.exitCode=1;});
