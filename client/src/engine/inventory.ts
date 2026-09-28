import { BlockType } from "./blocks";

export const INVENTORY_SIZE = 36;
export const MAX_STACK = 64;
export type Stack = { type: BlockType; count: number } | null;

export function normaliseStack(stack: Stack): Stack {
  if (!stack || !Number.isInteger(stack.count) || stack.count <= 0) return null;
  return { type: stack.type, count: Math.min(MAX_STACK, stack.count) };
}

export function addItems(slots: Stack[], type: BlockType, requested: number) {
  const next = slots.map(normaliseStack);
  let remaining = Number.isInteger(requested) && requested > 0 ? requested : 0;
  for (let i = 0; i < next.length && remaining; i++) {
    const s = next[i];
    if (s?.type === type && s.count < MAX_STACK) {
      const n = Math.min(remaining, MAX_STACK - s.count);
      s.count += n; remaining -= n;
    }
  }
  for (let i = 0; i < next.length && remaining; i++) {
    if (!next[i]) {
      const n = Math.min(remaining, MAX_STACK);
      next[i] = { type, count: n }; remaining -= n;
    }
  }
  return { slots: next, accepted: requested - remaining, remainder: remaining };
}

export function moveStack(slots: Stack[], from: number, to: number, amount?: number) {
  const next = slots.map(normaliseStack);
  if (from === to || !next[from] || to < 0 || to >= next.length || from < 0 || from >= next.length) {
    return { slots: next, moved: 0 };
  }
  const source = next[from]!;
  const requested = amount === undefined ? source.count : Math.max(0, Math.min(source.count, Math.floor(amount)));
  if (!requested) return { slots: next, moved: 0 };
  const target = next[to];
  if (!target) {
    next[to] = { type: source.type, count: requested };
  } else if (target.type === source.type) {
    const moved = Math.min(requested, MAX_STACK - target.count);
    target.count += moved;
    source.count -= moved;
    if (source.count === 0) next[from] = null;
    return { slots: next, moved };
  } else if (requested === source.count) {
    next[to] = source;
    next[from] = target;
    return { slots: next, moved: requested };
  } else return { slots: next, moved: 0 };
  source.count -= requested;
  if (source.count === 0) next[from] = null;
  return { slots: next, moved: requested };
}

export type Recipe = { result: Stack; pattern: (BlockType | null)[] };

export function matchRecipe(grid: Stack[], recipes: Recipe[]) {
  const ids = grid.map(s => s?.type ?? null);
  return recipes.find(r => r.pattern.length === ids.length && r.pattern.every((id, i) => id === ids[i])) ?? null;
}

export function craftAtomic(slots: Stack[], grid: Stack[], recipes: Recipe[]) {
  const recipe = matchRecipe(grid, recipes);
  if (!recipe || !recipe.result) return { ok: false, slots, grid, remainder: recipe?.result ?? null };
  const nextGrid = grid.map(normaliseStack);
  const nextSlots = slots.map(normaliseStack);
  for (let i = 0; i < nextGrid.length; i++) {
    const required = recipe.pattern[i];
    if (required !== null) {
      if (!nextGrid[i] || nextGrid[i]!.type !== required || nextGrid[i]!.count < 1) return { ok: false, slots, grid, remainder: null };
      nextGrid[i]!.count--;
      if (!nextGrid[i]!.count) nextGrid[i] = null;
    }
  }
  const added = addItems(nextSlots, recipe.result.type, recipe.result.count);
  if (added.remainder) return { ok: false, slots, grid, remainder: null };
  return { ok: true, slots: added.slots, grid: nextGrid, remainder: null };
}

export const HOTBAR_SIZE = 9;

/**
 * Shift-click quick move: sends a stack from the hotbar to the main inventory
 * or back. Matching stacks are topped up first, then the first empty slot
 * takes the rest; anything that doesn't fit stays where it was. Works on the
 * parallel item/count arrays the store keeps, and returns new arrays.
 */
export function quickMoveSlot(
  items: (BlockType | null)[],
  counts: number[],
  from: number,
  maxStack = MAX_STACK,
): { items: (BlockType | null)[]; counts: number[]; moved: number } {
  const type = items[from];
  const available = counts[from] ?? 0;
  if (type === null || type === undefined || available <= 0) return { items, counts, moved: 0 };

  const nextItems = [...items];
  const nextCounts = [...counts];
  const [start, end] = from < HOTBAR_SIZE ? [HOTBAR_SIZE, nextItems.length] : [0, HOTBAR_SIZE];
  let remaining = available;

  for (let i = start; i < end && remaining > 0; i += 1) {
    if (nextItems[i] !== type || nextCounts[i] >= maxStack) continue;
    const added = Math.min(maxStack - nextCounts[i], remaining);
    nextCounts[i] += added;
    remaining -= added;
  }
  for (let i = start; i < end && remaining > 0; i += 1) {
    if (nextItems[i] !== null) continue;
    const added = Math.min(maxStack, remaining);
    nextItems[i] = type;
    nextCounts[i] = added;
    remaining -= added;
  }

  nextCounts[from] = remaining;
  if (remaining === 0) nextItems[from] = null;
  return { items: nextItems, counts: nextCounts, moved: available - remaining };
}
