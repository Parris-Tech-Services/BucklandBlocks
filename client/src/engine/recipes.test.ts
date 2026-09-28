import test from "node:test";
import assert from "node:assert/strict";
import { BlockType } from "./blocks";
import { parseRecipes, patternWidth, RECIPES } from "./recipes";

test("every shipped recipe is valid", () => {
  assert.ok(RECIPES.length >= 11);
  const ids = new Set(RECIPES.map((recipe) => recipe.id));
  assert.equal(ids.size, RECIPES.length, "recipe ids are unique");
});

test("tools are craftable from planks and sticks", () => {
  const pickaxe = RECIPES.find((recipe) => recipe.result.type === BlockType.PICKAXE);
  assert.ok(pickaxe);
  assert.deepEqual(pickaxe.pattern, ["PPP", " S ", " S "]);
  assert.equal(pickaxe.legend.P, BlockType.WOOD_PLANK);
  assert.equal(pickaxe.legend.S, BlockType.STICK);
  assert.equal(patternWidth(pickaxe), 3);
});

test("malformed recipes are rejected instead of crafting junk", () => {
  const good = { id: "x", result: { type: BlockType.STICK, count: 1 }, pattern: ["P"], legend: { P: BlockType.WOOD_PLANK } };
  assert.doesNotThrow(() => parseRecipes([good]));
  assert.throws(() => parseRecipes([{ ...good, result: { type: 999, count: 1 } }]), /invalid result/);
  assert.throws(() => parseRecipes([{ ...good, result: { type: BlockType.STICK, count: 0 } }]), /invalid result/);
  assert.throws(() => parseRecipes([{ ...good, pattern: ["Q"] }]), /undefined key Q/);
  assert.throws(() => parseRecipes([{ ...good, legend: { P: 999 } }]), /not a block/);
  assert.throws(() => parseRecipes({}), /array/);
});
