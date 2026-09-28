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

test("stone needs a pickaxe: slow by hand, fast with one", () => {
  const hand = getBreakSeconds(BlockType.STONE, null);
  const pickaxe = getBreakSeconds(BlockType.STONE, heldTool(BlockType.PICKAXE));
  assert.ok(pickaxe < 1.5);
  assert.ok(hand > getBreakSeconds(BlockType.WOOD_LOG, null));
  assert.equal(getBreakSeconds(BlockType.STONE, heldTool(BlockType.AXE)), hand);
});

test("break times are never negative, and soft blocks are instant", () => {
  for (const value of Object.values(BlockType)) {
    if (typeof value !== "number") continue;
    assert.ok(getBreakSeconds(value, null) >= 0, BlockType[value]);
  }
  for (const soft of [BlockType.DIRT, BlockType.GRASS, BlockType.SAND, BlockType.LEAF]) {
    assert.equal(getBreakSeconds(soft, null), 0, BlockType[soft]);
  }
});

test("instant blocks still break only once per cooldown while held", () => {
  const state = idleMining();
  let breaks = 0;
  for (let i = 0; i < 60; i += 1) {
    const dirt = { key: `0,${60 - breaks},0`, blockType: BlockType.DIRT };
    if (stepMining(state, dirt, true, null, 1 / 60)) breaks += 1;
  }
  assert.equal(breaks, 4);
});

test("a block breaks exactly once when progress crosses the threshold", () => {
  const state = idleMining();
  const log = { key: "1,64,1", blockType: BlockType.WOOD_LOG };
  let breaks = 0;
  for (let i = 0; i < 40; i += 1) if (stepMining(state, log, true, null, 0.1)) breaks += 1;
  assert.equal(breaks, 1);
});

test("releasing the button or changing target resets progress", () => {
  const state = idleMining();
  const log = { key: "1,64,1", blockType: BlockType.WOOD_LOG };
  stepMining(state, log, true, null, 1);
  assert.ok(state.progress > 0);
  stepMining(state, log, false, null, 0.1);
  assert.equal(state.progress, 0);
  stepMining(state, log, true, null, 1);
  stepMining(state, { key: "1,65,1", blockType: BlockType.WOOD_LOG }, true, null, 0.1);
  assert.ok(state.progress < 0.1);
});

test("water can never be broken, however long it is held", () => {
  const state = idleMining();
  const water = { key: "0,60,0", blockType: BlockType.WATER };
  for (let i = 0; i < 100; i += 1) assert.equal(stepMining(state, water, true, heldTool(BlockType.SHOVEL), 0.1), false);
});
