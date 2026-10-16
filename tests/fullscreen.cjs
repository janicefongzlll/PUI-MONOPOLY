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
    click: () => node('fullscreen-button').handlers.click(), fire: name => events.get(name)?.(), run: code => vm.runInContext(code, context), node };
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

  const persistent = fixture();
  persistent.run('cancelBoardAnimation=()=>{}; window.scrollTo=()=>{}; renderGameLibrary=async()=>{};');
  await persistent.click();
  for (const action of ['showSetup()', 'resetGame()', 'prepareNewGame()']) {
    await persistent.run(action);
    assert.equal(persistent.document.fullscreenElement, persistent.document.documentElement, `${action} preserves full screen`);
    assert.equal(persistent.label.textContent, 'Exit full screen');
  }
  persistent.run('supabaseClient={}; authUser={email:"test@example.com"};');
  await persistent.run('returnToLobby()');
  assert.equal(persistent.document.fullscreenElement, persistent.document.documentElement);
  assert.equal(persistent.node('account-email').textContent, 'test@example.com');
  assert.deepEqual(persistent.calls.map(call => call[0]), ['enter']);
  await persistent.click();
  assert.equal(persistent.document.fullscreenElement, null);
  assert.deepEqual(persistent.calls.map(call => call[0]), ['enter', 'exit']);
  console.log('PASS full screen persists across setup, reset, new game and lobby until explicitly exited');

  const preservedSafari = fixture('webkit');
  preservedSafari.run('cancelBoardAnimation=()=>{}; window.scrollTo=()=>{};');
  await preservedSafari.click(); preservedSafari.run('showSetup(); resetGame();');
  assert.equal(preservedSafari.document.webkitFullscreenElement, preservedSafari.document.documentElement);
  assert.deepEqual(preservedSafari.calls, [['enter']]);
  console.log('PASS Safari full screen also survives screen transitions');

  // A background retry would fight intentional Escape/native exits and can be
  // blocked by the browser's user-gesture policy. Never force re-entry.
  const escaped = fixture(); await escaped.click();
  escaped.document.fullscreenElement = null; escaped.fire('fullscreenchange');
  await Promise.resolve();
  assert.deepEqual(escaped.calls.map(call => call[0]), ['enter']);
  assert.equal(escaped.label.textContent, 'Enter full screen');
  console.log('PASS native exits remain respected without trapping or automatic re-entry');

  assert.equal((source.match(/await exitGameFullscreen\(true\)/g) || []).length, 1);
  assert.ok(!/\n\s*exitGameFullscreen\(\);/.test(source));
  console.log('PASS only the explicit toggle can request a programmatic full-screen exit');
})().catch(error => { console.error(error); process.exitCode = 1; });
