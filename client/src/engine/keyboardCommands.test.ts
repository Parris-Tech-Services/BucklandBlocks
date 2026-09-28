import test from "node:test";
import assert from "node:assert/strict";
import { resolveKeyboardCommand } from "./keyboardCommands";

test("inventory and crafting shortcuts respect gameplay/menu state", () => {
  assert.deepEqual(resolveKeyboardCommand("KeyE", null, true, false), {
    type: "open-inventory",
  });
  assert.deepEqual(resolveKeyboardCommand("KeyE", "inventory", false, false), {
    type: "close-inventory",
  });
  assert.deepEqual(resolveKeyboardCommand("KeyC", null, true, false), {
    type: "open-crafting",
  });
  assert.deepEqual(resolveKeyboardCommand("KeyC", "crafting", false, false), {
    type: "close-crafting",
  });
  assert.equal(resolveKeyboardCommand("KeyE", "pause", false, false), null);
});

test("gameplay shortcuts map to deterministic commands", () => {
  assert.deepEqual(resolveKeyboardCommand("Digit4", null, true, false), {
    type: "select-hotbar",
    slot: 3,
  });
  assert.deepEqual(resolveKeyboardCommand("KeyQ", null, true, true), {
    type: "drop-selected",
    wholeStack: true,
  });
  assert.deepEqual(resolveKeyboardCommand("Equal", null, true, false), {
    type: "change-view-distance",
    delta: 1,
  });
  assert.deepEqual(resolveKeyboardCommand("NumpadSubtract", null, true, false), {
    type: "change-view-distance",
    delta: -1,
  });
});

test("global shortcuts remain available outside gameplay", () => {
  assert.deepEqual(resolveKeyboardCommand("Escape", "inventory", false, false), {
    type: "pause",
  });
  assert.deepEqual(resolveKeyboardCommand("F1", "pause", false, false), {
    type: "toggle-hud",
  });
  assert.equal(resolveKeyboardCommand("Digit1", "pause", false, false), null);
});
