// Copy-only checks; authentication and gameplay controls must remain available.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
for (const id of ['auth-title', 'setup-title', 'lobby-title']) {
  const heading = html.match(new RegExp(`<h1 id="${id}">([\\s\\S]*?)</h1>`))[1];
  assert.equal(heading.replace(/<br\s*\/>/g, ' '), 'PUI FORTUNE');
}
for (const name of ['auth', 'setup']) {
  const section = html.split(`id="${name}-screen"`)[1].split('</section>')[0];
  const hero = section.split('<div class="setup-copy">')[1].split('</div>')[0];
  assert.ok(!/<p\b|eyebrow|railway-route/.test(hero), `${name} hero contains just the main heading`);
  assert.ok(!section.includes('setup-card-heading'), `${name} form has no decorative subheading`);
}
const brand = html.split('<span class="railway-brand-copy">')[1].split('</a>')[0];
assert.ok(brand.includes('<strong>PUI FORTUNE</strong>') && !brand.includes('<small>'));
const setupForm = html.split('id="setup-form"')[1].split('</form>')[0];
assert.ok(setupForm.includes('<input id="game-name" type="hidden" value="PUI Fortune" />'));
assert.ok(!setupForm.includes('Every team boards with') && !setupForm.includes('Game name'));
for (const id of ['auth-form', 'auth-email', 'auth-password', 'auth-submit-label', 'auth-switch', 'auth-note', 'account-email', 'setup-form', 'game-name', 'player-name-fields', 'fullscreen-button', 'rules-button']) {
  assert.ok(html.includes(`id="${id}"`), `Existing functional element retained: ${id}`);
}
console.log('PASS PUI FORTUNE headings without introductory subheaders; forms, controls and account status retained');
