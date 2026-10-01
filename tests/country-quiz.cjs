// Presentation-only operator quiz tests. No game save, account or network access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture(reduced = false) {
  let now = 0, serial = 0; const tasks = new Map(), nodes = new Map();
  const schedule = (fn, delay = 0) => { tasks.set(++serial, { fn, at: now + delay }); return serial; };
  const element = id => {
    if (nodes.has(id)) return nodes.get(id);
    const classes = new Set(), listeners = new Map();
    const node = { id, open: false, hidden: false, disabled: false, textContent: '',
      classList: { add: (...items) => items.forEach(item => classes.add(item)), remove: (...items) => items.forEach(item => classes.delete(item)), contains: item => classes.has(item) },
      addEventListener: (type, fn) => listeners.set(type, fn),
      fire(type) { listeners.get(type)?.({ target: node, preventDefault() {} }); },
      showModal() { node.open = true; }, close() { node.open = false; }, focus() {}
    };
    Object.defineProperty(node, 'className', { get: () => [...classes].join(' '), set: value => { classes.clear(); value.split(/\s+/).filter(Boolean).forEach(item => classes.add(item)); } });
    nodes.set(id, node); return node;
  };
  const context = vm.createContext({ document: { getElementById: element }, window: { matchMedia: () => ({ matches: reduced }) },
    setTimeout: schedule, clearTimeout: id => tasks.delete(id) });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../country-quiz.js'), 'utf8'), context);
  const tick = ms => {
    const end = now + ms;
    while (true) {
      const next = [...tasks].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      tasks.delete(next[0]); now = next[1].at; next[1].fn();
    }
    now = end;
  };
  return { api: context.window.PUICountryQuiz, element, tick };
}

{
  const f = fixture(); let correct = 0, wrong = 0;
  f.api.show({ landmark: 'Petronas Twin Towers', country: 'Malaysia', flag: '🇲🇾', onCorrect: () => correct++, onWrong: () => wrong++ });
  assert.equal(f.element('country-quiz-dialog').open, true);
  assert.equal(f.element('country-quiz-landmark').textContent, 'Petronas Twin Towers');
  assert.equal(f.element('country-quiz-country').textContent, '');
  assert.equal(f.element('country-quiz-flag').textContent, '');
  f.element('country-quiz-correct').fire('click');
  f.element('country-quiz-correct').fire('click');
  assert.equal(f.element('country-quiz-feedback').textContent, 'Correct!');
  assert.equal(f.element('country-quiz-country').textContent, 'MALAYSIA');
  assert.equal(f.element('country-quiz-flag').textContent, '🇲🇾');
  f.tick(1179); assert.equal(correct, 0);
  f.tick(1); assert.equal(correct, 1); assert.equal(wrong, 0);
  assert.equal(f.element('country-quiz-dialog').open, false);
  console.log('PASS correct reveals the answer once, then continues automatically');
}
{
  const f = fixture(); let correct = 0, wrong = 0;
  f.api.show({ landmark: 'Eiffel Tower', country: 'France', flag: '🇫🇷', onCorrect: () => correct++, onWrong: () => wrong++ });
  f.element('country-quiz-wrong').fire('click');
  assert.equal(f.element('country-quiz-feedback').textContent, 'Wrong!');
  assert.equal(f.element('country-quiz-country').textContent, '');
  assert.equal(f.element('country-quiz-flag').textContent, '');
  f.element('country-quiz-correct').fire('click');
  f.tick(800);
  assert.equal(correct, 0); assert.equal(wrong, 1);
  console.log('PASS wrong never reveals the answer and denies a second attempt');
}
{
  const f = fixture(); let continued = 0;
  f.api.show({ landmark: 'Mount Fuji', country: 'Japan', flag: '🇯🇵', onCorrect: () => continued++, onWrong: () => continued++ });
  f.api.cancel(); f.tick(2000);
  assert.equal(continued, 0); assert.equal(f.element('country-quiz-dialog').open, false);
  console.log('PASS navigation cancellation cannot resolve the quiz');
}
