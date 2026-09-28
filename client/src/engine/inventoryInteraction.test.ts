import assert from "node:assert/strict";
import test from "node:test";
import { BlockType } from "./blocks";
import { applySlotInteraction, type InventoryInteractionState } from "./inventoryInteraction";

function emptyState(): InventoryInteractionState {
  return {
    inventory: new Array(36).fill(null),
    counts: new Array(36).fill(0),
    cursor: null,
  };
}

test("shift click moves a hotbar stack into main inventory", () => {
  const state = emptyState();
  state.inventory[0] = BlockType.DIRT;
  state.counts[0] = 10;

  const next = applySlotInteraction(state, {
    slotIndex: 0,
    rightClick: false,
    shiftClick: true,
  });

  assert.ok(next);
  assert.equal(next.inventory[0], null);
  assert.equal(next.counts[0], 0);
  assert.equal(next.inventory[9], BlockType.DIRT);
  assert.equal(next.counts[9], 10);
});

test("right click picks up half a stack", () => {
  const state = emptyState();
  state.inventory[4] = BlockType.DIRT;
  state.counts[4] = 9;

  const next = applySlotInteraction(state, {
    slotIndex: 4,
    rightClick: true,
    shiftClick: false,
  });

  assert.ok(next);
  assert.deepEqual(next.cursor, { type: BlockType.DIRT, count: 4 });
  assert.equal(next.counts[4], 5);
});

test("left click swaps cursor and a different slot stack", () => {
  const state = emptyState();
  state.cursor = { type: BlockType.STONE, count: 3 };
  state.inventory[2] = BlockType.DIRT;
  state.counts[2] = 8;

  const next = applySlotInteraction(state, {
    slotIndex: 2,
    rightClick: false,
    shiftClick: false,
  });

  assert.ok(next);
  assert.equal(next.inventory[2], BlockType.STONE);
  assert.equal(next.counts[2], 3);
  assert.deepEqual(next.cursor, { type: BlockType.DIRT, count: 8 });
});

test("right click places one cursor item into an empty slot", () => {
  const state = emptyState();
  state.cursor = { type: BlockType.STONE, count: 3 };

  const next = applySlotInteraction(state, {
    slotIndex: 5,
    rightClick: true,
    shiftClick: false,
  });

  assert.ok(next);
  assert.equal(next.inventory[5], BlockType.STONE);
  assert.equal(next.counts[5], 1);
  assert.deepEqual(next.cursor, { type: BlockType.STONE, count: 2 });
});
