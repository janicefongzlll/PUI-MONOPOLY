// Presentation and existing-action wiring checks. No network or account writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8').replace(/\ninit\(\);\s*$/, '\n');
const elements = new Map();
function node(id) {
  if (!elements.has(id)) elements.set(id, { innerHTML: '', textContent: '', handlers: {}, open: false,
    addEventListener(type, handler) { this.handlers[type] = handler; },
    showModal() { this.open = true; } });
  return elements.get(id);
}
const context = vm.createContext({ console, AbortController, setTimeout, clearTimeout,
  document: { getElementById: node }, window: {}, navigator: { onLine: true } });
const run = code => vm.runInContext(code, context);
run(source);
run(`
  state = {players: playerAnimals.map((animal,id)=>({id,name:animalTeamNames[animal.art],animal,color:playerColors[id],cash:1000,position:0,jailPasses:id===0?1:0})),currentPlayer:1,phase:'choose'};
  openStepChooser = () => { window.chooserOpened = true; };
`);
const before = run('JSON.stringify(state)');
run('renderTurn(); renderPlayers();');
assert.equal(node('turn-prompt').innerHTML.replace(/<[^>]*>/g, ''), 'Monkey');
assert.ok(node('turn-prompt').innerHTML.includes('avatar-monkey'));
assert.ok(!node('turn-prompt').innerHTML.includes('choose your move'));
assert.ok(node('turn-actions').innerHTML.includes('Choose 1–6 steps'));
node('choose-steps-button').handlers.click();
assert.equal(run('window.chooserOpened'), true);
assert.equal(run('JSON.stringify(state)'), before);
for (const name of ['Froggy', 'Monkey', 'Wolfy', 'Horsey']) assert.ok(node('player-list').innerHTML.includes(name));
assert.ok(node('player-list').innerHTML.includes('1 pass'));
console.log('PASS minimal animal/name movement card; chooser, ledger and state remain intact');

run(`player().position=1; propertyAt[1].owner=player().id; developProperty=prop=>{window.upgradePosition=prop.position;}; renderTurn();`);
assert.ok(node('turn-actions').innerHTML.includes('develop-button'));
node('develop-button').handlers.click();
assert.equal(run('window.upgradePosition'), 1);
console.log('PASS eligible upgrade control stays available');

run(`state.phase='decision'; renderTurn();`);
node('decision-reminder').handlers.click();
assert.equal(node('decision-dialog').open, true);
console.log('PASS unresolved decisions can still be reopened');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
assert.ok(html.includes('game-sidebar.css?v=1'));
assert.ok(html.includes('id="turn-badge" hidden'));
assert.ok(!html.includes('Next stop / your move'));
console.log('PASS decorative phase header is removed without removing the status element');
