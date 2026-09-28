import test from "node:test";
import assert from "node:assert/strict";
import { BlockType } from "./blocks";
import { getBreakSeconds, heldTool, idleMining, stepMining } from "./mining";

test("wood can be mined by hand and an axe makes it faster", () => {
  assert.equal(getBreakSeconds(BlockType.WOOD_LOG, null), 3);
  assert.equal(getBreakSeconds(BlockType.WOOD_LOG, "axe"), 1.5);
});

test("stone is slower by hand and water cannot be mined", () => {
  assert.equal(getBreakSeconds(BlockType.STONE, null), 7.5);
  assert.equal(getBreakSeconds(BlockType.WATER, null), Infinity);
});

test("holding a wooden block breaks it after its timed duration", () => {
  const state = idleMining();
  const target = { key: "1,64,1", blockType: BlockType.WOOD_LOG };
  for (let i = 0; i < 29; i += 1) assert.equal(stepMining(state, target, true, null, 0.1), false);
  assert.equal(stepMining(state, target, true, null, 0.11), true);
});

test("starter tools are recognized", () => {
  assert.equal(heldTool(BlockType.PICKAXE), "pickaxe");
  assert.equal(heldTool(BlockType.AXE), "axe");
  assert.equal(heldTool(BlockType.SHOVEL), "shovel");
  assert.equal(heldTool(BlockType.SWORD), null);
});
