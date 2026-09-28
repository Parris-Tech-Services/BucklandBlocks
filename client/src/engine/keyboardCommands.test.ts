import test from "node:test";
import assert from "node:assert/strict";
import { executeKeyboardCommand, resolveKeyboardCommand } from "./keyboardCommands";

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


test("command execution delegates one explicit side effect", () => {
  const calls: string[] = [];
  const actions = {
    pause: () => calls.push("pause"),
    openInventory: () => calls.push("open-inventory"),
    closeInventory: () => calls.push("close-inventory"),
    openCrafting: () => calls.push("open-crafting"),
    closeCrafting: () => calls.push("close-crafting"),
    selectHotbar: (slot: number) => calls.push(`hotbar:${slot}`),
    dropSelected: (wholeStack: boolean) => calls.push(`drop:${wholeStack}`),
    toggleHud: () => calls.push("hud"),
    changeViewDistance: (delta: 1 | -1) => calls.push(`view:${delta}`),
  };

  executeKeyboardCommand({ type: "pause" }, actions);
  executeKeyboardCommand({ type: "open-inventory" }, actions);
  executeKeyboardCommand({ type: "close-inventory" }, actions);
  executeKeyboardCommand({ type: "open-crafting" }, actions);
  executeKeyboardCommand({ type: "close-crafting" }, actions);
  executeKeyboardCommand({ type: "select-hotbar", slot: 4 }, actions);
  executeKeyboardCommand({ type: "drop-selected", wholeStack: true }, actions);
  executeKeyboardCommand({ type: "toggle-hud" }, actions);
  executeKeyboardCommand({ type: "change-view-distance", delta: -1 }, actions);

  assert.deepEqual(calls, [
    "pause",
    "open-inventory",
    "close-inventory",
    "open-crafting",
    "close-crafting",
    "hotbar:4",
    "drop:true",
    "hud",
    "view:-1",
  ]);
});
