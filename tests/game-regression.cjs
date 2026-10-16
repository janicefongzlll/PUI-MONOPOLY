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
    window.PUICountryQuiz = { show: quiz => quiz.onCorrect(), cancel() {} };
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
  assert.deepEqual(e.plain('cornerAt'), [0,10,18,28]);
  assert.deepEqual(e.plain('stationPositions'), [6,16]);
  assert.equal(e.run('spaces.length'), 36); assert.equal(e.run('properties.length'), 24);
  assert.deepEqual(e.plain('spaces.map(s=>s.name)'), ['Start','Taipei 101','Chance','Petronas Twin Towers','Income Tax','Marina Bay Sands','Transit Station','Burj Khalifa','Chance','Eiffel Tower','Jail','Sagrada Família','Colosseum','City Maintenance','Chance','Big Ben','Transit Station','Acropolis','Free Parking','Christ the Redeemer','Chance','Machu Picchu','Taj Mahal','Angkor Wat','Sydney Opera House','Golden Gate Bridge','Statue of Liberty','Moai of Rapa Nui','Go to Jail','Chichén Itzá','Pyramids of Giza','Neuschwanstein Castle','Mount Fuji','Great Wall of China','Hagia Sophia','Grand Canyon']);
  assert.deepEqual(e.plain('properties.map(p=>[p.price,p.rent])'), [[80,10],[100,12],[120,14],[140,16],[160,18],[180,20],[200,22],[220,24],[240,26],[260,28],[280,30],[300,32],[320,34],[340,36],[360,38],[380,40],[400,42],[420,44],[440,46],[460,48],[480,50],[500,52],[520,54],[560,58]]);
});
test('every purchasable landmark has one country and flag for the verbal quiz',()=>{
  const e=engine();
  assert.deepEqual(e.plain('properties.map(p=>Object.hasOwn(landmarkCountries,p.name))'),Array(24).fill(true));
  assert.equal(e.run('Object.keys(landmarkCountries).length'),24);
  assert.deepEqual(e.plain('Object.values(landmarkCountries).map(c=>[c.name,c.code.length,countryFlag(c.code).length])'),
    e.plain('Object.values(landmarkCountries).map(c=>[c.name,2,4])'));
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
  for (const [pos,cost] of [[4,100],[13,50],[18,0],[10,0]]) {
    const t=engine(); t.run(`player().position=${pos};resolveSpace(player());`);
    assert.equal(t.run('player().cash'),1000-cost); assert.equal(t.run('player().turns'),1);
  }
  const pass=engine(); pass.run('showPurchaseDecision(player(),properties[0]);ui.actions[1].action();');
  assert.equal(pass.run('properties[0].owner'),null);
});
test('purchase receipt uses the settled result without changing money or turns',()=>{
  const e=engine();
  e.run(`receipts=[]; window.PUIPresentation={purchase:receipt=>receipts.push(receipt)};
    showPurchaseDecision(player(), properties[0]); ui.actions[0].action();`);
  assert.deepEqual(e.plain('receipts.map(r=>[r.name,r.team,r.price,r.balance])'),[['Taipei 101','Group 1',80,920]]);
  assert.equal(e.run('player().turns'),1);
  assert.equal(e.run('properties[0].owner'),0);
  e.run('player().cash=500; player().name="Changed";');
  assert.equal(e.run('receipts[0].balance'),920);
  assert.equal(e.run('receipts[0].team'),'Group 1');
  const pass=engine();
  pass.run(`receipts=[]; window.PUIPresentation={purchase:r=>receipts.push(r)};
    showPurchaseDecision(player(), properties[0]); ui.actions[1].action();`);
  assert.equal(pass.run('receipts.length'),0);
});

