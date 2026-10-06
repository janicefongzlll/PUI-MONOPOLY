const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const elements=[];
const document={body:{appendChild(e){elements.push(e);}},createElement(tag){return {
  tag, dataset:{}, currentTime:0, paused:true, plays:0, listeners:{},
  addEventListener(event,fn){this.listeners[event]=fn;},
  pause(){this.paused=true;}, play(){this.paused=false;this.plays++;return Promise.resolve();}
};}};
const window={addEventListener(){}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../opening-bgm.js'),'utf8'),{document,window});
const api=window.PUIOpeningBgm, audio=elements[0];
api.start(); assert.equal(audio.src,'assets/audio/opening-loop.m4a');assert.equal(audio.loop,true);
api.startGameplay();audio.currentTime=12;
api.transition();assert.equal(audio.paused,true,'BGM must be silent throughout narration');
for(const animal of ['Frog','Wolf','Horse','Monkey']){
 api.startChallenge(animal);assert.equal(audio.src,`assets/audio/${animal.toLowerCase()}.mp3`);
 const plays=audio.plays;api.startChallenge(animal);assert.equal(audio.plays,plays,'duplicate challenge display must not restart music');
}
api.stopChallenge();assert.equal(audio.src,'assets/audio/gameplay-loop.m4a');
assert.equal(audio.currentTime,12,'gameplay resumes at the paused point');
const plays=audio.plays;api.startGameplay();assert.equal(audio.plays,plays,'later turns do not restart gameplay');
api.transition();api.stop();api.stopChallenge();assert.equal(audio.paused,true,'cancelled game must not resume music');
api.start();assert.equal(audio.currentTime,0,'new opening starts at trimmed-file beginning');
assert.equal(elements.filter(e=>e.tag==='audio').length,1,'only one BGM element is used');
console.log('PASS local music: opening, gameplay, silent transition, all owner tracks, resume and cancellation');
