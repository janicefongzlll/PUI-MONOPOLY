// Run with Node: node tests/game-regression.cjs. No network or account writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8').replace(/\ninit\(\);\s*$/, '\n');
const cases = [];
const test = (name, run) => cases.push({ name, run });

function engine() {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { id, value: '', dataset: {}, style: {}, open: false, hidden: false, innerHTML: '', textContent: '',
      classList: { add() {}, remove() {}, toggle() {} }, querySelectorAll: () => [], querySelector: () => null,
      showModal() { this.open = true; }, close() { this.open = false; }, addEventListener() {} });
    return elements.get(id);
  };
  const context = vm.createContext({ console, AbortController, setTimeout: () => 1, clearTimeout() {}, navigator: { onLine: true },
    document: { getElementById: element, querySelectorAll: () => [], documentElement: {} }, window: {},
    structuredClone, assert, ui: null, visited: [], observed: [], afterStep: null });
  vm.runInContext(source, context);
  vm.runInContext(`
    renderBoard = renderPlayers = renderTurn = renderToolbar = renderActivity = renderAll = () => {};
    toast = closeDecision = () => {};
    showDecision = decision => { ui = decision; };
    state = { players: playerAnimals.map((animal, id) => ({id, name:'Group '+(id+1), animal, color:playerColors[id], cash:1000, position:0, jailed:false, jailPasses:0, turns:0})), currentPlayer:0, round:1, phase:'choose', activity:[], pending:null, finishAfterRound:false };
    ensureBoard3D = async () => ({ sync() {}, async animateMovement(p, pending, onStep, signal) {
      for (let i = pending.nextStep; i < pending.route.length; i++) {
        if (signal.aborted) return false;
        observed.push({before:p.position, next:pending.route[i], phase:state.phase});
        await Promise.resolve();
        if (signal.aborted) return false;
        onStep(pending.route[i], i); visited.push(p.position);
        if (afterStep) afterStep(pending, i);
      }
      return !signal.aborted;
    }});
  `, context);
  return { context, run: code => vm.runInContext(code, context), element, plain: code => JSON.parse(JSON.stringify(vm.runInContext(code, context))) };
}

