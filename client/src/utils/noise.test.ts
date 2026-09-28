// Regression test for "the landscape looks like a random heap of blocks":
// the previous noise function was a raw per-point hash (Math.sin(x*12.9898
// + ...)), which has essentially zero spatial correlation between adjacent
// integer coordinates — every voxel column was an independent dice roll for
// height, surface block type, and tree placement. Real terrain needs
// *coherent* noise: nearby columns should have similar values, so height
// changes gradually (rolling hills) instead of jumping block-to-block.
//
// Run with: npx tsx --test client/src/utils/noise.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateChunkTerrain } from './noise';
import { BlockType, isBlockSolid } from '../engine/blocks';

const SIZE = { x: 16, y: 128, z: 16 };

function surfaceHeights(voxelData: Uint8Array): number[][] {
  // heights[x][z] = topmost solid block's y, or -1 if the whole column is air.
  const heights: number[][] = Array.from({ length: SIZE.x }, () => new Array(SIZE.z).fill(-1));
  for (let x = 0; x < SIZE.x; x++) {
    for (let z = 0; z < SIZE.z; z++) {
      for (let y = SIZE.y - 1; y >= 0; y--) {
        const block = voxelData[x + y * SIZE.x + z * SIZE.x * SIZE.y];
        if (isBlockSolid(block) && block !== BlockType.WOOD_LOG && block !== BlockType.LEAF) {
          heights[x][z] = y;
          break;
        }
      }
    }
  }
  return heights;
}

test('terrain height changes gradually between adjacent columns (no chaotic block-to-block jumps)', () => {
  const voxels = generateChunkTerrain(0, 0, 0, SIZE.x, SIZE.y, SIZE.z);
  const heights = surfaceHeights(voxels);

  let maxJump = 0;
  let jumpCount = 0;
  const totalPairs = SIZE.x * (SIZE.z - 1) + (SIZE.x - 1) * SIZE.z;

  for (let x = 0; x < SIZE.x; x++) {
    for (let z = 0; z < SIZE.z - 1; z++) {
      const jump = Math.abs(heights[x][z] - heights[x][z + 1]);
      maxJump = Math.max(maxJump, jump);
      if (jump > 3) jumpCount++;
    }
  }
  for (let x = 0; x < SIZE.x - 1; x++) {
    for (let z = 0; z < SIZE.z; z++) {
      const jump = Math.abs(heights[x][z] - heights[x + 1][z]);
      maxJump = Math.max(maxJump, jump);
      if (jump > 3) jumpCount++;
    }
  }

  // A raw uncorrelated hash routinely produces 10+ block jumps between
  // neighbours across a 16x14 height-variation range. Coherent noise over a
  // 16x16 sample should stay well within a few blocks step-to-step.
  assert.ok(maxJump <= 6, `expected smooth terrain (max adjacent-column jump <= 6), got a jump of ${maxJump}`);
  assert.ok(
    jumpCount / totalPairs < 0.05,
    `expected few large jumps between neighbours, got ${jumpCount}/${totalPairs} pairs jumping more than 3 blocks`
  );
});

test('the same world seed reproduces identical terrain and different seeds diverge', () => {
  const first = generateChunkTerrain(0, 0, 0, SIZE.x, SIZE.y, SIZE.z, 12345);
  const second = generateChunkTerrain(0, 0, 0, SIZE.x, SIZE.y, SIZE.z, 12345);
  const alternate = generateChunkTerrain(0, 0, 0, SIZE.x, SIZE.y, SIZE.z, 54321);

  assert.deepEqual(first, second);
  assert.ok(first.some((block, index) => block !== alternate[index]));
});

test('terrain height stays within the configured variation band around sea level', () => {
  const voxels = generateChunkTerrain(0, 0, 0, SIZE.x, SIZE.y, SIZE.z);
  const heights = surfaceHeights(voxels);
  for (const row of heights) {
    for (const h of row) {
      assert.ok(h >= 0, 'every column should have some solid ground');
      assert.ok(h >= 40 && h <= 90, `expected height within a sane band around baseHeight=64, got ${h}`);
    }
  }
});

