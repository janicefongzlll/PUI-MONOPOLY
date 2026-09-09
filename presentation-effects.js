// Presentation-only event layer. It never reads or writes game state.
(() => {
  const root = document.getElementById('event-fx');
  if (!root) return;
  const amount = document.getElementById('event-fx-amount');
  const kicker = document.getElementById('event-fx-kicker');
  const label = document.getElementById('event-fx-label');
  const queue = []; let timer = null; let active = false;
  const money = value => `$${Math.abs(value).toLocaleString()}`;
  const run = event => {
    active = true; clearTimeout(timer);
    root.hidden = false; root.className = `event-fx is-${event.kind}${event.major ? ' is-major' : ''}`;
    kicker.textContent = event.kicker || '';
    amount.textContent = event.amount === undefined ? '' : `${event.amount < 0 ? '-' : '+'}${money(event.amount)}`;
    label.textContent = event.label || '';
    // Restart CSS animation without touching gameplay or player input state.
    void root.offsetWidth; root.classList.add('is-active');
    timer = setTimeout(() => {
      root.classList.remove('is-active');
      setTimeout(() => { root.hidden = true; active = false; if (queue.length) run(queue.shift()); }, 260);
    }, event.duration || 1250);
  };
  const show = event => { if (active) queue.push(event); else run(event); };
  window.PUIPresentation = {
    cash(value, labelText) {
      if (!value) return;
      show({ kind: value > 0 ? 'profit' : 'loss', amount: value, label: labelText || (value > 0 ? 'PROFIT' : 'LOSS'), major: Math.abs(value) >= 100, duration: 1800 });
    },
    jail() { show({ kind: 'jail', kicker: 'CITY SECURITY', label: 'GO TO JAIL!', duration: 1650, major: true }); },
    transit() { show({ kind: 'transit', kicker: 'CITY LINE', label: 'TRAIN TRAVEL', duration: 1450, major: true }); },
    upgrade() { show({ kind: 'upgrade', label: 'LANDMARK UPGRADED', duration: 1050 }); }
  };
})();
