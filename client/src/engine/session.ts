import { create } from "zustand";
import { clampViewDistance } from "./chunkStreaming";

export type Menu = "pause" | "death" | "inventory" | "crafting" | "crafting_table" | "furnace" | null;

interface Session {
  menu: Menu;
  pointerLocked: boolean;
  error: string | null;
  hudVisible: boolean;
  viewDistance: number;
  currentEntityId?: string;
  setMenu: (menu: Menu) => void;
  toggleHud: () => void;
  changeViewDistance: (delta: number) => void;
}

export const useSession = create<Session>((set) => ({
  menu: "pause",
  pointerLocked: false,
  error: null,
  hudVisible: true,
  viewDistance: 1,
  setMenu: (menu) => set({ menu }),
  toggleHud: () => set((state) => ({ hudVisible: !state.hudVisible })),
  changeViewDistance: (delta) =>
    set((state) => ({
      viewDistance: clampViewDistance(state.viewDistance + delta),
    })),
}));

export const isGameplayActive = () => {
  const state = useSession.getState();
  // Pointer lock improves mouse look, but some browsers and embedded
  // deployments do not grant it. Resume must still activate keyboard and
  // mouse gameplay in that fallback mode.
  return state.menu === null;
};
