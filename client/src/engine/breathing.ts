export const MAX_AIR = 20;
export const AIR_TICK_SECONDS = 0.5;
export const DROWN_TICK_SECONDS = 1;
export const DROWN_DAMAGE = 2;

export function nextAir(current: number, submerged: boolean): number {
  const safeCurrent = Math.max(0, Math.min(MAX_AIR, current));
  if (submerged) return Math.max(0, safeCurrent - 1);
  return Math.min(MAX_AIR, safeCurrent + 4);
}

export function shouldDrown(air: number, submerged: boolean): boolean {
  return submerged && air <= 0;
}
