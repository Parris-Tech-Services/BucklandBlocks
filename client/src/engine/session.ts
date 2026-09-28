import { create } from "zustand";

export type Menu = "pause" | "inventory" | "crafting" | null;

interface Session {
  menu: Menu;
  pointerLocked: boolean;
  error: string | null;
  setMenu: (menu: Menu) => void;
}

export const useSession = create<Session>((set) => ({
  menu: "pause",
  pointerLocked: false,
  error: null,
  setMenu: (menu) => set({ menu }),
}));

export const isGameplayActive = () => {
  const state = useSession.getState();
  // Pointer lock improves mouse look, but some browsers and embedded
  // deployments do not grant it. Resume must still activate keyboard and
  // mouse gameplay in that fallback mode.
  return state.menu === null;
};
