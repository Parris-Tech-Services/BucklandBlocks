import test from "node:test";
import assert from "node:assert/strict";
import { BlockType } from "./blocks";
import { cycleHotbarSlot, takeFromHotbarSlot } from "./hotbar";

test("mouse wheel cycles the nine-slot hotbar and wraps", () => {
  assert.equal(cycleHotbarSlot(0, 1), 1);
  assert.equal(cycleHotbarSlot(8, 1), 0);
  assert.equal(cycleHotbarSlot(0, -1), 8);
});

test("Q-style stack drop removes the whole selected stack", () => {
  assert.deepEqual(takeFromHotbarSlot(BlockType.DIRT, 12, false), {
    type: null,
    remainingCount: 0,
    dropCount: 12,
  });
});

test("Shift+Q-style single drop removes exactly one", () => {
  assert.deepEqual(takeFromHotbarSlot(BlockType.DIRT, 12, true), {
    type: BlockType.DIRT,
    remainingCount: 11,
    dropCount: 1,
  });
});
