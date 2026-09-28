import { BlockType } from "./blocks";

export interface MutableWorldChunk {
  voxelData: Uint8Array;
  dirty: boolean;
  revision: number;
}

const CHUNK_SIZE = 16;
const WORLD_HEIGHT = 128;

function chunkKey(chunkX: number, chunkZ: number): string {
  return `${chunkX},${chunkZ}`;
}

function bumpNeighbor(
  chunks: Map<string, MutableWorldChunk>,
  chunkX: number,
  chunkZ: number,
): void {
  const key = chunkKey(chunkX, chunkZ);
  const chunk = chunks.get(key);
  if (!chunk) return;

  chunks.set(key, {
    ...chunk,
    revision: chunk.revision + 1,
  });
}

function voxelIndex(localX: number, y: number, localZ: number): number {
  return localX + y * CHUNK_SIZE + localZ * CHUNK_SIZE * WORLD_HEIGHT;
}

export function setBlockInChunks(
  chunks: Map<string, MutableWorldChunk>,
  x: number,
  y: number,
  z: number,
  blockType: BlockType,
): Map<string, MutableWorldChunk> | null {
  const blockX = Math.floor(x);
  const blockY = Math.floor(y);
  const blockZ = Math.floor(z);
  if (blockY < 0 || blockY >= WORLD_HEIGHT) return null;

  const chunkX = Math.floor(blockX / CHUNK_SIZE);
  const chunkZ = Math.floor(blockZ / CHUNK_SIZE);
  const localX = blockX - chunkX * CHUNK_SIZE;
  const localZ = blockZ - chunkZ * CHUNK_SIZE;
  const key = chunkKey(chunkX, chunkZ);
  const chunk = chunks.get(key);
  if (!chunk) return null;

  const index = voxelIndex(localX, blockY, localZ);
  if (chunk.voxelData[index] === blockType) return null;

  const next = new Map(chunks);
  const voxelData = new Uint8Array(chunk.voxelData);
  voxelData[index] = blockType;
  next.set(key, {
    voxelData,
    dirty: true,
    revision: chunk.revision + 1,
  });

  if (localX === 0) bumpNeighbor(next, chunkX - 1, chunkZ);
  if (localX === CHUNK_SIZE - 1) bumpNeighbor(next, chunkX + 1, chunkZ);
  if (localZ === 0) bumpNeighbor(next, chunkX, chunkZ - 1);
  if (localZ === CHUNK_SIZE - 1) bumpNeighbor(next, chunkX, chunkZ + 1);

  return next;
}
