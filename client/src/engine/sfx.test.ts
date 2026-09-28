// Block sound mapping and swing timing. Web Audio itself isn't available in
// Node, so playback is a silent no-op here. Run with:
// npx tsx --test client/src/engine/sfx.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { BlockType } from './blocks';
import { createHitTimer, HIT_INTERVAL_SECONDS, materialOf, playBreak } from './sfx';

test('blocks sound like their material', () => {
  assert.equal(materialOf(BlockType.WOOD_LOG), 'wood');
  assert.equal(materialOf(BlockType.STONE), 'stone');
  assert.equal(materialOf(BlockType.COBBLESTONE), 'stone');
  assert.equal(materialOf(BlockType.DIRT), 'dirt');
  assert.equal(materialOf(BlockType.SAND), 'sand');
  assert.equal(materialOf(BlockType.LEAF), 'grass');
  assert.equal(materialOf(BlockType.GLASS), 'glass');
});

test('unknown blocks fall back to a dirt sound', () => {
  assert.equal(materialOf(BlockType.APPLE), 'dirt');
});

test('holding plays a swing sound straight away, then every interval', () => {
  const due = createHitTimer();
  assert.equal(due(true, 0.016), true);
  assert.equal(due(true, HIT_INTERVAL_SECONDS / 2), false);
  assert.equal(due(true, HIT_INTERVAL_SECONDS / 2), true);
});

test('releasing resets the swing timer', () => {
  const due = createHitTimer();
  due(true, 0.016);
  assert.equal(due(false, 0.016), false);
  assert.equal(due(true, 0.016), true);
});

test('playback outside a browser is a silent no-op', () => {
  assert.doesNotThrow(() => playBreak(BlockType.STONE));
});
