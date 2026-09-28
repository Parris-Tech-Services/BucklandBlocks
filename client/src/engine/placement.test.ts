import test from "node:test";
import assert from "node:assert/strict";
import { BlockType } from "./blocks";
import { hasSolidSupport } from "./placement";

function world(blocks: Record<string, BlockType>) {
  return (x: number, y: number, z: number) => blocks[`${x},${y},${z}`] ?? BlockType.AIR;
}

test("water alone cannot support a placed block", () => {
  const getBlock = world({ "0,0,0": BlockType.WATER });
  assert.equal(hasSolidSupport(0, 1, 0, getBlock), false);
});

test("a neighboring solid block supports placement beside water", () => {
  const getBlock = world({ "0,0,0": BlockType.WATER, "1,1,0": BlockType.STONE });
  assert.equal(hasSolidSupport(0, 1, 0, getBlock), true);
});
