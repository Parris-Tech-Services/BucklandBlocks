import test from "node:test";
import assert from "node:assert/strict";
import { BlockType as B } from "./blocks";
import { craftFromInventory } from "./crafting";
import { type Stack } from "./inventory";

test("crafting consumes exact ingredients and adds output atomically", () => {
  const source: Stack[] = [{ type: B.WOOD_LOG, count: 2 }, null];
  const result = craftFromInventory(
    source,
    [{ type: B.WOOD_LOG, count: 1 }],
    { type: B.WOOD_PLANK, count: 4 },
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.slots, [
    { type: B.WOOD_LOG, count: 1 },
    { type: B.WOOD_PLANK, count: 4 },
  ]);
  assert.equal(source[0]?.count, 2);
});

test("full output rejects without consuming ingredients", () => {
  const source: Stack[] = [
    { type: B.WOOD_LOG, count: 2 },
    { type: B.WOOD_PLANK, count: 64 },
  ];
  const result = craftFromInventory(
    source,
    [{ type: B.WOOD_LOG, count: 1 }],
    { type: B.TORCH, count: 4 },
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.slots, source);
});

test("consuming a final ingredient can free the output slot", () => {
  const result = craftFromInventory(
    [{ type: B.WOOD_LOG, count: 1 }],
    [{ type: B.WOOD_LOG, count: 1 }],
    { type: B.WOOD_PLANK, count: 4 },
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.slots, [
    { type: B.WOOD_PLANK, count: 4 },
  ]);
});

test("repeated crafting cannot duplicate output without ingredients", () => {
  let slots: Stack[] = [{ type: B.WOOD_LOG, count: 2 }, null];
  for (let i = 0; i < 2; i += 1) {
    const result = craftFromInventory(
      slots,
      [{ type: B.WOOD_LOG, count: 1 }],
      { type: B.WOOD_PLANK, count: 4 },
    );
    assert.equal(result.ok, true);
    slots = result.slots;
  }

  const failed = craftFromInventory(
    slots,
    [{ type: B.WOOD_LOG, count: 1 }],
    { type: B.WOOD_PLANK, count: 4 },
  );

  assert.equal(failed.ok, false);
  assert.equal(
    slots.reduce(
      (total, stack) =>
        total +
        (stack?.type === B.WOOD_PLANK ? stack.count : 0),
      0,
    ),
    8,
  );
});
