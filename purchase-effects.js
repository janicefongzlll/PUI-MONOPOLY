// Purchase receipt presentation only. All values arrive AFTER the engine has settled.
(() => {
  const dialog = document.getElementById('acquisition-dialog');
  if (!dialog) return;
  const $ = id => document.getElementById(`acquisition-${id}`);
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = value => `$${Math.round(value).toLocaleString()}`;
  const imagePath = name => `art/blender-landmarks/previews/${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
  let pending = null, closing = false, opened = false, frame = 0;
  let openTimer, autoTimer, closeTimer;
  const clear = () => {
    clearTimeout(openTimer); clearTimeout(autoTimer); clearTimeout(closeTimer);
    cancelAnimationFrame(frame); frame = 0;
  };
  const finish = () => {
    clear();
    const done = pending; pending = null; closing = false; opened = false;
    if (dialog.open) dialog.close();
    dialog.classList.remove('is-closing');
    done?.();
  };
  const dismiss = () => {
    if (!pending || closing) return;
    closing = true; clear();
    dialog.classList.add('is-closing');
    closeTimer = setTimeout(finish, reduced() ? 0 : 200);
  };
  $('continue').addEventListener('click', dismiss);
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) dismiss(); });
  dialog.addEventListener('close', () => { if (pending && opened && !dialog.open) finish(); });
  $('image').addEventListener('error', () => dialog.classList.add('no-art'));
  $('image').addEventListener('load', () => dialog.classList.remove('no-art'));
  window.PUILandmarkAcquisition = {
    preload(name) { const image = new Image(); image.src = imagePath(name); },
    cancel: finish,
    show(receipt, done) {
      finish(); pending = done;
      dialog.classList.remove('no-art');
      $('name').textContent = receipt.name;
      $('team').textContent = receipt.team;
      $('price').textContent = `−${money(receipt.price)}`;
      $('balance').textContent = money(receipt.balance + receipt.price);
      $('balance-detail').setAttribute('aria-label', `Team balance ${money(receipt.balance)}`);
      $('image').src = imagePath(receipt.name);
      dialog.style.setProperty('--acquisition-team', receipt.color);
      // Let the ownership tint and landing ring read before revealing the receipt.
      openTimer = setTimeout(() => {
        if (!pending) return;
        dialog.showModal(); opened = true;
        $('continue').focus({ preventScroll: true });
        const start = performance.now() + 360;
        const count = now => {
          const t = reduced() ? 1 : Math.min(1, Math.max(0, (now - start) / 650));
          $('balance').textContent = money(receipt.balance + receipt.price * Math.pow(1 - t, 3));
          if (t < 1 && pending && !closing) frame = requestAnimationFrame(count);
        };
        frame = requestAnimationFrame(count);
        autoTimer = setTimeout(dismiss, 2800);
      }, reduced() ? 0 : 180);
    }
  };
})();
