export const dampFactor = (speed, delta) => 1 - Math.exp(-speed * delta);
export function dampAngle(current, target, factor) {
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + difference * factor;
}
