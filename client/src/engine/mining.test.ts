// Timed mining: dirt instant, wood takes effort, stone slow by hand and fast
// with a pickaxe. Run with:
// npx tsx --test client/src/engine/mining.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { BlockType } from './blocks';
import { getBreakSeconds, heldTool, idleMining, stepMining, BREAK_COOLDOWN_SECONDS } from './mining';

test('soft blocks break instantly by hand', () => {
  for (const block of [BlockType.DIRT, BlockType.GRASS, BlockType.SAND, BlockType.LEAF]) {
    assert.equal(getBreakSeconds(block, null), 0, BlockType[block]);
  }
});

test('wood takes effort by hand and is faster with an axe', () => {
  assert.equal(getBreakSeconds(BlockType.WOOD_LOG, null), 3);
  assert.equal(getBreakSeconds(BlockType.WOOD_LOG, 'axe'), 1.5);
  assert.equal(getBreakSeconds(BlockType.WOOD_LOG, 'pickaxe'), 3);
});

test('stone is slow by hand and much faster with a pickaxe', () => {
  const hand = getBreakSeconds(BlockType.STONE, null);
  const pickaxe = getBreakSeconds(BlockType.STONE, 'pickaxe');
  assert.equal(hand, 7.5);
  assert.ok(pickaxe < 1.5);
  assert.ok(hand > getBreakSeconds(BlockType.WOOD_LOG, null));
});

test('water and air cannot be mined', () => {
  assert.equal(getBreakSeconds(BlockType.WATER, null), Infinity);
  assert.equal(getBreakSeconds(BlockType.AIR, null), Infinity);
});

test('holding breaks wood after 3 seconds, not before', () => {
  const state = idleMining();
  const target = { key: '1,64,1', blockType: BlockType.WOOD_LOG };
  let broke = false;
  for (let i = 0; i < 29; i += 1) broke ||= stepMining(state, target, true, null, 0.1);
  assert.equal(broke, false);
  assert.ok(state.progress > 0.9);
  assert.equal(stepMining(state, target, true, null, 0.11), true);
});

test('releasing the button or changing target resets progress', () => {
  const state = idleMining();
  const log = { key: '1,64,1', blockType: BlockType.WOOD_LOG };
  stepMining(state, log, true, null, 1);
  assert.ok(state.progress > 0);
  stepMining(state, log, false, null, 0.1);
  assert.equal(state.progress, 0);

  stepMining(state, log, true, null, 1);
  stepMining(state, { key: '1,65,1', blockType: BlockType.WOOD_LOG }, true, null, 0.1);
  assert.ok(state.progress < 0.1);
});

test('holding on dirt breaks one block per cooldown, not one per frame', () => {
  const state = idleMining();
  let breaks = 0;
  for (let i = 0; i < 60; i += 1) {
    const dirt = { key: `0,${60 - breaks},0`, blockType: BlockType.DIRT };
    if (stepMining(state, dirt, true, null, 1 / 60)) breaks += 1;
  }
  assert.equal(breaks, Math.floor(1 / BREAK_COOLDOWN_SECONDS));
});

test('starter tools speed up their blocks; swords and blocks count as bare hands', () => {
  assert.equal(heldTool(BlockType.PICKAXE), 'pickaxe');
  assert.equal(heldTool(BlockType.AXE), 'axe');
  assert.equal(heldTool(BlockType.SWORD), null);
  assert.equal(heldTool(BlockType.DIRT), null);
  assert.equal(heldTool(null), null);
  assert.ok(getBreakSeconds(BlockType.STONE, heldTool(BlockType.PICKAXE)) < 1.5);
  assert.equal(getBreakSeconds(BlockType.WOOD_LOG, heldTool(BlockType.AXE)), 1.5);
});
