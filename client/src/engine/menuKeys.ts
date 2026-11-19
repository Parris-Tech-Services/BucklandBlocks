import type { Menu } from "./session";

// E toggles the inventory and C toggles the crafting screen. Pressing the key
// again closes that screen straight back into gameplay (never the pause menu).
const MENU_TOGGLE_KEYS: Record<string, "inventory" | "crafting"> = {
  KeyE: "inventory",
  KeyC: "crafting",
};

export type MenuKeyAction =
  | { kind: "open"; menu: "inventory" | "crafting" }
  | { kind: "close" }
  | null;

export function menuKeyAction(
  code: string,
  current: Menu,
  gameplayActive: boolean,
): MenuKeyAction {
  const target = MENU_TOGGLE_KEYS[code];
  if (!target) return null;
  if (current === target) return { kind: "close" };
  if (gameplayActive) return { kind: "open", menu: target };
  return null;
}
