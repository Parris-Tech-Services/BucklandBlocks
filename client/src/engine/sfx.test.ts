// Block sound mapping and swing timing. Web Audio itself isn't available in
// Node, so playback is a silent no-op here. Run with:
// npx tsx --test client/src/engine/sfx.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { BlockType } from './blocks';
import {
  createHitTimer,
  HIT_INTERVAL_SECONDS,
  isSfxMuted,
  materialOf,
  playBreak,
  readSoundEnabled,
  saveSoundEnabled,
  setSfxMuted,
  SOUND_PREFERENCE_KEY,
} from './sfx';

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


test('sound is on unless the player turned it off', () => {
  const store = new Map<string, string>();
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  assert.equal(readSoundEnabled(storage), true);
  saveSoundEnabled(false, storage);
  assert.equal(store.get(SOUND_PREFERENCE_KEY), 'off');
  assert.equal(readSoundEnabled(storage), false);
  saveSoundEnabled(true, storage);
  assert.equal(readSoundEnabled(storage), true);
});

test('blocked storage never breaks the game and defaults to sound on', () => {
  const broken = {
    getItem: () => { throw new Error('SecurityError'); },
    setItem: () => { throw new Error('QuotaExceeded'); },
  };
  assert.equal(readSoundEnabled(broken), true);
  assert.doesNotThrow(() => saveSoundEnabled(false, broken));
  assert.equal(readSoundEnabled(undefined), true);
});

test('muting is observable and reversible', () => {
  setSfxMuted(true);
  assert.equal(isSfxMuted(), true);
  setSfxMuted(false);
  assert.equal(isSfxMuted(), false);
});
