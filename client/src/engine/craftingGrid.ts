import { BlockType, getBlockData } from "./blocks";
import {
  applySlotInteraction,
  type CursorItem,
  type InventoryInteractionState,
} from "./inventoryInteraction";

export interface CraftingRecipe {
  id: string;
  result: { type: BlockType; count: number };
  pattern: string[];
  legend: Record<string, BlockType>;
}

export interface CraftingGridState {
  grid: (BlockType | null)[];
  counts: number[];
  cursor: CursorItem;
}

type Bounds = {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
};

function occupiedBounds(
  grid: (BlockType | null)[],
  width: number,
): Bounds | null {
  let minRow = Infinity;
  let maxRow = -1;
  let minCol = Infinity;
  let maxCol = -1;

  for (let index = 0; index < grid.length; index += 1) {
    if (grid[index] === null) continue;
    const row = Math.floor(index / width);
    const col = index % width;
    minRow = Math.min(minRow, row);
    maxRow = Math.max(maxRow, row);
    minCol = Math.min(minCol, col);
    maxCol = Math.max(maxCol, col);
  }

  if (maxRow < 0) return null;
  return { minRow, maxRow, minCol, maxCol };
}

function recipeDimensions(recipe: CraftingRecipe): { rows: number; cols: number } {
  return {
    rows: recipe.pattern.length,
    cols: Math.max(0, ...recipe.pattern.map((row) => row.length)),
  };
}

function recipeMatchesBounds(
  recipe: CraftingRecipe,
  grid: (BlockType | null)[],
  width: number,
  bounds: Bounds,
): boolean {
  const { rows, cols } = recipeDimensions(recipe);
  if (rows !== bounds.maxRow - bounds.minRow + 1) return false;
  if (cols !== bounds.maxCol - bounds.minCol + 1) return false;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const symbol = recipe.pattern[row]?.[col] ?? " ";
      const expected = symbol === " " ? null : recipe.legend[symbol] ?? null;
      const actual = grid[(bounds.minRow + row) * width + bounds.minCol + col];
      if (actual !== expected) return false;
    }
  }

  return true;
}

export function findMatchingRecipe(
  grid: (BlockType | null)[],
  width: number,
  recipes: CraftingRecipe[],
): CraftingRecipe | null {
  const bounds = occupiedBounds(grid, width);
  if (!bounds) return null;
  return recipes.find((recipe) => recipeMatchesBounds(recipe, grid, width, bounds)) ?? null;
}

export function interactWithCraftingSlot(
  state: CraftingGridState,
  slotIndex: number,
  rightClick: boolean,
): CraftingGridState {
  const interactionState: InventoryInteractionState = {
    inventory: state.grid,
    counts: state.counts,
    cursor: state.cursor,
  };
  const next = applySlotInteraction(interactionState, {
    slotIndex,
    rightClick,
    shiftClick: false,
  });

  return {
    grid: next?.inventory ?? [...state.grid],
    counts: next?.counts ?? [...state.counts],
    cursor: next?.cursor ?? state.cursor,
  };
}

function consumeIngredients(
  grid: (BlockType | null)[],
  counts: number[],
): Pick<CraftingGridState, "grid" | "counts"> {
  const nextGrid = [...grid];
  const nextCounts = [...counts];

  for (let index = 0; index < nextGrid.length; index += 1) {
    if (nextGrid[index] === null) continue;
    nextCounts[index] -= 1;
    if (nextCounts[index] <= 0) {
      nextGrid[index] = null;
      nextCounts[index] = 0;
    }
  }

  return { grid: nextGrid, counts: nextCounts };
}

function cursorWithCraftedOutput(
  cursor: CursorItem,
  result: CraftingRecipe["result"],
): CursorItem | null {
  if (!cursor) return { type: result.type, count: result.count };
  if (cursor.type !== result.type) return null;

  const maxStack = getBlockData(result.type)?.maxStack ?? 64;
  if (cursor.count + result.count > maxStack) return null;
  return { type: cursor.type, count: cursor.count + result.count };
}

export function craftIntoCursor(
  state: CraftingGridState,
  recipe: CraftingRecipe,
): { ok: boolean; state: CraftingGridState } {
  const nextCursor = cursorWithCraftedOutput(state.cursor, recipe.result);
  if (!nextCursor) return { ok: false, state };

  const consumed = consumeIngredients(state.grid, state.counts);
  return {
    ok: true,
    state: {
      ...consumed,
      cursor: nextCursor,
    },
  };
}

function addOutputAtomically(
  inventory: (BlockType | null)[],
  counts: number[],
  result: CraftingRecipe["result"],
): { inventory: (BlockType | null)[]; counts: number[] } | null {
  const nextInventory = [...inventory];
  const nextCounts = [...counts];
  const maxStack = getBlockData(result.type)?.maxStack ?? 64;
  let remaining = result.count;

  for (let index = 0; index < nextInventory.length && remaining > 0; index += 1) {
    if (nextInventory[index] !== result.type || nextCounts[index] >= maxStack) continue;
    const moved = Math.min(maxStack - nextCounts[index], remaining);
    nextCounts[index] += moved;
    remaining -= moved;
  }

  for (let index = 0; index < nextInventory.length && remaining > 0; index += 1) {
    if (nextInventory[index] !== null) continue;
    const moved = Math.min(maxStack, remaining);
    nextInventory[index] = result.type;
    nextCounts[index] = moved;
    remaining -= moved;
  }

  if (remaining > 0) return null;
  return { inventory: nextInventory, counts: nextCounts };
}

export function craftIntoInventory(
  state: CraftingGridState,
  inventory: (BlockType | null)[],
  inventoryCounts: number[],
  recipe: CraftingRecipe,
): {
  ok: boolean;
  crafting: CraftingGridState;
  inventory: (BlockType | null)[];
  inventoryCounts: number[];
} {
  const added = addOutputAtomically(inventory, inventoryCounts, recipe.result);
  if (!added) {
    return {
      ok: false,
      crafting: state,
      inventory,
      inventoryCounts,
    };
  }

  const consumed = consumeIngredients(state.grid, state.counts);
  return {
    ok: true,
    crafting: { ...consumed, cursor: state.cursor },
    inventory: added.inventory,
    inventoryCounts: added.counts,
  };
}
