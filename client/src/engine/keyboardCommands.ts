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
