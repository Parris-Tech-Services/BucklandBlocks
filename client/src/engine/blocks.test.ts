import test from "node:test";
import assert from "node:assert/strict";
import { BlockType, getBlockData, getBlockDrops } from "./blocks";

test("water is not a mineable resource", () => {
  assert.equal(getBlockDrops(BlockType.WATER).length, 0);
  assert.equal(getBlockData(BlockType.WATER).liquid, true);
});

test("starter tools have the correct mining roles", () => {
  assert.equal(getBlockData(BlockType.PICKAXE).toolType, "pickaxe");
  assert.equal(getBlockData(BlockType.AXE).toolType, "axe");
  assert.equal(getBlockData(BlockType.SHOVEL).toolType, "shovel");
  assert.equal(getBlockData(BlockType.STONE).toolRequired, "pickaxe");
  assert.equal(getBlockData(BlockType.WOOD_LOG).toolRequired, undefined);
  assert.equal(getBlockData(BlockType.WOOD_PLANK).toolRequired, undefined);
  assert.equal(getBlockData(BlockType.SAND).toolRequired, "shovel");
});
