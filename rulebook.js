// UI-only chapter navigation. This module never reads or writes game state.
(() => {
  const book = document.getElementById('rules-dialog');
  if (!book) return;
  const miniPages = book.querySelector('#rb-mini-pages');
  const flipWarsPage = `
    <header class="rb-flip-header">
      <h3>Flip Wars</h3>
      <div class="rb-flip-sides"><span class="rb-flip-card rb-flip-black" aria-hidden="true"></span><span class="rb-flip-card rb-flip-white" aria-hidden="true"></span><strong>Black vs White</strong></div>
    </header>
    <ol class="rb-flip-steps">
      <li><span class="rb-flip-number" aria-hidden="true">1</span><p>Split into <strong>2 teams</strong>: Black team vs White team.</p></li>
      <li><span class="rb-flip-number" aria-hidden="true">2</span><p>All players line up in <strong>2 rows</strong>.</p></li>
      <li><span class="rb-flip-number" aria-hidden="true">3</span><p>As the <strong>EMCEE counts 1–10</strong>, flip <strong>as many cards as possible</strong> to your team's colour.</p></li>
      <li><span class="rb-flip-number" aria-hidden="true">4</span><p>When the countdown ends, <strong>return to your team</strong>. The next person continues.</p></li>
    </ol>
    <div class="rb-flip-win"><svg aria-hidden="true"><use href="#rb-trophy"></use></svg><p>The team with the <strong>most cards showing its colour wins!</strong></p></div>`;
  const empirePage = `
    <header class="rb-flip-header"><h3>Rock, Paper, Empire!</h3><svg class="rb-mini-cartoon" viewBox="0 0 240 100" aria-hidden="true" focusable="false"><use href="#rb-mini-rps"></use></svg></header>
    <ol class="rb-flip-steps">
      <li><span class="rb-flip-number" aria-hidden="true">1</span><p>Split into <strong>2 teams</strong>. Stand <strong>face-to-face in 2 rows</strong>.</p></li>
      <li><span class="rb-flip-number" aria-hidden="true">2</span><p>The <strong>first players from both teams</strong> play <strong>Rock, Paper, Scissors</strong>.</p></li>
      <li><span class="rb-flip-number" aria-hidden="true">3</span><p>The <strong>loser joins the winner’s team</strong>.</p></li>
      <li><span class="rb-flip-number" aria-hidden="true">4</span><p>The <strong>winner stays</strong> and challenges the <strong>next opponent</strong>. Keep playing until <strong>everyone has been challenged</strong>.</p></li>
    </ol>
    <div class="rb-flip-win"><svg aria-hidden="true"><use href="#rb-trophy"></use></svg><p>The player who <strong>defeats the final opponent wins the game for their team!</strong></p></div>`;
  const musicalChairsPage = `
    <header class="rb-flip-header"><h3>Musical Chairs</h3><svg class="rb-mini-cartoon" viewBox="0 0 240 100" aria-hidden="true" focusable="false"><use href="#rb-mini-chair"></use></svg></header>
    <ol class="rb-flip-steps">
      <li><span class="rb-flip-number" aria-hidden="true">1</span><p>Each of the <strong>2 teams sends 5 teammates</strong>. Start with <strong>10 players and 9 chairs</strong>.</p></li>
      <li><span class="rb-flip-number" aria-hidden="true">2</span><p>While the <strong>music plays</strong>, walk around the chairs.</p></li>
      <li><span class="rb-flip-number" aria-hidden="true">3</span><p>When the <strong>music stops</strong>, find a seat! The player <strong>without a chair is out</strong>.</p></li>
      <li><span class="rb-flip-number" aria-hidden="true">4</span><p><strong>Remove 1 chair</strong> after each round. Keep playing until <strong>only 1 player remains</strong>.</p></li>
    </ol>
    <div class="rb-flip-win"><svg aria-hidden="true"><use href="#rb-trophy"></use></svg><p>The <strong>last player remaining wins for their team!</strong></p></div>`;
  const cupPage = `
    <header class="rb-flip-header"><h3>Cup Me If You Can</h3><svg class="rb-mini-cartoon" viewBox="0 0 240 100" aria-hidden="true" focusable="false"><use href="#rb-mini-cups"></use></svg></header>
    <ol class="rb-flip-steps">
      <li><span class="rb-flip-number" aria-hidden="true">1</span><p>Each team selects <strong>2 members</strong> to stand as <strong>cup holders</strong>.</p></li>
      <li><span class="rb-flip-number" aria-hidden="true">2</span><p>The remaining members <strong>line up behind the starting line</strong>, each holding <strong>1 cup</strong>.</p></li>
      <li><span class="rb-flip-number" aria-hidden="true">3</span><p>Players <strong>take turns placing their cups</strong> on the two selected members.</p></li>
      <li><span class="rb-flip-number" aria-hidden="true">4</span><p>Cups must be held using <strong>body parts only</strong>. <strong>No props or tools</strong> are allowed.</p></li>
    </ol>
    <div class="rb-flip-win"><svg aria-hidden="true"><use href="#rb-trophy"></use></svg><p>The team with the <strong>most cups successfully balanced on their two members wins!</strong></p></div>`;
  const flockPage = `
    <header class="rb-flip-header"><h3>What the Flock?!</h3><svg class="rb-mini-cartoon" viewBox="0 0 240 100" aria-hidden="true" focusable="false"><use href="#rb-mini-flock"></use></svg></header>
    <ol class="rb-flip-steps rb-flock-steps">
      <li><span class="rb-flip-number" aria-hidden="true">1</span><p><strong>All members from both teams</strong> line up behind the <strong>starting line</strong>.</p></li>
      <li><span class="rb-flip-number" aria-hidden="true">2</span><p>The <strong>finish line</strong> is a designated <strong>sheep pen</strong>.</p></li>
      <li><span class="rb-flip-number" aria-hidden="true">3</span><p>Players <strong>take turns</strong> using a <strong>piece of cardboard</strong> to herd the sheep into the pen.</p></li>
    </ol>
    <div class="rb-flip-win"><svg aria-hidden="true"><use href="#rb-trophy"></use></svg><p>The team that successfully herds the <strong>most sheep into the pen wins!</strong></p></div>`;
  const colourPage = `
    <header class="rb-flip-header"><h3>Don’t Touch the Color!</h3><svg class="rb-mini-cartoon" viewBox="0 0 240 100" aria-hidden="true" focusable="false"><use href="#rb-mini-colour"></use></svg></header>
    <ol class="rb-flip-steps">
      <li><span class="rb-flip-number" aria-hidden="true">1</span><p><strong>Both teams</strong> send out <strong>all their representatives</strong>.</p></li>
      <li><span class="rb-flip-number" aria-hidden="true">2</span><p>Listen carefully when the <strong>host calls a colour</strong>.</p></li>
      <li><span class="rb-flip-number" aria-hidden="true">3</span><p><strong>Avoid touching that colour</strong> before <strong>time runs out!</strong></p></li>
      <li><span class="rb-flip-number" aria-hidden="true">4</span><p>Anyone who <strong>touches the announced colour</strong> is <strong>eliminated</strong>.</p></li>
    </ol>
    <div class="rb-flip-win"><svg aria-hidden="true"><use href="#rb-trophy"></use></svg><p>The team with the <strong>last player standing wins!</strong></p></div>`;
  const miniGamePages = { 1: flipWarsPage, 2: empirePage, 3: musicalChairsPage, 4: cupPage, 5: flockPage, 6: colourPage };
  for (let number = 1; number <= 6; number++) {
    const page = document.createElement('section');
    page.id = `rb-page-mini-${number}`;
    page.className = miniGamePages[number] ? 'rb-page rb-flip-page' : 'rb-page rb-coming-page';
    page.setAttribute('role', 'tabpanel');
    page.setAttribute('aria-labelledby', `rb-tab-mini-${number}`);
    page.tabIndex = 0;
    page.hidden = number !== 1;
    page.innerHTML = miniGamePages[number] || `<h3 class="rb-sr-only">Mini Game ${String(number).padStart(2, '0')}</h3><div class="rb-coming"><div class="rb-coming-art"><svg aria-hidden="true"><use href="#rb-game"></use></svg></div><h4>Coming Soon</h4></div>`;
    miniPages.append(page);
  }

  function select(tab, focus = false) {
    const list = tab.closest('[role="tablist"]');
    list.querySelectorAll('[role="tab"]').forEach(item => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      book.querySelector(`#${item.getAttribute('aria-controls')}`).hidden = !active;
    });
    if (focus) tab.focus();
    const activeSection = book.querySelector('.rb-section:not([hidden])');
    const chapterTabs = [...activeSection.querySelectorAll('[role="tab"]')];
    const current = chapterTabs.findIndex(item => item.getAttribute('aria-selected') === 'true');
    book.querySelector('#rb-folio').textContent = `CHAPTER ${String(current + 1).padStart(2, '0')} / ${String(chapterTabs.length).padStart(2, '0')}`;
  }

  book.querySelectorAll('[role="tablist"]').forEach(list => {
    list.addEventListener('click', event => {
      const tab = event.target.closest('[role="tab"]');
      if (tab && list.contains(tab)) select(tab);
    });
    list.addEventListener('keydown', event => {
      const tab = event.target.closest('[role="tab"]');
      if (!tab) return;
      const vertical = list.getAttribute('aria-orientation') === 'vertical';
      const forward = vertical ? 'ArrowDown' : 'ArrowRight';
      const backward = vertical ? 'ArrowUp' : 'ArrowLeft';
      if (![forward, backward, 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const tabs = [...list.querySelectorAll('[role="tab"]')];
      const index = tabs.indexOf(tab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === forward ? 1 : -1) + tabs.length) % tabs.length;
      select(tabs[next], true);
    });
  });
})();