test('country quiz gates purchase and wrong answers deny it without revealing the country',()=>{
  const wrong=engine();
  wrong.run(`quiz=null; receipts=[];
    window.PUICountryQuiz={show:q=>quiz=q,cancel(){}};
    window.PUIPresentation={purchase:r=>receipts.push(r)};
    showPurchaseDecision(player(),properties[1]); ui.actions[0].action();`);
  assert.equal(wrong.run('player().cash'),1000);
  assert.equal(wrong.run('properties[1].owner'),null);
  assert.deepEqual(wrong.plain('[quiz.landmark,quiz.country,quiz.flag]'),['Petronas Twin Towers','Malaysia','🇲🇾']);
  assert.equal(wrong.run('receipts.length'),0);
  wrong.run('quiz.onWrong()');
  assert.equal(wrong.run('player().cash'),1000);
  assert.equal(wrong.run('properties[1].owner'),null);
  assert.equal(wrong.run('player().turns'),1);
  wrong.run('quiz.onCorrect()');
  assert.equal(wrong.run('properties[1].owner'),null);
  assert.equal(wrong.run('receipts.length'),0);

  const correct=engine();
  correct.run(`quiz=null; receipts=[];
    window.PUICountryQuiz={show:q=>quiz=q,cancel(){}};
    window.PUIPresentation={purchase:r=>receipts.push(r)};
    showPurchaseDecision(player(),properties[1]); ui.actions[0].action(); quiz.onCorrect();`);
  assert.equal(correct.run('player().cash'),900);
  assert.equal(correct.run('properties[1].owner'),0);
  assert.equal(correct.run('player().turns'),1);
  assert.equal(correct.run('receipts.length'),1);
  correct.run('quiz.onCorrect(); quiz.onWrong();');
  assert.equal(correct.run('player().cash'),900);
  assert.equal(correct.run('receipts.length'),1);
});

test('challenge transition runs once, preserves stakes and hands off to both existing outcomes',async()=>{
  for (const win of [true,false]) {
    const e=engine();
    e.run(`properties[0].owner=1; player().position=1; transitionPlays=0; transitionFrames=[];
      window.PUIMinigameTransition={play:()=>{transitionPlays++;return new Promise(done=>{finishTransition=done;})},cancel(){}};
      showRentDecision(player(),properties[0]); task=ui.actions[1].action();`);
    assert.equal(e.run('state.pending.kind'),'challenge');
    assert.equal(e.run('player().cash'),1000);
    assert.equal(e.run('player().turns'),0);
    e.run('beginChallenge(player(),properties[0]);');
    assert.equal(e.run('transitionPlays'),1);
    assert.equal(e.run('snapshotGame().state.pending.kind'),'challenge');
    e.run('finishTransition(true)'); await e.run('task');
    assert.equal(e.run('ui.kicker'),'Mini game challenge');
    assert.equal(e.run('player().cash'),1000);
    e.run(`ui.actions[${win?1:0}].action()`);
    assert.deepEqual(e.plain('state.players.slice(0,2).map(p=>p.cash)'),win?[1000,1000]:[980,1020]);
    assert.equal(e.run('properties[0].owner'),1);
    assert.equal(e.run('player().turns'),1);
  }
});
test('cancelled challenge transitions cannot reopen a stale result screen',async()=>{
  const e=engine();
  e.run(`properties[0].owner=1; window.PUIMinigameTransition={play:()=>new Promise(done=>finishTransition=done),cancel:()=>finishTransition(false)};
    showRentDecision(player(),properties[0]); task=ui.actions[1].action(); cancelBoardAnimation();`);
  await e.run('task');
  assert.equal(e.run('ui.kicker'),'Rival landmark');
  assert.equal(e.run('player().cash'),1000);
  e.run('resumePending()');
  assert.equal(e.run('ui.kicker'),'Mini game challenge');
});

