// Operator-controlled verbal quiz. It displays no answers until Correct is selected.
(() => {
  const dialog = document.getElementById('country-quiz-dialog');
  if (!dialog) return;
  const $ = id => document.getElementById(`country-quiz-${id}`);
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = null, timer = null;
  const clear = () => { clearTimeout(timer); timer = null; };
  const close = callback => {
    clear(); dialog.classList.add('is-leaving');
    timer = setTimeout(() => {
      if (dialog.open) dialog.close();
      dialog.className = 'country-quiz-dialog';
      active = null; callback?.();
    }, reduced() ? 0 : 180);
  };
  const answer = correct => {
    if (!active || dialog.classList.contains('is-answered')) return;
    const result = active;
    dialog.classList.add('is-answered', correct ? 'is-correct' : 'is-wrong');
    $('correct').disabled = true; $('wrong').disabled = true;
    $('feedback').textContent = correct ? 'Correct!' : 'Wrong!';
    if (correct) {
      // The answer only enters the visible UI after the operator confirms success.
      $('flag').textContent = result.flag;
      $('country').textContent = result.country.toUpperCase();
      $('reveal').hidden = false;
    }
    timer = setTimeout(() => close(correct ? result.onCorrect : result.onWrong), reduced() ? 80 : (correct ? 1000 : 620));
  };
  $('correct').addEventListener('click', () => answer(true));
  $('wrong').addEventListener('click', () => answer(false));
  dialog.addEventListener('cancel', event => event.preventDefault());
  window.PUICountryQuiz = {
    show(options) {
      this.cancel(); active = { ...options };
      dialog.className = 'country-quiz-dialog';
      $('landmark').textContent = options.landmark;
      $('feedback').textContent = '';
      $('flag').textContent = ''; $('country').textContent = ''; $('reveal').hidden = true;
      $('correct').disabled = false; $('wrong').disabled = false;
      dialog.showModal(); $('correct').focus({ preventScroll: true });
    },
    cancel() {
      clear(); active = null;
      if (dialog.open) dialog.close();
      dialog.className = 'country-quiz-dialog';
    }
  };
})();
