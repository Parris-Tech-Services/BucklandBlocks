import test from "node:test";
import assert from "node:assert/strict";
import {
  DROWN_DAMAGE,
  MAX_AIR,
  nextAir,
  shouldDrown,
} from "./breathing";

test("air drains only while the head is submerged", () => {
  assert.equal(nextAir(MAX_AIR, true), MAX_AIR - 1);
  assert.equal(nextAir(MAX_AIR, false), MAX_AIR);
});

test("air refills quickly after surfacing and stays bounded", () => {
  assert.equal(nextAir(5, false), 9);
  assert.equal(nextAir(MAX_AIR - 1, false), MAX_AIR);
});

test("drowning starts only when submerged with no air left", () => {
  assert.equal(shouldDrown(0, true), true);
  assert.equal(shouldDrown(1, true), false);
  assert.equal(shouldDrown(0, false), false);
  assert.equal(DROWN_DAMAGE, 2);
});
