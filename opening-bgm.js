// Local audio only. The two loop files are trimmed from the supplied originals:
// opening = 5 seconds to end; gameplay = 0–31 seconds. Native looping avoids timer drift.
(() => {
  const tracks = Object.freeze({
    opening: 'opening-loop.m4a', gameplay: 'gameplay-loop.m4a',
    frog: 'frog.mp3', monkey: 'monkey.mp3', wolf: 'wolf.mp3', horse: 'horse.mp3'
  });
  const audio = document.createElement('audio');
  audio.id = 'game-bgm'; audio.preload = 'auto'; audio.loop = true;
  audio.volume = .55; audio.hidden = true; document.body.appendChild(audio);
  const retry = document.createElement('button');
  retry.type = 'button'; retry.className = 'music-retry'; retry.hidden = true;
  retry.textContent = 'Enable music'; document.body.appendChild(retry);
  let mode = null, gameplay = false, gameplayTime = 0, revision = 0;

  function attempt() {
    const version = revision;
    // Invoked synchronously from Start, movement, or the fallback button.
    const playing = audio.play();
    playing?.then(() => { if (version === revision) retry.hidden = true; }).catch(error => {
      if (version !== revision || !mode || mode === 'transition') return;
      retry.hidden = false;
      retry.textContent = error.name === 'NotAllowedError' ? 'Enable music' : 'Retry music';
    });
  }
  function select(next, position = 0) {
    if (!tracks[next] || mode === next) return;
    if (mode === 'gameplay') gameplayTime = audio.currentTime % 31;
    revision++; audio.pause(); mode = next;
    audio.dataset.track = next;
    audio.src = `assets/audio/${tracks[next]}`;
    audio.currentTime = position;
    audio.loop = true; audio.muted = false; retry.hidden = true;
    attempt();
  }
  function stop() {
    revision++; audio.pause(); audio.currentTime = 0;
    mode = null; gameplay = false; gameplayTime = 0;
    audio.dataset.track = ''; retry.hidden = true;
  }
  function transition() {
    if (mode === 'gameplay') gameplayTime = audio.currentTime % 31;
    revision++; audio.pause(); mode = 'transition';
    audio.dataset.track = 'transition'; retry.hidden = true;
  }
  function stopChallenge() {
    if (mode !== 'transition' && !['frog', 'monkey', 'wolf', 'horse'].includes(mode)) return;
    revision++; audio.pause(); audio.currentTime = 0; mode = null;
    if (gameplay) select('gameplay', gameplayTime);
    else { audio.dataset.track = ''; retry.hidden = true; }
  }
  retry.addEventListener('click', () => { if (mode && mode !== 'transition') attempt(); });
  audio.addEventListener('error', () => {
    if (mode && mode !== 'transition') { retry.textContent = 'Retry music'; retry.hidden = false; }
  });
  window.addEventListener('pagehide', stop);
  window.PUIOpeningBgm = {
    warm() {},
    start() { stop(); select('opening'); },
    startGameplay() { gameplay = true; select('gameplay', gameplayTime); },
    transition,
    startChallenge(animalName) {
      const animal = String(animalName || '').toLowerCase();
      if (['frog', 'monkey', 'wolf', 'horse'].includes(animal)) select(animal);
    },
    stopChallenge, stop
  };
})();
