import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureStarterTools, useGame } from '../lib/stores/useGame';
import { BlockType } from '../engine/blocks';

const empty = () =>
  useGame.setState({
    inventory: new Array(36).fill(null),
    inventoryCounts: new Array(36).fill(0),
    cursorItem: null,
  });

test('addToInventory fills stacks to 64 and reports what did not fit', () => {
  empty();
  assert.equal(useGame.getState().addToInventory(BlockType.WOOD_PLANK, 100), 0);
  const { inventory, inventoryCounts } = useGame.getState();
  assert.equal(inventory[0], BlockType.WOOD_PLANK);
  assert.equal(inventoryCounts[0], 64);
  assert.equal(inventoryCounts[1], 36);

  useGame.setState({ inventory: new Array(36).fill(BlockType.DIRT), inventoryCounts: new Array(36).fill(64) });
  assert.equal(useGame.getState().addToInventory(BlockType.STONE, 10), 10);
});

test('tools never stack', () => {
  empty();
  assert.equal(useGame.getState().addToInventory(BlockType.PICKAXE, 2), 0);
  const { inventory, inventoryCounts } = useGame.getState();
  assert.deepEqual(inventory.slice(0, 2), [BlockType.PICKAXE, BlockType.PICKAXE]);
  assert.deepEqual(inventoryCounts.slice(0, 2), [1, 1]);
});

test('moveInventoryItem merges up to the stack limit, then swaps different items', () => {
  empty();
  const game = useGame.getState();
  game.addToInventory(BlockType.WOOD_PLANK, 64); // slot 0 full
  useGame.setState((s) => {
    const inventory = [...s.inventory];
    const inventoryCounts = [...s.inventoryCounts];
    inventory[1] = BlockType.WOOD_PLANK;
    inventoryCounts[1] = 10;
    return { inventory, inventoryCounts };
  });

  assert.equal(useGame.getState().moveInventoryItem(1, 0, 10), 0, 'full stack accepts nothing');
  useGame.getState().removeFromInventory(0, 5);
  assert.equal(useGame.getState().moveInventoryItem(1, 0, 10), 5);
  assert.deepEqual(useGame.getState().inventoryCounts.slice(0, 2), [64, 5]);

  useGame.getState().addToInventory(BlockType.DIRT, 10); // slot 2
  useGame.getState().moveInventoryItem(1, 2);
  const { inventory, inventoryCounts } = useGame.getState();
  assert.equal(inventory[1], BlockType.DIRT);
  assert.equal(inventoryCounts[1], 10);
  assert.equal(inventory[2], BlockType.WOOD_PLANK);
  assert.equal(inventoryCounts[2], 5);
});

test('old saves without tools get the missing starter tools in free slots', () => {
  const slots = new Array(36).fill(null);
  const counts = new Array(36).fill(0);
  slots[0] = BlockType.DIRT; counts[0] = 12;
  slots[1] = BlockType.AXE; counts[1] = 1;
  const [next, nextCounts] = ensureStarterTools(slots, counts);
  assert.equal(next.filter((t) => t === BlockType.AXE).length, 1, 'existing axe not duplicated');
  for (const tool of [BlockType.PICKAXE, BlockType.SHOVEL, BlockType.SWORD]) {
    const i = next.indexOf(tool);
    assert.ok(i >= 0, BlockType[tool]);
    assert.equal(nextCounts[i], 1);
  }
  assert.equal(next[0], BlockType.DIRT);
  assert.equal(nextCounts[0], 12);
});

test('a full old save is left untouched', () => {
  const slots = new Array(36).fill(BlockType.DIRT);
  const counts = new Array(36).fill(64);
  const [next, nextCounts] = ensureStarterTools(slots, counts);
  assert.deepEqual(next, slots);
  assert.deepEqual(nextCounts, counts);
});
