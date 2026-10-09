// UI-only chapter navigation. This module never reads or writes game state.
(() => {
  const book = document.getElementById('rules-dialog');
  if (!book) return;
  const miniPages = book.querySelector('#rb-mini-pages');
  for (let number = 1; number <= 6; number++) {
    const page = document.createElement('section');
    page.id = `rb-page-mini-${number}`;
    page.className = 'rb-page rb-coming-page';
    page.setAttribute('role', 'tabpanel');
    page.setAttribute('aria-labelledby', `rb-tab-mini-${number}`);
    page.tabIndex = 0;
    page.hidden = number !== 1;
    page.innerHTML = `<h3 class="rb-sr-only">Mini Game ${String(number).padStart(2, '0')}</h3><div class="rb-coming"><div class="rb-coming-art"><svg aria-hidden="true"><use href="#rb-game"></use></svg></div><h4>Coming Soon</h4></div>`;
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
