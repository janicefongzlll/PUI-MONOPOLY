// Presentation-only cashier chime. It never reads or changes game state.
(() => {
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  const sample = new Audio('assets/audio/cash-register-kaching.mp3');
  sample.preload = 'auto';
  sample.volume = 1;
  let context = null;
  let unlocked = false;

  const getContext = () => {
    if (!AudioEngine) return null;
    if (!context) context = new AudioEngine();
    return context;
  };

  const warm = () => {
    const audio = getContext();
    if (audio?.state === 'suspended') audio.resume()?.catch?.(() => {});
    if (!unlocked) {
      // A silent first play during a real gesture unlocks delayed purchase audio on Safari/iOS.
      sample.muted = true;
      const ready = sample.play();
      ready?.then?.(() => {
        sample.pause(); sample.currentTime = 0; sample.muted = false; unlocked = true;
      }).catch?.(() => { sample.muted = false; });
    }
  };

  const strike = (audio, frequency, start, duration, volume, type = 'sine', endFrequency = frequency) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + .03);
  };

  const synthFallback = () => {
    const audio = getContext();
    if (!audio) return;
    const ring = () => {
      const now = audio.currentTime + .015;
      // Drawer click followed by a bright, two-part coin/register chime.
      strike(audio, 185, now, .085, .09, 'square', 72);
      strike(audio, 1318.5, now + .07, .5, .12, 'triangle', 1345);
      strike(audio, 1975.5, now + .075, .46, .07, 'sine', 2015);
      strike(audio, 1760, now + .18, .62, .13, 'triangle', 1810);
      strike(audio, 2637, now + .185, .56, .055, 'sine', 2690);
    };
    if (audio.state === 'suspended') audio.resume()?.then?.(ring).catch?.(() => {});
    else ring();
  };

  const play = () => {
    sample.pause();
    sample.muted = false;
    sample.currentTime = 0;
    const playing = sample.play();
    playing?.catch?.(() => synthFallback());
  };

  // Prepare audio on a real user gesture so the later automatic reveal can be heard.
  document.addEventListener('pointerdown', warm, { capture: true });
  document.addEventListener('keydown', warm, { capture: true });
  window.addEventListener('pagehide', () => { sample.pause(); context?.close?.(); });
  window.PUIPurchaseSound = { warm, play };
})();
