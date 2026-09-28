import assert from "node:assert/strict";
import { test } from "node:test";
import { BlockType } from "./blocks";
import { addItems, craftAtomic, moveStack, type Stack } from "./inventory";

test("addItems respects stack limits and reports remainder", () => {
  const slots: Stack[] = [{ type: BlockType.DIRT, count: 60 }, null];
  const r = addItems(slots, BlockType.DIRT, 10);
  assert.equal(r.accepted, 10); assert.equal(r.remainder, 0);
  assert.deepEqual(r.slots, [{ type: BlockType.DIRT, count: 64 }, { type: BlockType.DIRT, count: 6 }]);
});

test("moveStack merges and swaps without changing item total", () => {
  const merged = moveStack([{ type: BlockType.DIRT, count: 3 }, { type: BlockType.DIRT, count: 2 }], 0, 1);
  assert.deepEqual(merged.slots, [null, { type: BlockType.DIRT, count: 5 }]);
  const swapped = moveStack([{ type: BlockType.DIRT, count: 2 }, { type: BlockType.STONE, count: 1 }], 0, 1);
  assert.deepEqual(swapped.slots, [{ type: BlockType.STONE, count: 1 }, { type: BlockType.DIRT, count: 2 }]);
});

test("craftAtomic is all-or-nothing when output has no capacity", () => {
  const full = Array.from({ length: 2 }, () => ({ type: BlockType.STONE, count: 64 } as Stack));
  const recipe = [{ result: { type: BlockType.WOOD_PLANK, count: 4 }, pattern: [BlockType.WOOD_LOG, null] }];
  const result = craftAtomic(full, [{ type: BlockType.WOOD_LOG, count: 1 }, null], recipe);
  assert.equal(result.ok, false);
  assert.equal(result.grid[0]?.count, 1);
});

test("craftAtomic consumes exactly one matching ingredient", () => {
  const recipe = [{ result: { type: BlockType.WOOD_PLANK, count: 4 }, pattern: [BlockType.WOOD_LOG, null] }];
  const result = craftAtomic([null, null], [{ type: BlockType.WOOD_LOG, count: 2 }, null], recipe);
  assert.equal(result.ok, true);
  assert.deepEqual(result.grid[0], { type: BlockType.WOOD_LOG, count: 1 });
  assert.deepEqual(result.slots[0], { type: BlockType.WOOD_PLANK, count: 4 });
});
