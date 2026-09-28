import { BlockType } from '../engine/blocks';

// Deterministic pseudo-random value for an *integer* lattice point. Only
// needs to be a stable, well-distributed function of integer inputs — the
// smoothness of the terrain comes from interpolating between these lattice
// values (see valueNoise2D), not from this hash itself.
function hashLattice(ix: number, iy: number, seed: number): number {
  let h = ix * 374761393 + iy * 668265263 + seed * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  // Convert to an unsigned 32-bit int, then to [0, 1).
  return (h >>> 0) / 4294967295;
}

// Quintic fade curve (Perlin's "improved noise" easing): smoother second
// derivative at cell boundaries than smoothstep, avoiding visible seams
// between grid cells once several octaves are layered.
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Coherent 2D value noise in [0, 1): smoothly interpolates between random
// values pinned at each integer lattice point, so neighbouring coordinates
// produce similar output — unlike a raw per-point hash, which is what
// produced the "random heap of blocks" look (every column an independent
// dice roll, with no relationship to its neighbours).
function valueNoise2D(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const sx = fade(x - x0);
  const sy = fade(y - y0);

  const n00 = hashLattice(x0, y0, seed);
  const n10 = hashLattice(x1, y0, seed);
  const n01 = hashLattice(x0, y1, seed);
  const n11 = hashLattice(x1, y1, seed);

  const ix0 = lerp(n00, n10, sx);
  const ix1 = lerp(n01, n11, sx);
  return lerp(ix0, ix1, sy);
}

// Fractal Brownian motion: layers several octaves of the coherent noise
// above at increasing frequency and decreasing amplitude, giving large
// smooth landforms with smaller natural-looking detail on top — still
// entirely continuous, since each layer is itself continuous.
function fbm2D(x: number, y: number, octaves: number, seed: number): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += valueNoise2D(x * frequency, y * frequency, seed + i * 101) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

const BASE_HEIGHT = 64;
const HEIGHT_VARIATION = 14;
const WATER_LEVEL = BASE_HEIGHT - 6;
const TERRAIN_FREQUENCY = 1 / 48;
const REGION_FREQUENCY = 1 / 96;

type ColumnContext = {
  voxelData: Uint8Array;
  x: number;
  z: number;
  chunkY: number;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  terrainHeight: number;
  regionNoise: number;
};

function voxelIndex(x: number, y: number, z: number, sizeX: number, sizeY: number): number {
  return x + y * sizeX + z * sizeX * sizeY;
}

function surfaceBlock(terrainHeight: number, regionNoise: number): BlockType {
  if (terrainHeight > BASE_HEIGHT + 8) {
    return regionNoise > 0.55 ? BlockType.DIRT : BlockType.STONE;
  }
  if (terrainHeight < BASE_HEIGHT - 6) return BlockType.SAND;
  return BlockType.GRASS;
}

function blockForWorldY(worldY: number, terrainHeight: number, regionNoise: number): BlockType {
  if (worldY < terrainHeight - 4) return BlockType.STONE;
  if (worldY < terrainHeight - 1) return BlockType.DIRT;
  if (worldY === terrainHeight - 1) return surfaceBlock(terrainHeight, regionNoise);
  if (worldY <= WATER_LEVEL) return BlockType.WATER;
  return BlockType.AIR;
}

function fillTerrainColumn(context: ColumnContext): void {
  const { voxelData, x, z, chunkY, sizeX, sizeY, terrainHeight, regionNoise } = context;
  for (let y = 0; y < sizeY; y++) {
    const worldY = chunkY + y;
    voxelData[voxelIndex(x, y, z, sizeX, sizeY)] = blockForWorldY(
      worldY,
      terrainHeight,
      regionNoise,
    );
  }
}

function isTreeCandidate(worldX: number, worldZ: number, terrainHeight: number): boolean {
  const isGrassySurface =
    terrainHeight <= BASE_HEIGHT + 8 && terrainHeight >= BASE_HEIGHT - 6;
  const onTreeGrid = worldX % 3 === 0 && worldZ % 3 === 0;
  return isGrassySurface && onTreeGrid;
}

function treeShouldGrow(worldX: number, worldZ: number): boolean {
  const forestDensity = fbm2D(
    worldX * REGION_FREQUENCY * 1.5,
    worldZ * REGION_FREQUENCY * 1.5,
    2,
    9001,
  );
  const plantHere = hashLattice(worldX, worldZ, 54321);
  return plantHere < forestDensity * 0.5;
}

