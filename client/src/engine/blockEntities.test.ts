import test from "node:test";
import assert from "node:assert/strict";
import { BlockType } from "./blocks";
import { blockEntityContents, blockEntityKey, interactionMenuFor, newBlockEntity, resolveRightClick } from "./blockEntities";

test("crafting tables and furnaces open their screens; other blocks do not", () => {
  assert.equal(interactionMenuFor(BlockType.CRAFTING_TABLE), "crafting_table");
  assert.equal(interactionMenuFor(BlockType.FURNACE), "furnace");
  for (const block of [BlockType.DIRT, BlockType.STONE, BlockType.CHEST, BlockType.WATER]) {
    assert.equal(interactionMenuFor(block), null, BlockType[block]);
  }
});

test("entity keys use the block's integer position, including negatives", () => {
  assert.equal(blockEntityKey(3.7, 64.2, -0.5), "3,64,-1");
  assert.equal(blockEntityKey(-2, 0, 5), "-2,0,5");
});

test("a new entity starts empty", () => {
  const entity = newBlockEntity("1,2,3", BlockType.FURNACE);
  assert.deepEqual(entity, { id: "1,2,3", type: BlockType.FURNACE, inventory: [null, null, null], counts: [0, 0, 0], progress: 0 });
  assert.deepEqual(blockEntityContents(entity), []);
});

test("breaking a furnace hands back exactly what was inside it", () => {
  const entity = newBlockEntity("0,0,0", BlockType.FURNACE);
  entity.inventory = [BlockType.SAND, BlockType.WOOD_PLANK, BlockType.GLASS];
  entity.counts = [5, 2, 3];
  assert.deepEqual(blockEntityContents(entity), [
    { type: BlockType.SAND, count: 5 },
    { type: BlockType.WOOD_PLANK, count: 2 },
    { type: BlockType.GLASS, count: 3 },
  ]);
  entity.counts = [0, 2, 0];
  assert.deepEqual(blockEntityContents(entity), [{ type: BlockType.WOOD_PLANK, count: 2 }]);
  assert.deepEqual(blockEntityContents(undefined), []);
});


test("right-click opens a crafting table without creating an entity", () => {
  assert.deepEqual(resolveRightClick({ blockType: BlockType.CRAFTING_TABLE, x: 1, y: 64, z: -2 }, () => false), {
    kind: "open", menu: "crafting_table", entityKey: "1,64,-2", createEntity: false,
  });
});

test("right-click opens a furnace, creating its entity only when missing", () => {
  const target = { blockType: BlockType.FURNACE, x: 0, y: 70, z: 0 };
  assert.deepEqual(resolveRightClick(target, () => false), { kind: "open", menu: "furnace", entityKey: "0,70,0", createEntity: true });
  assert.deepEqual(resolveRightClick(target, (key) => key === "0,70,0"), { kind: "open", menu: "furnace", entityKey: "0,70,0", createEntity: false });
});

test("right-click on an ordinary block places; with no target it does nothing", () => {
  assert.deepEqual(resolveRightClick({ blockType: BlockType.DIRT, x: 0, y: 0, z: 0 }, () => false), { kind: "place" });
  assert.deepEqual(resolveRightClick(null, () => false), { kind: "none" });
});
