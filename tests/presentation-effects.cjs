// Presentation-only cash result tests. No gameplay values are recalculated here.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
let now = 0;
let nextTimer = 0;
const timers = new Map();
const nodes = new Map();
const element = id => {
  if (!nodes.has(id)) {
    const classes = new Set();
    nodes.set(id, {
      hidden: true,
      className: '',
      textContent: '',
      classList: { add: value => classes.add(value), remove: value => classes.delete(value) },
      get offsetWidth() { return 800; }
    });
  }
  return nodes.get(id);
};
const schedule = (fn, delay = 0) => {
  timers.set(++nextTimer, { fn, time: now + delay });
  return nextTimer;
};
const tick = milliseconds => {
  const end = now + milliseconds;
  while (true) {
    const item = [...timers].sort((a, b) => a[1].time - b[1].time)[0];
    if (!item || item[1].time > end) break;
    timers.delete(item[0]);
    now = item[1].time;
    item[1].fn();
  }
  now = end;
};
const context = vm.createContext({
  document: { getElementById: element },
  window: {},
  setTimeout: schedule,
  clearTimeout: id => timers.delete(id)
});
vm.runInContext(fs.readFileSync(path.join(root, 'presentation-effects.js'), 'utf8'), context);

context.window.PUIPresentation.cash(-60, 'RENT PAID', 'Frog Team');
assert.equal(element('event-fx-kicker').textContent, 'Frog Team · LOSS');
assert.equal(element('event-fx-amount').textContent, '-$60');
assert.equal(element('event-fx-label').textContent, 'RENT PAID');

context.window.PUIPresentation.cash(60, 'RENT PROFIT', 'Wolf Team');
tick(2060);
assert.equal(element('event-fx-kicker').textContent, 'Wolf Team · PROFIT');
assert.equal(element('event-fx-amount').textContent, '+$60');
assert.equal(element('event-fx-label').textContent, 'RENT PROFIT');
tick(2060);

context.window.PUIPresentation.noRent('Horse Team');
assert.equal(element('event-fx-kicker').textContent, 'Horse Team · CHALLENGE WON');
assert.equal(element('event-fx-amount').textContent, '$0');
assert.equal(element('event-fx-label').textContent, 'NO RENT PAID');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
assert.equal(html.includes('event-fx-particles'), false);
assert.equal(css.includes('event-fx-particles'), false);
console.log('PASS cash and rent-free effects identify the team without the dot row');
