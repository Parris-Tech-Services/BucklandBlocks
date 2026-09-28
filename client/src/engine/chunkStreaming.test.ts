import test from "node:test";
import assert from "node:assert/strict";
import {
  CHUNK_GENERATION_BATCH,
  MAX_VIEW_DISTANCE,
  MIN_VIEW_DISTANCE,
  clampViewDistance,
  orderedChunkCoords,
} from "./chunkStreaming";

test("view distance is clamped to safe browser bounds", () => {
  assert.equal(clampViewDistance(-100), MIN_VIEW_DISTANCE);
  assert.equal(clampViewDistance(99), MAX_VIEW_DISTANCE);
  assert.equal(clampViewDistance(2.4), 2);
});

test("chunk coordinates are ordered nearest-first", () => {
  const coords = orderedChunkCoords(5, -2, 1);
  assert.deepEqual(coords[0], { x: 5, z: -2 });
  assert.equal(coords.length, 9);
  assert.ok(
    coords.slice(1).every(({ x, z }) => {
      const dx = x - 5;
      const dz = z + 2;
      return dx * dx + dz * dz >= 1;
    }),
  );
});

test("generation batch stays deliberately small", () => {
  assert.ok(CHUNK_GENERATION_BATCH > 0);
  assert.ok(CHUNK_GENERATION_BATCH <= 4);
});
