const bindings = {
  KeyW: 'forward', ArrowUp: 'forward', KeyS: 'backward', ArrowDown: 'backward',
  KeyA: 'leftward', ArrowLeft: 'leftward', KeyD: 'rightward', ArrowRight: 'rightward',
  Space: 'jump', ShiftLeft: 'sneak', ShiftRight: 'sneak',
} as const;
type Action = typeof bindings[keyof typeof bindings] | 'mine' | 'place';

// Track physical keys so releasing one of two equivalent keys does not stop the other.
export function createGameInput() {
  const held = new Set<string>();
  return {
    clear: () => held.clear(),
    key(code: string, down: boolean, active: boolean) {
      if (!(code in bindings)) return false;
      if (!down) held.delete(code);
      else if (active) held.add(code);
      return active;
    },
    mouse(button: number, down: boolean, active: boolean) {
      const key = button === 0 ? 'mine' : button === 2 ? 'place' : null;
      if (!key) return;
      if (!down) held.delete(key);
      else if (active) held.add(key);
    },
    read(): Record<Action, boolean> {
      const result = { forward: false, backward: false, leftward: false, rightward: false,
        jump: false, sneak: false, mine: held.has('mine'), place: held.has('place') };
      held.forEach((code) => {
        const action = bindings[code as keyof typeof bindings];
        if (action) result[action] = true;
      });
      return result;
    },
  };
}
export const gameInput = createGameInput();

