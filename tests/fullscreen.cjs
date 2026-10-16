// Full-screen UI checks only: no account, game saves or network access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8').replace(/\ninit\(\);\s*$/, '\n');

function fixture(kind = 'standard') {
  const nodes = new Map(), events = new Map(), classes = new Set();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { value: '', dataset: {}, handlers: {}, attributes: {}, classList: { add() {}, remove() {}, toggle() {} },
      addEventListener(name, handler) { this.handlers[name] = handler; },
      setAttribute(name, value) { this.attributes[name] = value; }, querySelectorAll() { return []; } });
    return nodes.get(id);
  };
  const document = { documentElement: {}, fullscreenElement: null, webkitFullscreenElement: null,
    body: { classList: { toggle(name, active) { if (active) classes.add(name); else classes.delete(name); } } },
    getElementById: node, querySelectorAll: () => [], addEventListener: (name, handler) => events.set(name, handler) };
  const calls = [], messages = [];
  if (kind === 'standard') {
    document.documentElement.requestFullscreen = async options => { calls.push(['enter', options]); document.fullscreenElement = document.documentElement; events.get('fullscreenchange')?.(); };
    document.exitFullscreen = async () => { calls.push(['exit']); document.fullscreenElement = null; events.get('fullscreenchange')?.(); };
  } else if (kind === 'webkit') {
    document.documentElement.webkitRequestFullscreen = () => { calls.push(['enter']); document.webkitFullscreenElement = document.documentElement; events.get('webkitfullscreenchange')?.(); };
    document.webkitExitFullscreen = () => { calls.push(['exit']); document.webkitFullscreenElement = null; events.get('webkitfullscreenchange')?.(); };
  }
  const context = vm.createContext({ document, window: { addEventListener() {} }, navigator: { onLine: true }, console,
    setTimeout, clearTimeout, AbortController, messages });
  vm.runInContext(source, context);
  vm.runInContext('renderNameFields=initSpaceTips=configureSupabase=()=>{};toast=message=>messages.push(message);init();', context);
  return { document, calls, messages, classes, button: node('fullscreen-button'), label: node('fullscreen-label'), icon: node('fullscreen-icon'),
    click: () => node('fullscreen-button').handlers.click(), fire: name => events.get(name)?.(), run: code => vm.runInContext(code, context) };
}

(async () => {
  const f = fixture();
  assert.equal(f.label.textContent, 'Enter full screen');
  await f.click();
  assert.equal(f.document.fullscreenElement, f.document.documentElement);
  assert.equal(f.button.attributes['aria-pressed'], 'true');
  assert.equal(f.label.textContent, 'Exit full screen');
  assert.equal(f.icon.attributes.href, '#i-fullscreen-exit');
  assert.ok(f.classes.has('is-fullscreen'));
  await f.click();
  assert.equal(f.document.fullscreenElement, null);
  assert.equal(f.label.textContent, 'Enter full screen');
  assert.equal(f.button.disabled, false);
  console.log('PASS button enters and exits full screen with matching label, icon and layout');

  await f.click(); f.document.fullscreenElement = null; f.fire('fullscreenchange');
  assert.equal(f.label.textContent, 'Enter full screen');
  assert.equal(f.button.attributes['aria-pressed'], 'false');
  assert.ok(!f.classes.has('is-fullscreen'));
  console.log('PASS Escape/native exit updates the button without another click');

  const safari = fixture('webkit'); await safari.click(); await safari.click();
  assert.deepEqual(safari.calls, [['enter'], ['exit']]);
  assert.equal(safari.label.textContent, 'Enter full screen');
  console.log('PASS prefixed Safari full-screen APIs are supported');

  const unsupported = fixture('none');
  assert.equal(unsupported.button.disabled, true);
  assert.ok(unsupported.button.title.includes('not supported'));
  const denied = fixture(); denied.document.documentElement.requestFullscreen = async () => { throw new Error('Denied'); };
  await denied.click();
  assert.equal(denied.button.disabled, false);
  assert.equal(denied.label.textContent, 'Enter full screen');
  assert.ok(denied.messages[0].includes('Couldn’t enter'));
  console.log('PASS unsupported and denied full screen fail safely without a stuck button');

  const busy = fixture(); let release;
  busy.document.documentElement.requestFullscreen = () => new Promise(resolve => { release = resolve; });
  const first = busy.click(); const second = busy.click();
  assert.equal(busy.button.disabled, true);
  await second; release(); await first;
  assert.equal(busy.button.disabled, false);
  console.log('PASS repeated clicks are locked while a full-screen request is pending');
})().catch(error => { console.error(error); process.exitCode = 1; });
