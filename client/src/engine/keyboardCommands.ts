import type { Menu } from "./session";

export type KeyboardCommand =
  | { type: "pause" }
  | { type: "open-inventory" }
  | { type: "close-inventory" }
  | { type: "open-crafting" }
  | { type: "close-crafting" }
  | { type: "select-hotbar"; slot: number }
  | { type: "drop-selected"; wholeStack: boolean }
  | { type: "toggle-hud" }
  | { type: "change-view-distance"; delta: 1 | -1 }
  | null;

export function resolveKeyboardCommand(
  code: string,
  currentMenu: Menu,
  gameplayActive: boolean,
  shiftKey: boolean,
): KeyboardCommand {
  if (code === "Escape") return { type: "pause" };

  if (code === "KeyE") {
    if (currentMenu === "inventory") return { type: "close-inventory" };
    if (gameplayActive) return { type: "open-inventory" };
    return null;
  }

  if (code === "KeyC") {
    if (currentMenu === "crafting") return { type: "close-crafting" };
    if (gameplayActive) return { type: "open-crafting" };
    return null;
  }

  const hotbarMatch = /^Digit([1-9])$/.exec(code);
  if (hotbarMatch && gameplayActive) {
    return { type: "select-hotbar", slot: Number(hotbarMatch[1]) - 1 };
  }

  if (code === "KeyQ" && gameplayActive) {
    return { type: "drop-selected", wholeStack: shiftKey };
  }

  if (code === "F1") return { type: "toggle-hud" };

  if ((code === "Equal" || code === "NumpadAdd") && gameplayActive) {
    return { type: "change-view-distance", delta: 1 };
  }

  if ((code === "Minus" || code === "NumpadSubtract") && gameplayActive) {
    return { type: "change-view-distance", delta: -1 };
  }

  return null;
}


export interface KeyboardCommandActions {
  pause: () => void;
  openInventory: () => void;
  closeInventory: () => void;
  openCrafting: () => void;
  closeCrafting: () => void;
  selectHotbar: (slot: number) => void;
  dropSelected: (wholeStack: boolean) => void;
  toggleHud: () => void;
  changeViewDistance: (delta: 1 | -1) => void;
}

export function executeKeyboardCommand(
  command: Exclude<KeyboardCommand, null>,
  actions: KeyboardCommandActions,
): void {
  switch (command.type) {
    case "pause":
      actions.pause();
      return;
    case "open-inventory":
      actions.openInventory();
      return;
    case "close-inventory":
      actions.closeInventory();
      return;
    case "open-crafting":
      actions.openCrafting();
      return;
    case "close-crafting":
      actions.closeCrafting();
      return;
    case "select-hotbar":
      actions.selectHotbar(command.slot);
      return;
    case "drop-selected":
      actions.dropSelected(command.wholeStack);
      return;
    case "toggle-hud":
      actions.toggleHud();
      return;
    case "change-view-distance":
      actions.changeViewDistance(command.delta);
  }
}
