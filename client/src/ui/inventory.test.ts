import test from 'node:test';
import assert from 'node:assert';
import { useGame } from '../lib/stores/useGame';
import { BlockType } from '../engine/blocks';

test('inventory interactions', async (t) => {
  // Clear state before tests
  const state = useGame.getState();
  useGame.setState({
    inventory: new Array(36).fill(null),
    inventoryCounts: new Array(36).fill(0),
    cursorItem: null,
    craftingGrid: new Array(4).fill(null),
    craftingCounts: new Array(4).fill(0)
  });

  await t.test('addToInventory respects stack limits', () => {
    // block 5 has maxStack 64
    const remaining = useGame.getState().addToInventory(BlockType.WOOD_PLANK, 100);
    assert.strictEqual(remaining, 36);
    assert.strictEqual(useGame.getState().inventory[0], BlockType.WOOD_PLANK);
    assert.strictEqual(useGame.getState().inventoryCounts[0], 64);
  });

  await t.test('moveItem merges stacks', () => {
    // Give 10 in slot 1
    useGame.getState().addToInventory(BlockType.WOOD_PLANK, 10); // slot 1 will get this
    useGame.getState().moveItem(1, 0, 10); // move 10 to slot 0
    // But slot 0 is already at 64!
    assert.strictEqual(useGame.getState().inventoryCounts[0], 64);
    assert.strictEqual(useGame.getState().inventoryCounts[1], 10);
    
    // Let's take some out
    useGame.getState().removeFromInventory(0, 5);
    assert.strictEqual(useGame.getState().inventoryCounts[0], 59);
    
    useGame.getState().moveItem(1, 0, 10); 
    assert.strictEqual(useGame.getState().inventoryCounts[0], 64);
    assert.strictEqual(useGame.getState().inventoryCounts[1], 5);
  });

  await t.test('moveItem swaps different items', () => {
    useGame.getState().addToInventory(BlockType.DIRT, 10); // goes to slot 2
    assert.strictEqual(useGame.getState().inventory[2], BlockType.DIRT);
    
    useGame.getState().moveItem(1, 2); // swap slot 1 (5 wood) and 2 (10 dirt)
    assert.strictEqual(useGame.getState().inventory[1], BlockType.DIRT);
    assert.strictEqual(useGame.getState().inventoryCounts[1], 10);
    assert.strictEqual(useGame.getState().inventory[2], BlockType.WOOD_PLANK);
    assert.strictEqual(useGame.getState().inventoryCounts[2], 5);
  });

});
