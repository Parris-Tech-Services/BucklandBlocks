import test from "node:test";
import assert from "node:assert/strict";
import { getFallDamage } from "./physics";

test("short falls do not cause damage", () => {
  assert.equal(getFallDamage(3, false), 0);
});

test("hard landings cause increasing fall damage", () => {
  assert.equal(getFallDamage(4, false), 1);
  assert.equal(getFallDamage(9, false), 4);
});

test("landing in water prevents fall damage", () => {
  assert.equal(getFallDamage(30, true), 0);
});
