import assert from "node:assert/strict";
import test from "node:test";
import { BlockType } from "./blocks";
import { setBlockInChunks, type MutableWorldChunk } from "./worldBlocks";

function chunk(fill = BlockType.AIR, revision = 0): MutableWorldChunk {
  const voxelData = new Uint8Array(16 * 128 * 16);
  voxelData.fill(fill);
  return { voxelData, dirty: false, revision };
}

function index(x: number, y: number, z: number): number {
  return x + y * 16 + z * 16 * 128;
}

test("block mutation clones the target chunk and preserves the original", () => {
  const originalChunk = chunk();
  const chunks = new Map([["0,0", originalChunk]]);

  const next = setBlockInChunks(chunks, 2, 10, 3, BlockType.STONE);

  assert.ok(next);
  assert.notEqual(next, chunks);
  assert.notEqual(next.get("0,0")?.voxelData, originalChunk.voxelData);
  assert.equal(originalChunk.voxelData[index(2, 10, 3)], BlockType.AIR);
  assert.equal(next.get("0,0")?.voxelData[index(2, 10, 3)], BlockType.STONE);
  assert.equal(next.get("0,0")?.dirty, true);
  assert.equal(next.get("0,0")?.revision, 1);
});

test("block mutation returns null for out-of-range, missing, or unchanged blocks", () => {
  const filled = chunk(BlockType.DIRT);
  const chunks = new Map([["0,0", filled]]);

  assert.equal(setBlockInChunks(chunks, 0, -1, 0, BlockType.STONE), null);
  assert.equal(setBlockInChunks(chunks, 0, 128, 0, BlockType.STONE), null);
  assert.equal(setBlockInChunks(chunks, 32, 10, 0, BlockType.STONE), null);
  assert.equal(setBlockInChunks(chunks, 1, 10, 1, BlockType.DIRT), null);
});

test("editing a chunk edge bumps existing neighbour revisions without dirtying them", () => {
  const chunks = new Map<string, MutableWorldChunk>([
    ["0,0", chunk()],
    ["-1,0", chunk(BlockType.AIR, 5)],
    ["0,-1", chunk(BlockType.AIR, 8)],
  ]);

  const next = setBlockInChunks(chunks, 0, 5, 0, BlockType.STONE);

  assert.ok(next);
  assert.equal(next.get("-1,0")?.revision, 6);
  assert.equal(next.get("-1,0")?.dirty, false);
  assert.equal(next.get("0,-1")?.revision, 9);
  assert.equal(next.get("0,-1")?.dirty, false);
});