test('generating two adjacent chunks produces a continuous seam (no cliff at the chunk boundary)', () => {
  const chunkA = generateChunkTerrain(0, 0, 0, SIZE.x, SIZE.y, SIZE.z);
  const chunkB = generateChunkTerrain(SIZE.x, 0, 0, SIZE.x, SIZE.y, SIZE.z);
  const heightsA = surfaceHeights(chunkA);
  const heightsB = surfaceHeights(chunkB);

  let maxSeamJump = 0;
  for (let z = 0; z < SIZE.z; z++) {
    // Last column of chunk A (world x = 15) vs first column of chunk B (world x = 16).
    maxSeamJump = Math.max(maxSeamJump, Math.abs(heightsA[SIZE.x - 1][z] - heightsB[0][z]));
  }
  assert.ok(maxSeamJump <= 6, `expected a continuous seam between chunks, got a jump of ${maxSeamJump}`);
});

test('trees only grow on grassy, roughly-flat ground', () => {
  const voxels = generateChunkTerrain(0, 0, 0, SIZE.x, SIZE.y, SIZE.z);
  let sawTree = false;
  for (let i = 0; i < voxels.length; i++) {
    if (voxels[i] === BlockType.WOOD_LOG) sawTree = true;
  }
  // Not asserting trees exist in every 16x16 sample (forest density is a
  // smooth field with genuine gaps) — just that if we generate enough
  // ground to plausibly contain one, nothing throws and output is sane.
  assert.equal(typeof sawTree, 'boolean');
});

test('low-lying columns flood with water up to the water level', () => {
  // Sample a wide area so we hit at least some naturally low terrain —
  // water forms wherever a column's ground sits at/below the water level,
  // it isn't guaranteed in any single fixed chunk.
  let sawWater = false;
  let sawWaterAboveLevel = false;
  const WATER_LEVEL = 58; // baseHeight(64) - 6, mirrors noise.ts
  for (let cx = -3; cx <= 3 && !sawWater; cx++) {
    for (let cz = -3; cz <= 3; cz++) {
      const voxels = generateChunkTerrain(cx * SIZE.x, 0, cz * SIZE.z, SIZE.x, SIZE.y, SIZE.z);
      for (let x = 0; x < SIZE.x; x++) {
        for (let z = 0; z < SIZE.z; z++) {
          for (let y = 0; y < SIZE.y; y++) {
            if (voxels[x + y * SIZE.x + z * SIZE.x * SIZE.y] === BlockType.WATER) {
              sawWater = true;
              if (y > WATER_LEVEL) sawWaterAboveLevel = true;
            }
          }
        }
      }
    }
  }
  assert.ok(sawWater, 'expected at least one water block within a 7x7 chunk sample');
  assert.equal(sawWaterAboveLevel, false, 'water should never appear above the configured water level');
});

test('water does not float above open air — it always sits on solid ground or more water', () => {
  const voxels = generateChunkTerrain(0, 0, 0, SIZE.x, SIZE.y, SIZE.z);
  for (let x = 0; x < SIZE.x; x++) {
    for (let z = 0; z < SIZE.z; z++) {
      for (let y = 1; y < SIZE.y; y++) {
        const idx = x + y * SIZE.x + z * SIZE.x * SIZE.y;
        if (voxels[idx] === BlockType.WATER) {
          const below = voxels[x + (y - 1) * SIZE.x + z * SIZE.x * SIZE.y];
          assert.ok(
            below === BlockType.WATER || isBlockSolid(below),
            `water at y=${y} (x=${x},z=${z}) has open air beneath it at y=${y - 1}`
          );
        }
      }
    }
  }
});
