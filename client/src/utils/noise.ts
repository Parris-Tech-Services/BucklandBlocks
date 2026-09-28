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

export function generateChunkTerrain(
  chunkX: number,
  chunkY: number,
  chunkZ: number,
  sizeX: number,
  sizeY: number,
  sizeZ: number
): Uint8Array {
  const voxelData = new Uint8Array(sizeX * sizeY * sizeZ);

  const baseHeight = 64;
  const heightVariation = 14;
  // One full hill cycle spans roughly 1/frequency blocks — tuned for gentle
  // rolling terrain rather than a hill (or a chaotic jump) every block.
  const terrainFrequency = 1 / 48;
  // A second, much lower-frequency field selects broad regions (forest vs.
  // open field, sandy vs. grassy) — large coherent patches instead of a
  // block-by-block flicker between surface types.
  const regionFrequency = 1 / 96;

  for (let x = 0; x < sizeX; x++) {
    for (let z = 0; z < sizeZ; z++) {
      const worldX = chunkX + x;
      const worldZ = chunkZ + z;

      const heightNoise = fbm2D(worldX * terrainFrequency, worldZ * terrainFrequency, 4, 1);
      const terrainHeight = Math.round(baseHeight + (heightNoise * 2 - 1) * heightVariation);

      const regionNoise = fbm2D(worldX * regionFrequency, worldZ * regionFrequency, 2, 4242);

      for (let y = 0; y < sizeY; y++) {
        const worldY = chunkY + y;
        const voxelIndex = x + y * sizeX + z * sizeX * sizeY;

        if (worldY < terrainHeight - 4) {
          voxelData[voxelIndex] = BlockType.STONE;
        } else if (worldY < terrainHeight - 1) {
          voxelData[voxelIndex] = BlockType.DIRT;
        } else if (worldY === terrainHeight - 1) {
          if (terrainHeight > baseHeight + 8) {
            // Mountainous — bare stone, with dirt only where the smooth
            // region field says the slope is gentle enough to hold soil.
            voxelData[voxelIndex] = regionNoise > 0.55 ? BlockType.DIRT : BlockType.STONE;
          } else if (terrainHeight < baseHeight - 6) {
            voxelData[voxelIndex] = BlockType.SAND;
          } else {
            voxelData[voxelIndex] = BlockType.GRASS;
          }
        } else {
          voxelData[voxelIndex] = BlockType.AIR;
        }
      }

      // Forest density is its own smooth, low-frequency field, so trees
      // cluster into natural-looking patches with open ground between them
      // instead of being scattered uniformly at random. Only grassy,
      // roughly-flat ground grows trees. Checking on a coarser 3-block grid
      // (rather than every column) keeps canopies from overlapping.
      const isGrassySurface = terrainHeight <= baseHeight + 8 && terrainHeight >= baseHeight - 6;
      const onTreeGrid = worldX % 3 === 0 && worldZ % 3 === 0;
      if (isGrassySurface && onTreeGrid) {
        const forestDensity = fbm2D(worldX * regionFrequency * 1.5, worldZ * regionFrequency * 1.5, 2, 9001);
        const plantHere = hashLattice(worldX, worldZ, 54321);
        // Higher forest density lowers the bar for a tree to spawn here,
        // so dense regions read as forest and sparse regions as open field.
        if (plantHere < forestDensity * 0.5) {
          const treeHeight = 4 + Math.floor(hashLattice(worldX, worldZ, 98765) * 3);
          for (let treeY = 0; treeY < treeHeight; treeY++) {
            const y = terrainHeight + treeY;
            if (y < chunkY + sizeY) {
              const voxelIndex = x + (y - chunkY) * sizeX + z * sizeX * sizeY;
              if (voxelIndex >= 0 && voxelIndex < voxelData.length) {
                voxelData[voxelIndex] = BlockType.WOOD_LOG;
              }
            }
          }

          for (let leafY = -2; leafY <= 2; leafY++) {
            for (let leafX = -2; leafX <= 2; leafX++) {
              for (let leafZ = -2; leafZ <= 2; leafZ++) {
                if (Math.abs(leafX) + Math.abs(leafY) + Math.abs(leafZ) <= 3) {
                  const y = terrainHeight + treeHeight + leafY;
                  const leafWorldX = x + leafX;
                  const leafWorldZ = z + leafZ;

                  if (
                    leafWorldX >= 0 && leafWorldX < sizeX &&
                    leafWorldZ >= 0 && leafWorldZ < sizeZ &&
                    y >= chunkY && y < chunkY + sizeY
                  ) {
                    const voxelIndex = leafWorldX + (y - chunkY) * sizeX + leafWorldZ * sizeX * sizeY;
                    if (voxelIndex >= 0 && voxelIndex < voxelData.length && voxelData[voxelIndex] === BlockType.AIR) {
                      voxelData[voxelIndex] = BlockType.LEAF;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return voxelData;
}
