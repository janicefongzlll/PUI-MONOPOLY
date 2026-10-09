// Isolated rulebook checks: no account, game state or network access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'rulebook.js'), 'utf8');
for (const caption of ['Your landmark adventure.', 'A few stops along the way.', 'THE BASICS / FIVE SIMPLE STEPS', 'LITTLE TWISTS / BIG MOMENTS', 'A SHORT DETOUR', 'TAKE A SHORTCUT', 'CHALLENGE ACCEPTED']) {
  assert.ok(!html.includes(caption), `Decorative caption removed: ${caption}`);
}
const special = html.split('id="rb-page-special"')[1].split('id="rb-minigames-section"')[0];
const firstRow = special.slice(special.indexOf('class="rb-features"'), special.indexOf('class="rb-challenge-row"'));
const secondRow = special.slice(special.indexOf('class="rb-challenge-row"'));
assert.equal((firstRow.match(/<article/g) || []).length, 2);
assert.ok(firstRow.includes('Jail') && firstRow.includes('Transit Station') && !firstRow.includes('Mini Game'));
assert.ok(['Mini Game', 'PAY RENT', 'WIN', 'LOSE'].every(label => secondRow.includes(label)));
const elements = new Map();
const element = (id, attributes = {}) => {
  const e = { id, attributes, hidden: false, tabIndex: 0, handlers: {}, children: [],
    setAttribute(key, value) { this.attributes[key] = value; },
    getAttribute(key) { return this.attributes[key]; },
    addEventListener(key, handler) { this.handlers[key] = handler; },
    append(child) { this.children.push(child); elements.set(child.id, child); },
    closest() { return this.list; }, focus() { this.focused = true; },
    contains(child) { return this.children.includes(child); },
    querySelectorAll() { return this.children; }
  };
  elements.set(id, e); return e;
};
const lists = [];
const chapters = {};
for (const [id, names] of [['main', ['monopoly', 'minigames']], ['monopoly', ['how', 'special']], ['minigames', Array.from({length: 6}, (_, i) => `mini-${i+1}`)]]) {
  const list = element(`list-${id}`, id === 'main' ? {'aria-orientation':'vertical'} : {});
  lists.push(list);
  for (const [index, name] of names.entries()) {
    const tabId = id === 'main' ? `rb-main-${name}` : `rb-tab-${name}`;
    const panelId = id === 'main' ? `rb-${name}-section` : `rb-page-${name}`;
    assert.ok(html.includes(`id="${tabId}"`));
    const tab = element(tabId, {'aria-selected': String(index === 0), 'aria-controls': panelId});
    tab.tabIndex = index === 0 ? 0 : -1; tab.list = list; list.children.push(tab);
    const panel = element(panelId); panel.hidden = index !== 0;
    if (id === 'main') chapters[name] = panel;
  }
}
chapters.monopoly.children = lists[1].children;
chapters.minigames.children = lists[2].children;
const miniPages = element('rb-mini-pages');
element('rb-folio');
const book = {
  querySelector(selector) {
    return selector === '.rb-section:not([hidden])' ? Object.values(chapters).find(e => !e.hidden) : elements.get(selector.slice(1));
  }, querySelectorAll() { return lists; }
};
vm.runInNewContext(source, { document: { getElementById: () => book, createElement: () => element('new') } });
assert.equal(miniPages.children.length, 6);
for (const [index, page] of miniPages.children.entries()) {
  assert.equal(page.id, `rb-page-mini-${index+1}`);
  assert.equal(page.hidden, index !== 0);
  assert.ok(page.innerHTML.includes('Coming Soon'));
  assert.ok(page.innerHTML.includes(`Mini Game 0${index+1}`));
}
function click(list, index) {
  const tab = list.children[index];
  list.handlers.click({target: {closest: () => tab}});
  assert.equal(tab.getAttribute('aria-selected'), 'true');
  assert.equal(tab.tabIndex, 0);
  assert.equal(elements.get(tab.getAttribute('aria-controls')).hidden, false);
  list.children.filter(t => t !== tab).forEach(t => {
    assert.equal(t.getAttribute('aria-selected'), 'false');
    assert.equal(t.tabIndex, -1);
    assert.equal(elements.get(t.getAttribute('aria-controls')).hidden, true);
  });
}
click(lists[1], 1);
assert.equal(elements.get('rb-folio').textContent, 'CHAPTER 02 / 02');
click(lists[0], 1);
for (let i = 0; i < 6; i++) click(lists[2], i);
assert.equal(elements.get('rb-folio').textContent, 'CHAPTER 06 / 06');
let prevented = false;
lists[2].handlers.keydown({key:'ArrowRight', target:{closest:()=>lists[2].children[5]}, preventDefault(){prevented=true;}});
assert.equal(prevented, true);
assert.equal(lists[2].children[0].getAttribute('aria-selected'), 'true');
assert.equal(lists[2].children[0].focused, true);
lists[2].handlers.keydown({key:'End', target:{closest:()=>lists[2].children[0]}, preventDefault(){}});
assert.equal(lists[2].children[5].getAttribute('aria-selected'), 'true');
lists[2].handlers.keydown({key:'Home', target:{closest:()=>lists[2].children[5]}, preventDefault(){}});
assert.equal(lists[2].children[0].getAttribute('aria-selected'), 'true');
lists[0].handlers.keydown({key:'ArrowUp', target:{closest:()=>lists[0].children[1]}, preventDefault(){}});
assert.equal(chapters.monopoly.hidden, false);
assert.equal(elements.get('rb-folio').textContent, 'CHAPTER 02 / 02');
assert.ok(!/\b(state|adjustCash|purchaseProperty|movePlayer)\b/.test(source.replace(/\/\/[^\n]*/g,'')));
console.log('PASS rulebook: two sections, eight chapters, empty placeholders, selection memory, keyboard wrap/Home/End, and no game-state coupling');
