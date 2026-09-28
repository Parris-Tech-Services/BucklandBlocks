export interface ChunkCoord {
  x: number;
  z: number;
}

export const MIN_VIEW_DISTANCE = 1;
export const MAX_VIEW_DISTANCE = 4;
export const CHUNK_GENERATION_BATCH = 2;

export function clampViewDistance(value: number): number {
  return Math.max(MIN_VIEW_DISTANCE, Math.min(MAX_VIEW_DISTANCE, Math.round(value)));
}

export function orderedChunkCoords(
  centerX: number,
  centerZ: number,
  viewDistance: number,
): ChunkCoord[] {
  const radius = clampViewDistance(viewDistance);
  const coords: ChunkCoord[] = [];

  for (let x = centerX - radius; x <= centerX + radius; x++) {
    for (let z = centerZ - radius; z <= centerZ + radius; z++) {
      coords.push({ x, z });
    }
  }

  coords.sort((a, b) => {
    const da = (a.x - centerX) ** 2 + (a.z - centerZ) ** 2;
    const db = (b.x - centerX) ** 2 + (b.z - centerZ) ** 2;
    if (da !== db) return da - db;
    if (a.x !== b.x) return a.x - b.x;
    return a.z - b.z;
  });

  return coords;
}
