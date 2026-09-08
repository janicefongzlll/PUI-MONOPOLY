export const easeInOut = t => t * t * (3 - 2 * t);

// Abort resolves false, leaving logical state at the last completed hop.
export function animate(duration, update, signal) {
  if (signal?.aborted) return Promise.resolve(false);
  return new Promise(resolve => {
    let frame;
    const start = performance.now();
    const finish = success => {
      cancelAnimationFrame(frame);
      signal?.removeEventListener('abort', abort);
      resolve(success);
    };
    const abort = () => finish(false);
    signal?.addEventListener('abort', abort, { once: true });
    const tick = now => {
      const t = Math.min(1, (now - start) / duration);
      update(t);
      if (t === 1) finish(true); else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  });
}

export async function hopToken(token, destination, { signal, reducedMotion = false, onFrame } = {}) {
  const from = token.position.clone();
  const duration = reducedMotion ? 180 : 390;
  return animate(duration, t => {
    const travel = easeInOut(Math.min(t / 0.85, 1));
    token.position.lerpVectors(from, destination, travel);
    token.position.y += Math.sin(Math.PI * Math.min(t / 0.85, 1)) * (reducedMotion ? 0.08 : 0.9);
    const impact = t > 0.85 ? Math.sin((t - 0.85) / 0.15 * Math.PI) * 0.12 : 0;
    token.scale.set(1 + impact * 0.45, 1 - impact, 1 + impact * 0.45);
    onFrame?.(t);
  }, signal);
}

export function bounceToken(token, { signal, reducedMotion = false } = {}) {
  const y = token.position.y;
  return animate(reducedMotion ? 160 : 580, t => {
    const bounce = Math.abs(Math.sin(t * Math.PI * 2)) * (1 - t);
    token.position.y = y + bounce * (reducedMotion ? 0.02 : 0.38);
    const squash = Math.sin(t * Math.PI * 4) * (1 - t) * 0.1;
    token.scale.set(1 + squash * 0.4, 1 - squash, 1 + squash * 0.4);
  }, signal);
}
