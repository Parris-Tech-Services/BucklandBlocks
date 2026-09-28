import assert from "node:assert/strict";
import { test } from "node:test";
import { BlockType } from "./blocks";
import { HOTBAR_SIZE, quickMoveSlot } from "./inventory";

const empty = () => ({ items: new Array<BlockType | null>(36).fill(null), counts: new Array<number>(36).fill(0) });
const total = (items: (BlockType | null)[], counts: number[], type: BlockType) =>
  items.reduce((sum, item, i) => sum + (item === type ? counts[i] : 0), 0);

test("hotbar stack moves to the first empty main-inventory slot", () => {
  const { items, counts } = empty();
  items[0] = BlockType.DIRT; counts[0] = 20;
  const r = quickMoveSlot(items, counts, 0);
  assert.equal(r.moved, 20);
  assert.equal(r.items[0], null);
  assert.equal(r.items[HOTBAR_SIZE], BlockType.DIRT);
  assert.equal(r.counts[HOTBAR_SIZE], 20);
});

test("main-inventory stack moves back to the hotbar", () => {
  const { items, counts } = empty();
  items[20] = BlockType.SAND; counts[20] = 5;
  items[0] = BlockType.DIRT; counts[0] = 1;
  const r = quickMoveSlot(items, counts, 20);
  assert.equal(r.items[1], BlockType.SAND);
  assert.equal(r.items[20], null);
});

test("tops up matching stacks before using an empty slot, conserving items", () => {
  const { items, counts } = empty();
  items[0] = BlockType.DIRT; counts[0] = 30;
  items[12] = BlockType.DIRT; counts[12] = 50;
  const r = quickMoveSlot(items, counts, 0);
  assert.equal(r.counts[12], 64);
  assert.equal(r.items[HOTBAR_SIZE], BlockType.DIRT);
  assert.equal(r.counts[HOTBAR_SIZE], 16);
  assert.equal(total(r.items, r.counts, BlockType.DIRT), 80);
});

test("what doesn't fit stays in the source slot", () => {
  const { items, counts } = empty();
  for (let i = HOTBAR_SIZE; i < 36; i += 1) { items[i] = BlockType.STONE; counts[i] = 64; }
  items[35] = BlockType.DIRT; counts[35] = 60;
  items[0] = BlockType.DIRT; counts[0] = 10;
  const r = quickMoveSlot(items, counts, 0);
  assert.equal(r.moved, 4);
  assert.equal(r.counts[0], 6);
  assert.equal(r.items[0], BlockType.DIRT);
  assert.equal(total(r.items, r.counts, BlockType.DIRT), 70);
});

test("respects per-item stack limits (tools stack to 1)", () => {
  const { items, counts } = empty();
  items[0] = BlockType.PICKAXE; counts[0] = 1;
  items[HOTBAR_SIZE] = BlockType.PICKAXE; counts[HOTBAR_SIZE] = 1;
  const r = quickMoveSlot(items, counts, 0, 1);
  assert.equal(r.counts[HOTBAR_SIZE], 1);
  assert.equal(r.items[HOTBAR_SIZE + 1], BlockType.PICKAXE);
});

test("an empty slot is a no-op and does not copy the arrays", () => {
  const { items, counts } = empty();
  const r = quickMoveSlot(items, counts, 3);
  assert.equal(r.moved, 0);
  assert.equal(r.items, items);
});
