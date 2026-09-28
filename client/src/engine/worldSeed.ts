export const DEFAULT_WORLD_SEED = 0;
export const MAX_WORLD_SEED = 2_147_483_647;

export function createWorldSeed(random = Math.random): number {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi) {
    const values = new Uint32Array(1);
    cryptoApi.getRandomValues(values);
    return values[0] % (MAX_WORLD_SEED + 1);
  }
  return Math.floor(random() * (MAX_WORLD_SEED + 1));
}

export function normalizeWorldSeed(seed: number | undefined): number {
  if (!Number.isInteger(seed) || seed === undefined) return DEFAULT_WORLD_SEED;
  return Math.max(0, Math.min(MAX_WORLD_SEED, seed));
}
