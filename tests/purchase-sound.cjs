const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const audioPath = path.join(root, 'assets/audio/cash-register-kaching.mp3');
const sample = fs.readFileSync(audioPath);
assert.equal(sample.subarray(0, 3).toString(), 'ID3');
assert.ok(sample.length > 130000, 'cashier sample should contain the supplied full-quality MP3');

let nativeAudio;
function Audio(source) {
  nativeAudio = { source, preload: '', volume: 0, muted: false, currentTime: 0, plays: 0, pauses: 0,
    play() { this.plays++; return Promise.resolve(); }, pause() { this.pauses++; } };
  return nativeAudio;
}
const context = vm.createContext({
  Audio,
  document: { addEventListener() {} },
  window: { addEventListener() {} }
});
vm.runInContext(fs.readFileSync(path.join(root, 'purchase-sound.js'), 'utf8'), context);
context.window.PUIPurchaseSound.play();
assert.equal(nativeAudio.source, 'assets/audio/cash-register-kaching.mp3');
assert.equal(nativeAudio.volume, 1);
assert.equal(nativeAudio.plays, 1);
assert.equal(nativeAudio.currentTime, 0);
console.log('PASS completed purchases play the local cashier sample once');
