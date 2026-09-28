export const MAX_HEALTH = 20;
export const SAFE_FALL_DISTANCE = 3;

export function getFallDamage(
  distance: number,
  landedInWater: boolean,
): number {
  if (landedInWater || distance <= SAFE_FALL_DISTANCE) return 0;
  return Math.max(
    1,
    Math.floor((distance - SAFE_FALL_DISTANCE) / 2) + 1,
  );
}