test('rent and challenge transfer correct amounts including upgraded rent',()=>{
  for(const [upgraded,multiplier,amount] of [[false,1,10],[false,2,20],[true,1,20],[true,2,40]]) {
    const e=engine(); e.run(`properties[0].owner=1;properties[0].building=${upgraded};payRent(player(),properties[0],${multiplier},${multiplier===2});`);
    assert.equal(e.run('state.players[0].cash'),1000-amount); assert.equal(e.run('state.players[1].cash'),1000+amount);
  }
  const win=engine(); win.run('properties[0].owner=1;winChallenge(player(),properties[0]);');
  assert.equal(win.run('player().cash'),1000);
});
test('Chance deck contains exactly the requested ten cards in order',()=>{
  const e=engine();
  assert.deepEqual(e.plain('chanceCards.map(card=>card.title)'),['Go Back 3 Spaces','Advance to the nearest Train Transit','Advance to a random Landmark','Go Directly to Jail','Get Out of Jail Free','Bank Bonus','Pay a Fine','Team Bonus','Pay Each Team $30','Advance to Start']);
  assert.deepEqual(e.plain('chanceCards.filter(card=>card.effect==="cash").map(card=>card.amount)'),[100,-50,150]);
});
test('first Chance draw can select every card without changing cash or movement',()=>{
  for(let index=0;index<10;index++) {
    const e=engine(); e.run(`state.lastChanceCard=null; Math.random=()=>${(index+0.5)/10}; drawChance(player());`);
    assert.equal(e.run('state.pending.card'),index);
    assert.equal(e.run('state.lastChanceCard'),index);
    assert.equal(e.run('ui.title'),'CHANCE');
    assert.equal(e.run('state.pending.revealed'),false);
    e.run('ui.actions[0].action();');
    assert.equal(e.run('ui.title'),e.run(`chanceCards[${index}].title`));
    assert.equal(e.run('player().cash'),1000);
    assert.equal(e.run('player().position'),0);
  }
});
test('Chance excludes exactly the previous global card and keeps all other cards eligible',()=>{
  for(let previous=0;previous<10;previous++) {
    const eligible=[];
    for(let sample=0;sample<9;sample++) {
      const e=engine(); e.run(`showChanceCard(player(),${previous}); state.currentPlayer=2; Math.random=()=>${(sample+0.5)/9}; drawChance(player());`);
      const selected=e.run('state.pending.card'); eligible.push(selected);
      assert.notEqual(selected,previous);
      assert.equal(e.run('state.lastChanceCard'),selected);
      assert.equal(e.run('state.pending.player'),2);
      assert.equal(e.run('chanceCards.length'),10);
    }
    assert.deepEqual(eligible,Array.from({length:10},(_,i)=>i).filter(i=>i!==previous));
  }
  const e=engine(); e.run('Math.random=()=>0; draws=[]; for(let turn=0;turn<12;turn++){state.currentPlayer=turn%4; drawChance(player()); draws.push(state.lastChanceCard);}');
  assert.deepEqual(e.plain('draws'),[0,1,0,1,0,1,0,1,0,1,0,1],'excluded cards become eligible again on the following draw');
});
test('saved Chance history survives cloud reload and pending card reopening without rerolling',async()=>{
  const e=engine();
  e.run(`
    authUser={id:'test-user'}; state.gameId='test-game'; state.gameName='Chance history';
    supabaseClient={from(){return {
      update(payload){return {async eq(){cloud=JSON.parse(JSON.stringify(payload));return {error:null};}};},
      select(){return {eq(){return {async single(){return {data:{id:'test-game',name:'Chance history',game_state:cloud.game_state},error:null};}};}};}
    };}};
    showChanceCard(player(),5); Math.random=()=>{throw new Error('Restoring a card must not reroll');};
  `);
  await e.run('saveGame(false)'); e.run('state=null;'); await e.run('loadCloudGame("test-game")');
  assert.equal(e.run('state.lastChanceCard'),5);
  assert.equal(e.run('state.pending.card'),5);
  assert.equal(e.run('ui.title'),'CHANCE');
  assert.equal(e.run('player().cash'),1000,'restoring an unresolved card does not pay it');
  e.run('ui.actions[0].action();');
  assert.equal(e.run('ui.title'),'Bank Bonus');
  e.run('ui.actions[0].action(); completeTurn(state); Math.random=()=>0.5; drawChance(player());');
  assert.equal(e.run('state.currentPlayer'),1);
  assert.notEqual(e.run('state.lastChanceCard'),5);
  assert.equal(e.run('state.players[0].cash'),1100);
});
test('older saves without Chance history remain loadable',async()=>{
  const e=engine();
  e.run(`cloud=snapshotGame(); delete cloud.state.lastChanceCard; cloud.state.phase='choose';
    supabaseClient={from(){return {select(){return {eq(){return {async single(){return {data:{id:'g',name:'Old game',game_state:cloud},error:null};}};}};}};}};`);
  await e.run('loadCloudGame("g")');
  assert.equal(e.run('state.lastChanceCard'),null);
  e.run('Math.random=()=>0; drawChance(player());');
  assert.equal(e.run('state.lastChanceCard'),0);
});
test('starting a completely new game resets Chance history',async()=>{
  const e=engine();
  e.run(`state.lastChanceCard=8; enterGameFullscreen=runBoardIntro=()=>{};
    document.querySelectorAll=selector=>selector==='.name-input'?[{value:'Team A'},{value:'Team B'}]:selector==='.avatar-picker'?[{querySelector:()=>({value:'0'})},{querySelector:()=>({value:'1'})}]:[];`);
  await e.run('startGame({preventDefault(){}})');
  assert.equal(e.run('state.lastChanceCard'),null);
  e.run('Math.random=()=>0.85; drawChance(player());');
  assert.equal(e.run('state.lastChanceCard'),8,'the previous game does not exclude any card');
});
test('new games give only Group 1 one Jail Pass, which is usable and not duplicated on reload',async()=>{
  const e=engine();
  e.run(`enterGameFullscreen=runBoardIntro=()=>{};
    document.querySelectorAll=selector=>selector==='.name-input'?[{value:'Team A'},{value:'Team B'},{value:'Team C'},{value:'Team D'}]:selector==='.avatar-picker'?Array.from({length:4},(_,id)=>({querySelector:()=>({value:String(id)})})):[];`);
  await e.run('startGame({preventDefault(){}})');
  assert.deepEqual(e.plain('state.players.map(p=>p.name)'),['Froggy','Monkey','Wolfy','Horsey']);
  assert.deepEqual(e.plain('state.players.map(p=>p.jailPasses)'),[1,0,0,0]);
  assert.deepEqual(e.plain('state.players.map(p=>p.cash)'),[1000,1000,1000,1000]);
  e.run('player().jailed=true;showJailDecision();ui.actions[1].action();');
  assert.equal(e.run('player().jailed'),false);
  assert.equal(e.run('player().jailPasses'),0);
  assert.equal(e.run('player().cash'),1000);
  e.run(`cloud=snapshotGame();supabaseClient={from(){return {select(){return {eq(){return {async single(){return {data:{id:'g',name:'Jail Pass used',game_state:cloud},error:null};}};}};}};}};`);
  await e.run('loadCloudGame("g")');
  assert.deepEqual(e.plain('state.players.map(p=>p.jailPasses)'),[0,0,0,0]);
});
test('setup has no naming inputs and animal choices stay unique with matching automatic names',async()=>{
  const e=engine(); e.run('renderNameFields(4);');
  const markup=e.element('player-name-fields').innerHTML;
  assert.ok(!markup.includes('name-input') && !markup.includes('name-field'));
  for(const name of ['Froggy','Monkey','Wolfy','Horsey']) assert.ok(markup.includes(name));
  assert.equal((markup.match(/type="radio"/g)||[]).length,16);
  e.run(`
    groups=playerAnimals.map((animal,index)=>{
      const radios=playerAnimals.map((_,id)=>({value:String(id),selected:id===index}));
      radios.forEach(radio=>Object.defineProperty(radio,'checked',{get(){return radio.selected;},set(value){if(value)radios.forEach(item=>item.selected=false);radio.selected=value;}}));
      const label={textContent:''};
      return {radios,label,addEventListener(name,handler){this.handler=handler;},
        querySelector(selector){return selector==='input:checked'?radios.find(radio=>radio.checked):radios[Number(selector.match(/value="(\\d+)"/)[1])];},
        closest(){return {querySelector:()=>label};}};
    });
    document.querySelectorAll=selector=>selector==='.avatar-picker'?groups:[];
    bindAvatarPicker();groups[0].radios[2].checked=true;groups[0].handler({target:{value:'2'}});
  `);
  assert.deepEqual(e.plain('groups.map(g=>g.label.textContent)'),['Wolfy','Monkey','Froggy','Horsey']);
  e.run('enterGameFullscreen=runBoardIntro=()=>{};');
  await e.run('startGame({preventDefault(){}})');
  assert.deepEqual(e.plain('state.players.map(p=>p.name)'),['Wolfy','Monkey','Froggy','Horsey']);
  assert.deepEqual(e.plain('state.players.map(p=>p.animal.art)'),['wolf','monkey','frog','horse']);
  assert.equal(e.run('state.gameName'),'PUI Fortune');
});
test('Chance click reveals the selected card once and only Resolve applies its effect',()=>{
  const e=engine(); e.run('Math.random=()=>0.55; drawChance(player()); reveal=ui.actions[0].action; Math.random=()=>{throw new Error("Reveal must never reroll");};');
  assert.equal(e.run('ui.title'),'CHANCE');
  assert.equal(e.run('ui.copy.includes("Collect")'),false);
  assert.equal(e.run('ui.details'),undefined);
  e.run('reveal(); reveal();');
  assert.equal(e.run('ui.title'),'Bank Bonus');
  assert.equal(e.run('state.pending.revealed'),true);
  assert.equal(e.run('player().cash'),1000);
  assert.equal(e.run('player().turns'),0);
  e.run('resolve=ui.actions[0].action; resolve(); resolve();');
  assert.equal(e.run('player().cash'),1100);
  assert.equal(e.run('player().turns'),1);
});
test('hidden and revealed Chance screens restore without rerolling or applying effects',()=>{
  for(const revealed of [false,true]) {
    const e=engine(); e.run(`showChanceCard(player(),5,${revealed}); saved=snapshotGame(); state=saved.state; Math.random=()=>{throw new Error("Restore must not reroll");}; resumePending();`);
    assert.equal(e.run('state.pending.revealed'),revealed);
    assert.equal(e.run('ui.title'),revealed?'Bank Bonus':'CHANCE');
    assert.equal(e.run('player().cash'),1000);
  }
  const legacy=engine(); legacy.run('showChanceCard(player(),5,true); delete state.pending.revealed; resumePending();');
  assert.equal(legacy.run('ui.title'),'Bank Bonus','older saves retain their already visible card');
});
test('a stale Chance reveal cannot reopen a card after changing game state',()=>{
  const e=engine(); e.run('showChanceCard(player(),5); reveal=ui.actions[0].action; state.pending={kind:"turn-end"}; reveal();');
  assert.equal(e.run('state.pending.kind'),'turn-end');
  assert.equal(e.run('player().cash'),1000);
  assert.equal(e.run('ui.title'),'CHANCE');
});
test('all updated Chance effects use existing movement, cash, Jail and turn flow',async()=>{
  for (let i=0;i<10;i++) {
    const e=engine(); e.run('Math.random=()=>0.5; player().position=34; resolveSpace=p=>{state.resolved=p.position;};');
    await e.run(`applyChance(player(),chanceCards[${i}])`);
    const expectedCash=[1000,1000,1000,1000,1000,1100,950,1150,910,1200][i];
    assert.equal(e.run('player().cash'),expectedCash,`Chance ${i} cash`);
    if(i===0) assert.equal(e.run('state.resolved'),31);
    if(i===1) {assert.equal(e.run('player().position'),6);assert.equal(e.run('player().turns'),1);}
    if(i===2) assert.equal(e.run('state.resolved'),e.run('properties[12].position'));
    if(i===3) {assert.equal(e.run('player().position'),10);assert.equal(e.run('player().jailed'),true);}
    if(i===4) assert.equal(e.run('player().jailPasses'),1);
    if(i===8) assert.deepEqual(e.plain('state.players.map(p=>p.cash)'),[910,1030,1030,1030]);
    if(i===9) {assert.equal(e.run('player().position'),0);assert.equal(e.run('player().turns'),1);}
  }
});
test('random Landmark Chance can reach all 24 landmarks and resolves only on arrival',async()=>{
  for(let index=0;index<24;index++) {
    const e=engine();
    e.run(`Math.random=()=>${(index+0.5)/24}; player().position=34; resolveSpace=p=>{state.resolved=p.position;};`);
    const task=e.run('applyChance(player(),chanceCards[2])');
    assert.equal(e.run('player().position'),34);
    assert.equal(e.run('state.resolved'),undefined);
    await task;
    assert.equal(e.run('state.resolved'),e.run(`properties[${index}].position`));
    assert.equal(e.run('player().cash'),1000,'no extra passing-Start bonus on Chance travel');
  }
});
test('random Landmark Chance resumes its saved route without selecting another destination',async()=>{
  const e=engine();
  e.run('Math.random=()=>0; player().position=34; resolveSpace=p=>{state.resolved=p.position;}; afterStep=(pending,i)=>{if(i===0){saved=snapshotGame();cancelBoardAnimation();}};');
  await e.run('applyChance(player(),chanceCards[2])');
  assert.equal(e.run('saved.state.pending.completion.kind'),'resolve');
  e.run('state=saved.state; afterStep=null; Math.random=()=>0.999;');
  await e.run('resumeMovement()');
  assert.equal(e.run('state.resolved'),1);
  assert.equal(e.run('player().cash'),1000);
});
test('Pay Each Team conserves money, excludes out teams and reports actual transfers',()=>{
  const e=engine();
  e.run('cashEffects=[]; window.PUIPresentation={cash:(amount,label,team)=>cashEffects.push({amount,team})}; state.players[2].out=true; applyChance(player(),chanceCards[8]);');
  assert.deepEqual(e.plain('state.players.map(p=>p.cash)'),[940,1030,1000,1030]);
  assert.equal(e.run('state.players.reduce((sum,p)=>sum+p.cash,0)'),4000);
  assert.deepEqual(e.plain('cashEffects'),[{amount:30,team:'Group 2'},{amount:30,team:'Group 4'},{amount:-60,team:'Group 1'}]);
  assert.equal(e.run('player().turns'),1);
  for(const balance of [0,20,30,50,60,90]) {
    const poor=engine(); poor.run(`player().cash=${balance}; applyChance(player(),chanceCards[8]);`);
    assert.equal(poor.run('state.players.reduce((sum,p)=>sum+p.cash,0)'),3000+balance);
    assert.ok(poor.plain('state.players.map(p=>p.cash)').every(cash=>cash>=0));
    assert.equal(poor.run('Boolean(player().out)'),balance<90);
    assert.equal(poor.run('player().turns'),1);
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
test('upgrade value and rent are unchanged; an upgrade beyond cash is refused',()=>{
  const e=engine();e.run('properties[0].owner=0;developProperty(properties[0]);developProperty(properties[0]);');
  assert.equal(e.run('player().cash'),960);assert.equal(e.run('rentOf(properties[0])'),20);assert.equal(e.run('totalWealth(player())'),1080);
  const poor=engine();poor.run('properties[1].owner=0;player().cash=10;developProperty(properties[1]);');
  assert.equal(poor.run('player().cash'),10);assert.equal(poor.run('properties[1].building'),false);
});
test('a forced payment beyond cash empties the payer, pays the creditor and puts them out',()=>{
  // Rent: the owner receives everything the payer had, no more.
  const e=engine();
  e.run('properties[0].owner=1;properties[0].building=true;properties[2].owner=0;properties[3].owner=0;properties[3].building=true;player().cash=8;payRent(player(),properties[0]);');
  assert.equal(e.run('state.players[0].cash'),0); assert.equal(e.run('state.players[1].cash'),1008);
  assert.equal(e.run('player().out'),true);
  assert.equal(e.run('properties[2].owner'),null); assert.equal(e.run('properties[3].owner'),null);
  assert.equal(e.run('properties[3].building'),false, 'upgrades are torn down with the owner');
  assert.equal(e.run('properties[0].owner'),1, 'the creditor keeps their own landmark');
  // Tax and a Chance penalty do the same, with no creditor to pay.
  const tax=engine(); tax.run('player().cash=20; player().position=4; resolveSpace(player());');
  assert.equal(tax.run('player().cash'),0); assert.equal(tax.run('player().out'),true);
  const card=engine(); card.run('player().cash=20; applyChance(player(),chanceCards[6]);');
  assert.equal(card.run('player().cash'),0); assert.equal(card.run('player().out'),true);
});
test('no purchase, fare or fee may take a group below zero',()=>{
  const buy=engine(); buy.run('player().cash=79; showPurchaseDecision(player(),properties[0]);');
  assert.equal(buy.run('ui.actions.length'),1,'only the pass action is offered');
  buy.run('ui.actions[0].action();');
  assert.equal(buy.run('player().cash'),79); assert.equal(buy.run('properties[0].owner'),null);
  const ride=engine(); ride.run('player().cash=39; showStationDecision(player(),6);');
  assert.equal(ride.run('ui.actions.length'),1); assert.equal(ride.run('ui.actions[0].label'),'Stay here');
  const jail=engine(); jail.run('player().cash=49; player().jailed=true; player().jailPasses=0; showJailDecision();');
  assert.deepEqual(jail.plain('ui.actions.map(a=>a.label)'),['Miss this turn']);
  const trade=engine();
  trade.run('properties[0].owner=0;openTrade();');
  trade.element('trade-partner').value='1'; trade.element('trade-from-property').value='1'; trade.element('trade-to-property').value='';
  trade.element('trade-from-cash').value='4000'; trade.element('trade-to-cash').value='0';
  trade.run('submitTrade({preventDefault(){}});');
  assert.deepEqual(trade.plain('state.players.map(p=>p.cash)'),[1000,1000,1000,1000],'an unaffordable trade is refused');
  assert.equal(trade.run('properties[0].owner'),0);
});
test('turns skip bankrupt groups and the last one standing ends the game',()=>{
  const e=engine();
  e.run('state.players[1].out=true; state.players[2].out=true; endTurn(); completeTurn(state);');
  assert.equal(e.run('state.currentPlayer'),3,'groups 1 and 2 are skipped');
  assert.equal(e.run('state.round'),1);
  e.run('endTurn(); completeTurn(state);');
  assert.equal(e.run('state.currentPlayer'),0); assert.equal(e.run('state.round'),2,'wrapping past the end still counts a round');
  const solo=engine();
  solo.run('state.players[1].out=true; state.players[2].out=true; state.players[3].out=true; endTurn(); completeTurn(state);');
  assert.equal(solo.run('state.phase'),'complete');
});
test('trading retains captured offering group across turn change and conserves cash',()=>{
  const e=engine();e.run('properties[0].owner=0;properties[0].building=true;properties[1].owner=1;openTrade();');
  e.element('trade-partner').value='1'; e.element('trade-from-property').value='1';e.element('trade-to-property').value='3';e.element('trade-from-cash').value='100';e.element('trade-to-cash').value='40';
  e.run('state.currentPlayer=2;submitTrade({preventDefault(){}});');
  assert.equal(e.run('properties[0].owner'),1); assert.equal(e.run('properties[1].owner'),0); assert.equal(e.run('properties[0].building'),true);
  assert.deepEqual(e.plain('state.players.map(p=>p.cash)'),[940,1060,1000,1000]);
});
test('quiet landings hold the active token for two seconds without extra actions or cash changes',()=>{
  for(const pos of [18,10,1]) {
    const e=engine(); e.run(`scheduled=[]; setTimeout=(fn,delay)=>{scheduled.push({fn,delay});return scheduled.length;}; player().position=${pos}; if(${pos}===1)properties[0].owner=player().id; resolveSpace(player());`);
    assert.equal(e.run('scheduled.at(-1).delay'),2000);
    assert.equal(e.run('state.currentPlayer'),0);
    assert.equal(e.run('state.phase'),'moving');
    assert.equal(e.run('player().cash'),1000);
    assert.equal(e.run('player().jailed'),false);
    assert.equal(e.run('player().turns'),1);
    assert.equal(e.run('state.pending.kind'),'turn-end');
    e.run('endTurn(); chooseSteps(6);');
    assert.equal(e.run('player().turns'),1,'pause does not allow a duplicate turn');
    assert.equal(e.run('player().position'),pos);
    e.run('scheduled.at(-1).fn();');
    assert.equal(e.run('state.currentPlayer'),1);
    assert.equal(e.run('state.phase'),'choose');
  }
  const normal=engine(); normal.run('scheduled=[];setTimeout=(fn,delay)=>{scheduled.push({fn,delay});return 1;};endTurn();');
  assert.equal(normal.run('scheduled.at(-1).delay'),2000,'every turn uses the same landing pause');
});
test('every final landing keeps the current team until its two-second handoff',async()=>{
  const cases=[
    'player().position=0;resolveSpace(player());',
    'player().position=4;resolveSpace(player());',
    'player().position=1;showPurchaseDecision(player(),properties[0]);ui.actions[1].action();',
    'player().position=1;properties[0].owner=1;payRent(player(),properties[0]);',
    'player().position=1;properties[0].owner=1;winChallenge(player(),properties[0]);',
    'player().position=2;applyChance(player(),chanceCards[5]);',
    'player().position=16;showStationDecision(player(),6);ui.actions[0].action();',
    'await sendToJail(player(),"Go to Jail");',
    'await applyChance(player(),chanceCards[9]);'
  ];
  for(const setup of cases) {
    const e=engine(); e.run('scheduled=[];setTimeout=(fn,delay)=>{scheduled.push({fn,delay});return scheduled.length;};');
    await e.run(`(async()=>{${setup}})()`);
    assert.equal(e.run('state.pending.kind'),'turn-end',setup);
    assert.equal(e.run('scheduled.at(-1).delay'),2000,setup);
    assert.equal(e.run('state.currentPlayer'),0,setup);
    assert.equal(e.run('player().turns'),1,setup);
    e.run('scheduled.at(-1).fn();');
    assert.equal(e.run('state.currentPlayer'),1,setup);
    assert.equal(e.run('state.phase'),'choose',setup);
  }
});
test('quiet landing pauses survive saving and loading with only the remaining delay',async()=>{
  const e=engine();
  e.run(`clock=10000; Date.now=()=>clock; scheduled=[];setTimeout=(fn,delay)=>{scheduled.push({fn,delay});return scheduled.length;};
    player().position=18;resolveSpace(player());cloud=snapshotGame();clock+=500;
    supabaseClient={from(){return {select(){return {eq(){return {async single(){return {data:{id:'g',name:'Landing pause',game_state:cloud},error:null};}};}};}};}};`);
  await e.run('loadCloudGame("g")');
  assert.equal(e.run('scheduled.at(-1).delay'),1500);
  assert.equal(e.run('state.currentPlayer'),0);
  assert.equal(e.run('player().turns'),1);
  e.run('scheduled.at(-1).fn();');
  assert.equal(e.run('state.currentPlayer'),1);
});
test('cancelled quiet landing handoffs cannot change a different game session',()=>{
  const e=engine(); e.run('scheduled=[];setTimeout=(fn,delay)=>{scheduled.push({fn,delay});return 1;};player().position=10;resolveSpace(player());handoff=scheduled.at(-1).fn;cancelBoardAnimation();state=null;handoff();');
  assert.equal(e.run('state'),null);
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

test('board 1 and board 2 saves remap positions to the current numbering', async()=>{
  const supabaseMock=`supabaseClient={from(){return {select(){return {eq(){return {async single(){return {data:{id:'g',name:'Old save',game_state:cloud},error:null};}};}};}};}};`;
  const e=engine();
  e.run(`
    authUser={id:'u'}; state.gameId='g'; state.gameName='Old save';
    old=JSON.parse(JSON.stringify(state));
    old.players[0].position=12; old.players[1].position=30; old.phase='decision';
    old.pending={kind:'rent', pos:28};
    cloud={board:2, state:old, properties:[{position:28,name:'Chichén Itzá',owner:1,building:true}]};
    ${supabaseMock}
  `);
  await e.run('loadCloudGame("g")');
  assert.equal(e.run('state.players[0].position'),10);   // 13x7 Jail corner -> 11x9 Jail corner
  assert.equal(e.run('state.players[1].position'),28);   // 13x7 Go to Jail -> 11x9 Go to Jail
  assert.equal(e.run('state.pending.pos'),29);           // Chichén Itzá's index under 11x9
  assert.equal(e.run('propertyAt[29].owner'),1); assert.equal(e.run('propertyAt[29].building'),true);
  assert.ok(e.run('ui.actions.length')>0);
  const t=engine();
  t.run(`
    authUser={id:'u'}; state.gameId='g'; state.gameName='Old save';
    old=JSON.parse(JSON.stringify(state)); old.players[0].position=9;
    cloud={state:old, properties:[]};
    ${supabaseMock}
  `);
  await t.run('loadCloudGame("g")');
  assert.equal(t.run('state.players[0].position'),10);   // 10x10 Jail corner (no board tag)
});

test('the purchase and rent decisions expire after 30s to the safe default',()=>{
  // Purchase expires to leaving the block open: no owner, no cash moved, turn still ends.
  const buy=engine(); buy.run('showPurchaseDecision(player(),properties[0]);');
  assert.equal(buy.run('ui.timeLimit'),30);
  buy.run('ui.onTimeout();');
  assert.equal(buy.run('properties[0].owner'),null);
  assert.equal(buy.run('player().cash'),1000);
  assert.equal(buy.run('player().turns'),1);
  // Rent expires to paying, never to a challenge.
  const rent=engine(); rent.run('properties[0].owner=1; showRentDecision(player(),properties[0]);');
  assert.equal(rent.run('ui.timeLimit'),30);
  rent.run('ui.onTimeout();');
  assert.deepEqual(rent.plain('state.players.map(p=>p.cash)'),[990,1010,1000,1000]);
  assert.equal(rent.run('player().turns'),1);
  // Decisions played away from the screen, or with no rival waiting, keep no clock.
  for (const start of ['properties[0].owner=1; showChallengeDecision(player(),properties[0])','showJailDecision()','showStationDecision(player(),6)','showChanceCard(player(),0)']) {
    const e=engine(); e.run(`${start};`);
    assert.equal(e.run('ui.timeLimit'),undefined,start);
  }
});

(async()=>{
  let failed=0;
  for(const item of cases){try{await item.run();console.log('PASS',item.name);}catch(error){failed++;console.error('FAIL',item.name,error);}}
  console.log(`${cases.length-failed}/${cases.length} regression checks passed`);
  process.exitCode=failed?1:0;
})();
