import { BlockType } from "./blocks";

export const INVENTORY_SIZE = 36;
export const MAX_STACK = 64;
export type Stack = { type: BlockType; count: number } | null;

export function normaliseStack(stack: Stack): Stack {
  if (!stack || !Number.isInteger(stack.count) || stack.count <= 0) return null;
  return { type: stack.type, count: Math.min(MAX_STACK, stack.count) };
}

/** `maxStack` is this item's stack limit, e.g. 1 for tools. */
export function addItems(slots: Stack[], type: BlockType, requested: number, maxStack = MAX_STACK) {
  const limit = Math.max(1, Math.min(MAX_STACK, Math.floor(maxStack)));
  const next = slots.map(normaliseStack);
  let remaining = Number.isInteger(requested) && requested > 0 ? requested : 0;
  for (let i = 0; i < next.length && remaining; i++) {
    const s = next[i];
    if (s?.type === type && s.count < limit) {
      const n = Math.min(remaining, limit - s.count);
      s.count += n; remaining -= n;
    }
  }
  for (let i = 0; i < next.length && remaining; i++) {
    if (!next[i]) {
      const n = Math.min(remaining, limit);
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