function writeTreeTrunk(
  context: ColumnContext,
  treeHeight: number,
): void {
  const { voxelData, x, z, chunkY, sizeX, sizeY, terrainHeight } = context;
  for (let treeY = 0; treeY < treeHeight; treeY++) {
    const worldY = terrainHeight + treeY;
    if (worldY >= chunkY + sizeY) continue;

    const index = voxelIndex(x, worldY - chunkY, z, sizeX, sizeY);
    if (index >= 0 && index < voxelData.length) {
      voxelData[index] = BlockType.WOOD_LOG;
    }
  }
}

function leafFitsChunk(
  x: number,
  z: number,
  worldY: number,
  chunkY: number,
  sizeX: number,
  sizeY: number,
  sizeZ: number,
): boolean {
  return (
    x >= 0 &&
    x < sizeX &&
    z >= 0 &&
    z < sizeZ &&
    worldY >= chunkY &&
    worldY < chunkY + sizeY
  );
}

function writeLeaf(
  context: ColumnContext,
  leafX: number,
  leafY: number,
  leafZ: number,
  treeHeight: number,
): void {
  if (Math.abs(leafX) + Math.abs(leafY) + Math.abs(leafZ) > 3) return;

  const { voxelData, x, z, chunkY, sizeX, sizeY, sizeZ, terrainHeight } = context;
  const worldY = terrainHeight + treeHeight + leafY;
  const localX = x + leafX;
  const localZ = z + leafZ;
  if (!leafFitsChunk(localX, localZ, worldY, chunkY, sizeX, sizeY, sizeZ)) return;

  const index = voxelIndex(localX, worldY - chunkY, localZ, sizeX, sizeY);
  if (index >= 0 && index < voxelData.length && voxelData[index] === BlockType.AIR) {
    voxelData[index] = BlockType.LEAF;
  }
}

function writeTreeCanopy(context: ColumnContext, treeHeight: number): void {
  for (let leafY = -2; leafY <= 2; leafY++) {
    for (let leafX = -2; leafX <= 2; leafX++) {
      for (let leafZ = -2; leafZ <= 2; leafZ++) {
        writeLeaf(context, leafX, leafY, leafZ, treeHeight);
      }
    }
  }
}

function maybePlantTree(context: ColumnContext, worldX: number, worldZ: number): void {
  if (!isTreeCandidate(worldX, worldZ, context.terrainHeight)) return;
  if (!treeShouldGrow(worldX, worldZ)) return;

  const treeHeight = 4 + Math.floor(hashLattice(worldX, worldZ, 98765) * 3);
  writeTreeTrunk(context, treeHeight);
  writeTreeCanopy(context, treeHeight);
}

function buildColumnContext(
  voxelData: Uint8Array,
  x: number,
  z: number,
  chunkY: number,
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  worldX: number,
  worldZ: number,
): ColumnContext {
  const heightNoise = fbm2D(
    worldX * TERRAIN_FREQUENCY,
    worldZ * TERRAIN_FREQUENCY,
    4,
    1,
  );
  const terrainHeight = Math.round(
    BASE_HEIGHT + (heightNoise * 2 - 1) * HEIGHT_VARIATION,
  );
  const regionNoise = fbm2D(
    worldX * REGION_FREQUENCY,
    worldZ * REGION_FREQUENCY,
    2,
    4242,
  );

  return {
    voxelData,
    x,
    z,
    chunkY,
    sizeX,
    sizeY,
    sizeZ,
    terrainHeight,
    regionNoise,
  };
}

export function generateChunkTerrain(
  chunkX: number,
  chunkY: number,
  chunkZ: number,
  sizeX: number,
  sizeY: number,
  sizeZ: number
): Uint8Array {
  const voxelData = new Uint8Array(sizeX * sizeY * sizeZ);

  for (let x = 0; x < sizeX; x++) {
    for (let z = 0; z < sizeZ; z++) {
      const worldX = chunkX + x;
      const worldZ = chunkZ + z;
      const context = buildColumnContext(
        voxelData,
        x,
        z,
        chunkY,
        sizeX,
        sizeY,
        sizeZ,
        worldX,
        worldZ,
      );

      fillTerrainColumn(context);
      maybePlantTree(context, worldX, worldZ);
    }
  }

  return voxelData;
}
