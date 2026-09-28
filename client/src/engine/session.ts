import { create } from "zustand";

export type Menu = "pause" | "inventory" | "crafting" | "crafting_table" | null;

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
  return state.menu === null && state.pointerLocked;
};
