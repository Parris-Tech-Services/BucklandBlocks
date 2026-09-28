const bindings = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "backward",
  ArrowDown: "backward",
  KeyA: "leftward",
  ArrowLeft: "leftward",
  KeyD: "rightward",
  ArrowRight: "rightward",
  Space: "jump",
  ShiftLeft: "sneak",
  ShiftRight: "sneak",
} as const;

type Action =
  | (typeof bindings)[keyof typeof bindings]
  | "mine"
  | "place";

type MouseAction = "mine" | "place";

export function createGameInput() {
  const held = new Set<string>();
  const pressed = new Set<MouseAction>();

  return {
    clear: () => {
      held.clear();
      pressed.clear();
    },

    key(code: string, down: boolean, active: boolean) {
      if (!(code in bindings)) return false;

      if (!down) {
        held.delete(code);
      } else if (active) {
        held.add(code);
      }

      return active;
    },

    mouse(button: number, down: boolean, active: boolean) {
      const action: MouseAction | null =
        button === 0 ? "mine" : button === 2 ? "place" : null;

      if (!action) return false;

      if (!down) {
        held.delete(action);
      } else if (active) {
        held.add(action);
        // Keep one discrete click queued until the game loop consumes it.
        // This prevents a quick down/up click between animation frames from
        // being lost before mining or placement can run.
        pressed.add(action);
      }

      return active;
    },

    hasMousePress(action: MouseAction) {
      return pressed.has(action);
    },

    consumeMousePress(action: MouseAction) {
      const hadPress = pressed.has(action);
      pressed.delete(action);
      return hadPress;
    },

    read(): Record<Action, boolean> {
      const result: Record<Action, boolean> = {
        forward: false,
        backward: false,
        leftward: false,
        rightward: false,
        jump: false,
        sneak: false,
        mine: held.has("mine"),
        place: held.has("place"),
      };

      held.forEach((code) => {
        const action = bindings[code as keyof typeof bindings];
        if (action) result[action] = true;
      });

      return result;
    },
  };
}

export const gameInput = createGameInput();
