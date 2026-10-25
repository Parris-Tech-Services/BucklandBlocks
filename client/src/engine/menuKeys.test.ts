import test from "node:test";
import assert from "node:assert/strict";
import { menuKeyAction } from "./menuKeys";

test("E and C open their screens from gameplay", () => {
  assert.deepEqual(menuKeyAction("KeyE", null, true), { kind: "open", menu: "inventory" });
  assert.deepEqual(menuKeyAction("KeyC", null, true), { kind: "open", menu: "crafting" });
});

test("pressing the same key again closes back to gameplay, not the pause menu", () => {
  assert.deepEqual(menuKeyAction("KeyE", "inventory", false), { kind: "close" });
  assert.deepEqual(menuKeyAction("KeyC", "crafting", false), { kind: "close" });
});

test("toggle keys do nothing from other menus or unrelated keys", () => {
  assert.equal(menuKeyAction("KeyC", "pause", false), null);
  assert.equal(menuKeyAction("KeyE", "crafting", false), null);
  assert.equal(menuKeyAction("KeyW", null, true), null);
});