test('exact original 36-space order, price, rent, corners and stations', () => {
  const e = engine();
  assert.deepEqual(e.plain('cornerAt'), [0,12,18,30]);
  assert.deepEqual(e.plain('stationPositions'), [6,16]);
  assert.equal(e.run('spaces.length'), 36); assert.equal(e.run('properties.length'), 24);
  assert.deepEqual(e.plain('spaces.map(s=>s.name)'), ['Start','Taipei 101','Chance','Petronas Twin Towers','Income Tax','Marina Bay Sands','Transit Station','Burj Khalifa','Chance','Eiffel Tower','Sagrada Família','Colosseum','Jail','City Maintenance','Chance','Big Ben','Transit Station','Acropolis','Free Parking','Christ the Redeemer','Chance','Machu Picchu','Taj Mahal','Angkor Wat','Sydney Opera House','Golden Gate Bridge','Statue of Liberty','Moai of Rapa Nui','Chichén Itzá','Pyramids of Giza','Go to Jail','Neuschwanstein Castle','Mount Fuji','Great Wall of China','Hagia Sophia','Grand Canyon']);
  assert.deepEqual(e.plain('properties.map(p=>[p.price,p.rent])'), [[80,10],[100,12],[120,14],[140,16],[160,18],[180,20],[200,22],[220,24],[240,26],[260,28],[280,30],[300,32],[320,34],[340,36],[360,38],[380,40],[400,42],[420,44],[440,46],[460,48],[480,50],[500,52],[520,54],[560,58]]);
});
test('1–6 movement visits each intermediate tile; only final tile resolves', async () => {
  for (let count=1; count<=6; count++) {
    const e=engine(); e.run('resolveSpace = p => { state.phase="decision"; state.resolved=p.position; };');
    const task=e.run(`chooseSteps(${count})`);
    assert.equal(e.run('player().position'),0); assert.equal(e.run('state.phase'),'moving');
    await task;
    assert.deepEqual(e.plain('visited'),Array.from({length:count},(_,i)=>i+1));
    assert.equal(e.run('state.resolved'),count); assert.equal(e.run('player().cash'),1000);
  }
});
test('duplicate/invalid choices cannot issue a second move', async () => {
  const e=engine(); e.run('resolveSpace=()=>{};');
  const task=e.run('chooseSteps(3)'); e.run('chooseSteps(6); chooseSteps(0); chooseSteps(7);'); await task;
  assert.deepEqual(e.plain('visited'),[1,2,3]);
});
test('Start crossing and landing pay once; reverse movement pays nothing', async () => {
  for (const [start, steps, reward, destination] of [[35,3,200,2],[35,1,200,0],[1,-3,0,34]]) {
    const e=engine(); e.run(`player().position=${start}; resolveSpace=()=>{};`);
    await e.run(`movePlayer(player(),${steps},{collectStart:true})`);
    assert.equal(e.run('player().cash'),1000+reward); assert.equal(e.run('player().position'),destination);
  }
});
test('mid-route save after Start resumes without duplicate reward or skipped tile', async () => {
  const e=engine(); e.run(`player().position=35; resolveSpace=p=>{state.resolved=p.position;}; afterStep=(pending,i)=>{if(i===0){ saved=snapshotGame(); cancelBoardAnimation(); }};`);
  await e.run('chooseSteps(3)');
  assert.equal(e.run('saved.state.players[0].cash'),1200);
  assert.equal(e.run('saved.state.pending.nextStep'),1);
  e.run('state=saved.state; afterStep=null;'); await e.run('resumeMovement()');
  assert.deepEqual(e.plain('visited'),[0,1,2]); assert.equal(e.run('player().cash'),1200); assert.equal(e.run('state.resolved'),2);
});
test('snapshot is detached from later player changes',()=>{
  const e=engine(); e.run('saved=snapshotGame(); player().cash=15; player().position=20;');
  assert.equal(e.run('saved.state.players[0].cash'),1000); assert.equal(e.run('saved.state.players[0].position'),0);
});
test('purchase/pass, own landmark and both taxes keep existing rules',()=>{
  const e=engine(); e.run('player().position=1; resolveSpace(player());');
  assert.equal(e.run('state.pending.kind'),'purchase'); e.run('ui.actions[0].action()');
  assert.equal(e.run('player().cash'),920); assert.equal(e.run('propertyAt[1].owner'),0);
  assert.equal(e.run('player().turns'),1);
  for (const [pos,cost] of [[4,100],[13,50],[18,0],[12,0]]) {
    const t=engine(); t.run(`player().position=${pos};resolveSpace(player());`);
    assert.equal(t.run('player().cash'),1000-cost); assert.equal(t.run('player().turns'),1);
  }
  const pass=engine(); pass.run('showPurchaseDecision(player(),properties[0]);ui.actions[1].action();');
  assert.equal(pass.run('properties[0].owner'),null);
});
test('rent and challenge transfer correct amounts including upgraded rent',()=>{
  for(const [upgraded,multiplier,amount] of [[false,1,10],[false,2,20],[true,1,20],[true,2,40]]) {
    const e=engine(); e.run(`properties[0].owner=1;properties[0].building=${upgraded};payRent(player(),properties[0],${multiplier},${multiplier===2});`);
    assert.equal(e.run('state.players[0].cash'),1000-amount); assert.equal(e.run('state.players[1].cash'),1000+amount);
  }
  const win=engine(); win.run('properties[0].owner=1;winChallenge(player(),properties[0]);');
  assert.equal(win.run('player().cash'),1000);
});
test('all Chance effects preserve original rewards and resolution behavior',async()=>{
  for (let i=0;i<10;i++) {
    const e=engine(); e.run('player().position=34; resolveSpace=p=>{state.resolved=p.position;};');
    await e.run(`applyChance(player(),chanceCards[${i}])`);
    const expectedCash=[1120,925,1160,950,1200,1000,1000,1000,1000,1000][i];
    assert.equal(e.run('player().cash'),expectedCash,`Chance ${i} cash`);
    if(i===4) assert.equal(e.run('player().position'),0);
    if(i===5) assert.equal(e.run('state.resolved'),31);
    if(i===6) {assert.equal(e.run('player().position'),6);assert.equal(e.run('player().turns'),1);}
    if(i===7) assert.equal(e.run('player().jailPasses'),1);
    if(i===8) {assert.equal(e.run('player().position'),12);assert.equal(e.run('player().jailed'),true);}
    if(i===9) assert.equal(e.run('state.resolved'),22);
  }
});
test('Transit costs $40 once, arrives directly and ends without station re-resolution',async()=>{
  const e=engine();e.run('player().position=16;showStationDecision(player(),6);'); await e.run('ui.actions[1].action()');
  assert.equal(e.run('player().cash'),960);assert.equal(e.run('player().position'),6);assert.equal(e.run('state.pending.kind'),'turn-end');
});
test('Jail exit by fee, pass or missing turn',()=>{
  for(const mode of ['fee','pass','miss']) {
    const e=engine();e.run('player().jailed=true;player().jailPasses=1;showJailDecision();');
    e.run(`ui.actions[${mode==='miss'?0:mode==='pass'?1:2}].action();`);
    assert.equal(e.run('player().jailed'),false);
    assert.equal(e.run('player().cash'),mode==='fee'?950:1000);
    assert.equal(e.run('player().jailPasses'),mode==='pass'?0:1);
    assert.equal(e.run('state.phase'),mode==='miss'?'moving':'choose');
  }
});
test('upgrade value/rent and negative balances remain valid',()=>{
  const e=engine();e.run('properties[0].owner=0;developProperty(properties[0]);developProperty(properties[0]);');
  assert.equal(e.run('player().cash'),960);assert.equal(e.run('rentOf(properties[0])'),20);assert.equal(e.run('totalWealth(player())'),1080);
  e.run('adjustCash(player(),-1500);');assert.equal(e.run('totalWealth(player())'),-420);
});
test('trading retains captured offering group across turn change and conserves cash',()=>{
  const e=engine();e.run('properties[0].owner=0;properties[0].building=true;properties[1].owner=1;openTrade();');
  e.element('trade-partner').value='1'; e.element('trade-from-property').value='1';e.element('trade-to-property').value='3';e.element('trade-from-cash').value='100';e.element('trade-to-cash').value='40';
  e.run('state.currentPlayer=2;submitTrade({preventDefault(){}});');
  assert.equal(e.run('properties[0].owner'),1); assert.equal(e.run('properties[1].owner'),0); assert.equal(e.run('properties[0].building'),true);
  assert.deepEqual(e.plain('state.players.map(p=>p.cash)'),[940,1060,1000,1000]);
});
test('Call Time completes round once, persisted handoff resumes and scores stay correct',()=>{
  const e=engine();e.run('callTime();');
  for(let i=0;i<4;i++){e.run('endTurn();endTurn();saved=snapshotGame();state=saved.state;completeTurn(state);');}
  assert.deepEqual(e.plain('state.players.map(p=>p.turns)'),[1,1,1,1]); assert.equal(e.run('state.phase'),'complete');assert.equal(e.run('state.round'),1);
});
test('navigation cancels stale hops and turn callbacks',async()=>{
  const e=engine();e.run('resolveSpace=()=>{throw Error("stale resolution")};afterStep=()=>{cancelBoardAnimation();state=null;};');
  await e.run('chooseSteps(4)');assert.deepEqual(e.plain('visited'),[1]);assert.equal(e.run('state'),null);
  const t=engine();t.run('old=state;endTurn();state=null;completeTurn(old);');assert.equal(t.run('state'),null);
});
test('all six unresolved decision types serialize and restore',()=>{
  const starts=['showPurchaseDecision(player(),properties[0])','properties[0].owner=1;showRentDecision(player(),properties[0])','properties[0].owner=1;showChallengeDecision(player(),properties[0])','showChanceCard(player(),0)','showStationDecision(player(),6)','showJailDecision()'];
  starts.forEach(start=>{const e=engine();e.run(`${start};saved=snapshotGame();state=saved.state;resumePending();`);assert.equal(e.run('state.phase'),'decision');assert.ok(e.run('ui.actions.length')>0);});
});
test('existing cloud save/load endpoints round-trip pending decisions and movement',async()=>{
  const e=engine();
  e.run(`
    authUser={id:'test-user'}; state.gameId='test-game'; state.gameName='Regression city';
    supabaseClient={from(table){assert.equal(table,'monopoly_games');return {
      update(payload){return {async eq(field,id){assert.equal(field,'id');assert.equal(id,'test-game');cloud=JSON.parse(JSON.stringify(payload));return {error:null};}};},
      select(){return {eq(){return {async single(){return {data:{id:'test-game',name:'Regression city',game_state:cloud.game_state},error:null};}};}};}
    };}};
    showPurchaseDecision(player(),properties[0]);
  `);
  await e.run('saveGame(false)');e.run('state=null;');await e.run('loadCloudGame("test-game")');
  assert.equal(e.run('state.pending.kind'),'purchase');assert.equal(e.run('ui.title'),'Taipei 101 is available');
  e.run('state.pending=null;state.phase="choose";player().position=35;afterStep=(pending,i)=>{if(i===0)cancelBoardAnimation();};');
  await e.run('chooseSteps(3)');await e.run('saveGame(false)');e.run('state=null;afterStep=null;');await e.run('loadCloudGame("test-game")');
  await e.run('movementPromise');
  assert.equal(e.run('player().cash'),1200);assert.equal(e.run('player().position'),2);assert.equal(e.run('state.pending.kind'),'chance');
});

(async()=>{
  let failed=0;
  for(const item of cases){try{await item.run();console.log('PASS',item.name);}catch(error){failed++;console.error('FAIL',item.name,error);}}
  console.log(`${cases.length-failed}/${cases.length} regression checks passed`);
  process.exitCode=failed?1:0;
})();
