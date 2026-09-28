import { BlockType, BLOCKS } from "./blocks";
import { addItems, type Stack } from "./inventory";

export interface CraftIngredient {
  type: BlockType;
  count: number;
}

export interface CraftOutput {
  type: BlockType;
  count: number;
}

export function craftFromInventory(
  slots: Stack[],
  ingredients: CraftIngredient[],
  result: CraftOutput,
) {
  const fail = (error: string) => ({
    ok: false as const,
    slots,
    error,
  });

  if (
    !BLOCKS[result.type] ||
    result.type === BlockType.AIR ||
    !Number.isSafeInteger(result.count) ||
    result.count <= 0
  ) {
    return fail("Invalid crafting result. No items changed.");
  }

  if (
    slots.some(
      (stack) =>
        stack !== null &&
        (!BLOCKS[stack.type] ||
          stack.type === BlockType.AIR ||
          !Number.isSafeInteger(stack.count) ||
          stack.count <= 0),
    )
  ) {
    return fail("Invalid inventory. No items changed.");
  }

  if (
    ingredients.length === 0 ||
    ingredients.some(
      (ingredient) =>
        !BLOCKS[ingredient.type] ||
        ingredient.type === BlockType.AIR ||
        !Number.isSafeInteger(ingredient.count) ||
        ingredient.count <= 0,
    )
  ) {
    return fail("Invalid recipe. No items changed.");
  }

  const required = new Map<BlockType, number>();
  for (const ingredient of ingredients) {
    required.set(
      ingredient.type,
      (required.get(ingredient.type) ?? 0) + ingredient.count,
    );
  }

  for (const [type, needed] of required) {
    const available = slots.reduce(
      (total, stack) =>
        total + (stack?.type === type ? stack.count : 0),
      0,
    );
    if (available < needed) {
      return fail("Not enough ingredients.");
    }
  }

  const next = slots.map((stack) =>
    stack ? { ...stack } : null,
  );

  for (const [type, needed] of required) {
    let remaining = needed;
    for (let i = 0; i < next.length && remaining > 0; i += 1) {
      const stack = next[i];
      if (!stack || stack.type !== type) continue;

      const used = Math.min(stack.count, remaining);
      stack.count -= used;
      remaining -= used;
      if (stack.count === 0) next[i] = null;
    }
  }

  const output = addItems(next, result.type, result.count);
  if (output.remainder > 0) {
    return fail("Inventory full. No ingredients consumed.");
  }

  return {
    ok: true as const,
    slots: output.slots,
    error: "",
  };
}
