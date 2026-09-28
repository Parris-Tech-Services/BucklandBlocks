import assert from "node:assert/strict";
import test from "node:test";
import { BlockType } from "./blocks";
import {
  craftIntoCursor,
  craftIntoInventory,
  findMatchingRecipe,
  interactWithCraftingSlot,
  type CraftingGridState,
  type CraftingRecipe,
} from "./craftingGrid";

const recipes: CraftingRecipe[] = [
  {
    id: "logs_to_planks",
    result: { type: BlockType.WOOD_PLANK, count: 4 },
    pattern: ["L"],
    legend: { L: BlockType.WOOD_LOG },
  },
  {
    id: "crafting_table",
    result: { type: BlockType.CRAFTING_TABLE, count: 1 },
    pattern: ["PP", "PP"],
    legend: { P: BlockType.WOOD_PLANK },
  },
  {
    id: "pickaxe",
    result: { type: BlockType.PICKAXE, count: 1 },
    pattern: ["PPP", " S ", " S "],
    legend: { P: BlockType.WOOD_PLANK, S: BlockType.STICK },
  },
];

function state(
  grid: (BlockType | null)[],
  counts: number[],
): CraftingGridState {
  return { grid, counts, cursor: null };
}

test("recipe matching is translation-invariant inside the crafting grid", () => {
  assert.equal(
    findMatchingRecipe(
      [null, null, null, BlockType.WOOD_LOG],
      2,
      recipes,
    )?.id,
    "logs_to_planks",
  );

  assert.equal(
    findMatchingRecipe(
      [
        BlockType.WOOD_PLANK,
        BlockType.WOOD_PLANK,
        null,
        BlockType.WOOD_PLANK,
        BlockType.WOOD_PLANK,
        null,
        null,
        null,
        null,
      ],
      3,
      recipes,
    )?.id,
    "crafting_table",
  );
});

test("2x2 grids do not advertise or match 3x3 recipes", () => {
  assert.equal(
    findMatchingRecipe(
      [
        BlockType.WOOD_PLANK,
        BlockType.WOOD_PLANK,
        BlockType.STICK,
        BlockType.STICK,
      ],
      2,
      recipes,
    ),
    null,
  );
});

test("crafting slot interaction uses the shared cursor transaction rules", () => {
  const next = interactWithCraftingSlot(
    {
      grid: [BlockType.WOOD_LOG, null, null, null],
      counts: [9, 0, 0, 0],
      cursor: null,
    },
    0,
    true,
  );

  assert.deepEqual(next.cursor, { type: BlockType.WOOD_LOG, count: 4 });
  assert.equal(next.counts[0], 5);
});

test("crafting into the cursor is atomic when output cannot merge", () => {
  const original: CraftingGridState = {
    grid: [BlockType.WOOD_LOG, null, null, null],
    counts: [1, 0, 0, 0],
    cursor: { type: BlockType.STONE, count: 1 },
  };
  const result = craftIntoCursor(original, recipes[0]);

  assert.equal(result.ok, false);
  assert.deepEqual(result.state, original);
});

test("crafting into inventory does not consume ingredients when output has no capacity", () => {
  const original = state(
    [BlockType.WOOD_LOG, null, null, null],
    [1, 0, 0, 0],
  );
  const inventory = new Array<BlockType | null>(2).fill(BlockType.STONE);
  const counts = [64, 64];

  const result = craftIntoInventory(original, inventory, counts, recipes[0]);

  assert.equal(result.ok, false);
  assert.equal(result.crafting.grid[0], BlockType.WOOD_LOG);
  assert.equal(result.crafting.counts[0], 1);
  assert.deepEqual(result.inventory, inventory);
});

test("crafting into inventory respects tool maxStack=1", () => {
  const pickaxeRecipe = recipes[2];
  const crafting = state(
    [
      BlockType.WOOD_PLANK,
      BlockType.WOOD_PLANK,
      BlockType.WOOD_PLANK,
      null,
      BlockType.STICK,
      null,
      null,
      BlockType.STICK,
      null,
    ],
    [1, 1, 1, 0, 1, 0, 0, 1, 0],
  );

  const result = craftIntoInventory(
    crafting,
    [BlockType.PICKAXE, null],
    [1, 0],
    pickaxeRecipe,
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.inventory, [BlockType.PICKAXE, BlockType.PICKAXE]);
  assert.deepEqual(result.inventoryCounts, [1, 1]);
});

test("successful crafting consumes one of each occupied ingredient", () => {
  const result = craftIntoCursor(
    state(
      [
        BlockType.WOOD_PLANK,
        BlockType.WOOD_PLANK,
        BlockType.WOOD_PLANK,
        BlockType.WOOD_PLANK,
      ],
      [2, 2, 2, 2],
    ),
    recipes[1],
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.state.counts, [1, 1, 1, 1]);
  assert.deepEqual(result.state.cursor, {
    type: BlockType.CRAFTING_TABLE,
    count: 1,
  });
});
