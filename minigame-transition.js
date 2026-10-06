// Presentation only. Timings measured from the supplied MP3 and reference recording.
// Reference audio correlates at +0.9878s in the MP3; text enters at video ~1.40s.
(() => {
  const root = document.getElementById('minigame-transition');
  if (!root) return;
  const icon = root.querySelector('.minigame-transition-icon');
  const title = root.querySelector('.minigame-transition-title');
  const DURATION = 5.0188, TITLE_CUE = 2.39;
  const audio = new Audio('assets/audio/mini-game-with-ding.mp3');
  audio.preload = 'auto';
  let current = null;

  function play({ onFrame, onFinish } = {}) {
    if (current) return current.promise;
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    const run = current = { promise, resolve, onFrame, onFinish, frame: 0, animations: [],
      started: performance.now(), lastAdvance: performance.now(), lastTime: 0, fallback: null };
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const focusBefore = document.activeElement;
    const inert = [...document.querySelectorAll('body > header, body > main, body > dialog')]
      .map(element => [element, element.inert]);
    inert.forEach(([element]) => { element.inert = true; });
    root.hidden = false; root.focus({ preventScroll: true });

    const animate = (element, frames, duration, delay = 0) => {
      const animation = element.animate(frames, { duration: duration * 1000, delay: delay * 1000, fill: 'both', easing: 'linear' });
      animation.pause(); animation.currentTime = 0; run.animations.push(animation);
    };
    animate(root, [{opacity:0}, {opacity:1,offset:.05}, {opacity:1,offset:.94}, {opacity:0}], DURATION);
    if (reduced) {
      animate(icon, [{opacity:0}, {opacity:1}], .12);
      animate(title, [{opacity:0}, {opacity:1}], .12, TITLE_CUE);
    } else {
      animate(icon, [
        {opacity:0,transform:'translateY(var(--minigame-icon-offset)) scale(.45)',offset:0},
        {opacity:1,transform:'translateY(var(--minigame-icon-offset)) scale(1.12)',offset:.14/2.76},
        {opacity:1,transform:'translateY(var(--minigame-icon-offset)) scale(1)',offset:.34/2.76},
        {opacity:1,transform:'translateY(var(--minigame-icon-offset)) scale(1)',offset:TITLE_CUE/2.76},
        {opacity:1,transform:'translateY(-4px) scale(1.05)',offset:2.60/2.76},
        {opacity:1,transform:'translateY(0) scale(1)',offset:1}
      ], 2.76);
      animate(title, [
        {opacity:0,transform:'translateY(14px) scale(.62)',offset:0},
        {opacity:1,transform:'translateY(-4px) scale(1.10)',offset:.46},
        {opacity:1,transform:'translateY(2px) scale(.98)',offset:.76},
        {opacity:1,transform:'translateY(0) scale(1)',offset:1}
      ], .43, TITLE_CUE);
    }

    const finish = completed => {
      if (current !== run) return;
      current = null; cancelAnimationFrame(run.frame); clearTimeout(run.guard);
      audio.removeEventListener('ended', ended); audio.removeEventListener('error', fallback);
      audio.pause();
      run.animations.forEach(animation => animation.cancel()); root.hidden = true;
      inert.forEach(([element, wasInert]) => { element.inert = wasInert; });
      if (focusBefore?.isConnected) focusBefore.focus({ preventScroll: true });
      run.onFinish?.(); resolve(completed);
    };
    run.cancel = () => finish(false);
    const fallback = () => {
      if (current !== run || run.fallback !== null) return;
      audio.pause(); run.fallback = performance.now() - run.lastTime * 1000;
    };
    const ended = () => finish(true);
    audio.addEventListener('ended', ended); audio.addEventListener('error', fallback);
    const tick = now => {
      if (current !== run) return;
      let seconds = run.fallback === null ? audio.currentTime : (now - run.fallback) / 1000;
      if (seconds > run.lastTime) run.lastAdvance = now;
      // Blocked/missing/stalled audio still gets a bounded silent presentation.
      if (run.fallback === null && now - run.lastAdvance > 1500) fallback();
      seconds = Math.max(run.lastTime, Math.min(DURATION, seconds)); run.lastTime = seconds;
      run.animations.forEach(animation => { animation.currentTime = seconds * 1000; });
      run.onFrame?.(seconds);
      if (seconds >= DURATION) { finish(true); return; }
      run.frame = requestAnimationFrame(tick);
    };
    run.guard = setTimeout(() => finish(true), (DURATION + 2.5) * 1000);
    run.frame = requestAnimationFrame(tick);
    // Called directly from Challenge's click handler, before any await.
    try {
      audio.currentTime = 0;
      const playing = audio.play();
      playing?.then(() => { if (current !== run || run.fallback !== null) audio.pause(); }).catch(fallback);
    } catch { fallback(); }
    return promise;
  }
  window.PUIMinigameTransition = { play, cancel: () => current?.cancel() };
})();
