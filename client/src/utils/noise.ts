import { BlockType } from "../engine/blocks";

function hash2D(x: number, z: number, seed = 12345): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(seed, 69069);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function fade(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function valueNoise(x: number, z: number, seed = 12345): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = fade(x - x0);
  const tz = fade(z - z0);
  const a = hash2D(x0, z0, seed);
  const b = hash2D(x0 + 1, z0, seed);
  const c = hash2D(x0, z0 + 1, seed);
  const d = hash2D(x0 + 1, z0 + 1, seed);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), tz);
}

function fbm(x: number, z: number, octaves = 4): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let totalAmplitude = 0;
  for (let i = 0; i < octaves; i += 1) {
    value += valueNoise(x * frequency, z * frequency, 12345 + i * 1013) * amplitude;
    totalAmplitude += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / totalAmplitude;
}

export function generateChunkTerrain(
  chunkX: number,
  chunkY: number,
  chunkZ: number,
  sizeX: number,
  sizeY: number,
  sizeZ: number,
): Uint8Array {
  const voxelData = new Uint8Array(sizeX * sizeY * sizeZ);
  const baseHeight = 63;

  for (let x = 0; x < sizeX; x += 1) {
    for (let z = 0; z < sizeZ; z += 1) {
      const worldX = chunkX + x;
      const worldZ = chunkZ + z;
      const broad = fbm(worldX * 0.018, worldZ * 0.018, 4);
      const detail = fbm(worldX * 0.055, worldZ * 0.055, 2);
      const terrainHeight = Math.max(48, Math.min(86, Math.floor(baseHeight + (broad - 0.5) * 18 + (detail - 0.5) * 5)));

      for (let y = 0; y < sizeY; y += 1) {
        const worldY = chunkY + y;
        const voxelIndex = x + y * sizeX + z * sizeX * sizeY;
        if (worldY < terrainHeight - 4) voxelData[voxelIndex] = BlockType.STONE;
        else if (worldY < terrainHeight - 1) voxelData[voxelIndex] = BlockType.DIRT;
        else if (worldY === terrainHeight - 1) voxelData[voxelIndex] = BlockType.GRASS;
      }

      const treeRoll = hash2D(worldX, worldZ, 54321);
      if (treeRoll > 0.985 && x >= 2 && x < sizeX - 2 && z >= 2 && z < sizeZ - 2) {
        const trunkHeight = 4 + Math.floor(hash2D(worldX, worldZ, 98765) * 3);
        for (let dy = 0; dy < trunkHeight; dy += 1) {
          const y = terrainHeight + dy;
          if (y >= chunkY && y < chunkY + sizeY) {
            voxelData[x + (y - chunkY) * sizeX + z * sizeX * sizeY] = BlockType.WOOD_LOG;
          }
        }
        for (let dy = -2; dy <= 2; dy += 1) {
          for (let dx = -2; dx <= 2; dx += 1) {
            for (let dz = -2; dz <= 2; dz += 1) {
              if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 3) continue;
              const y = terrainHeight + trunkHeight + dy;
              if (y < chunkY || y >= chunkY + sizeY) continue;
              const index = (x + dx) + (y - chunkY) * sizeX + (z + dz) * sizeX * sizeY;
              if (voxelData[index] === BlockType.AIR) voxelData[index] = BlockType.LEAF;
            }
          }
        }
      }
    }
  }

  return voxelData;
}
