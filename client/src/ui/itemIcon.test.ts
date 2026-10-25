import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ItemIcon, { itemIconView } from "./ItemIcon";
import { BlockType, getBlockData } from "../engine/blocks";

test("items with a texture show their picture and name", () => {
  const view = itemIconView(BlockType.STICK, null);
  assert.deepEqual(view, { name: getBlockData(BlockType.STICK).name, image: getBlockData(BlockType.STICK).texture });
  const html = renderToStaticMarkup(createElement(ItemIcon, { type: BlockType.STICK, count: 3 }));
  assert.match(html, /<img[^>]+src="\.\/textures\/stick\.png"/);
  assert.match(html, new RegExp(getBlockData(BlockType.STICK).name));
  assert.match(html, />3</);
  assert.doesNotMatch(html, /item-text-fallback/);
});

test("a texture that failed to load falls back to the item's name", () => {
  const texture = getBlockData(BlockType.STICK).texture;
  assert.deepEqual(itemIconView(BlockType.STICK, texture), { name: getBlockData(BlockType.STICK).name, image: null });
});

test("a failed texture does not hide a different item later placed in the slot", () => {
  const failed = getBlockData(BlockType.STICK).texture;
  const view = itemIconView(BlockType.DIRT, failed);
  assert.equal(view?.image, getBlockData(BlockType.DIRT).texture);
});

test("empty slots and air render nothing", () => {
  assert.equal(itemIconView(BlockType.AIR, null), null);
  assert.equal(renderToStaticMarkup(createElement(ItemIcon, { type: BlockType.AIR })), "");
});
