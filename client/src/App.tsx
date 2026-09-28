import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import World from "./engine/World";
import Player from "./engine/Player";
import DayNightCycle from "./engine/DayNightCycle";
import GameHUD from "./ui/GameHUD";
import Inventory from "./ui/Inventory";
import Crafting from "./ui/Crafting";
import PauseMenu from "./ui/PauseMenu";
import GameErrorBoundary from "./ui/GameErrorBoundary";
import HooksBridge from "./renderer/HooksBridge";
import { gameInput } from "./engine/input";
import { isGameplayActive, useSession } from "./engine/session";
import "@fontsource/inter";

function Game() {
  const menu = useSession((state) => state.menu);
  const error = useSession((state) => state.error);
  const setMenu = useSession((state) => state.setMenu);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const clear = () => gameInput.clear();
    const pause = () => {
      clear();
      setMenu("pause");
    };
    const editable = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.isContentEditable || !!target.closest("input, textarea, select"));

    const down = (event: KeyboardEvent) => {
      if (editable(event.target)) return;

      if (gameInput.key(event.code, true, isGameplayActive())) {
        event.preventDefault();
      }

      if (event.repeat) return;
      const current = useSession.getState().menu;

      if (event.code === "Escape") {
        event.preventDefault();
        pause();
      } else if (
        event.code === "KeyE" &&
        (isGameplayActive() || current === "inventory")
      ) {
        event.preventDefault();
        setMenu(current === "inventory" ? "pause" : "inventory");
      } else if (
        event.code === "KeyC" &&
        (isGameplayActive() || current === "crafting")
      ) {
        event.preventDefault();
        setMenu(current === "crafting" ? "pause" : "crafting");
      } else if (/^Digit[1-9]$/.test(event.code) && isGameplayActive()) {
        window.dispatchEvent(
          new CustomEvent("hotbarSelect", {
            detail: Number(event.code.slice(-1)) - 1,
          }),
        );
      }
    };

    const up = (event: KeyboardEvent) => {
      gameInput.key(event.code, false, false);
    };
    const mouseDown = (event: MouseEvent) => {
      const active = isGameplayActive();
      if (gameInput.mouse(event.button, true, active) && active) {
        event.preventDefault();
      }
    };
    const mouseUp = (event: MouseEvent) => {
      gameInput.mouse(event.button, false, false);
    };
    const context = (event: MouseEvent) => {
      if (isGameplayActive()) event.preventDefault();
    };
    const visibility = () => {
      if (document.hidden) pause();
    };
    const lock = () => {
      const locked = !!canvas && document.pointerLockElement === canvas;
      clear();
      useSession.setState({ pointerLocked: locked });
      if (locked) {
        setMenu(null);
      } else if (useSession.getState().menu === null) {
        pause();
      }
    };
    const lockError = () => {
      pause();
      useSession.setState({
        error: "Mouse capture failed. Click Resume to try again.",
      });
    };
    const lost = (event: Event) => {
      event.preventDefault();
      pause();
      setReady(false);
      useSession.setState({
        error:
          "Graphics connection lost. Reload to recover; unsaved changes may be lost.",
      });
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousedown", mouseDown);
    window.addEventListener("mouseup", mouseUp);
    window.addEventListener("contextmenu", context);
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("pointerlockchange", lock);
    document.addEventListener("pointerlockerror", lockError);
    canvas?.addEventListener("webglcontextlost", lost);

    return () => {
      clear();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousedown", mouseDown);
      window.removeEventListener("mouseup", mouseUp);
      window.removeEventListener("contextmenu", context);
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("pointerlockchange", lock);
      document.removeEventListener("pointerlockerror", lockError);
      canvas?.removeEventListener("webglcontextlost", lost);
    };
  }, [canvas, setMenu]);

  useEffect(
    () =>
      useSession.subscribe((state, previousState) => {
        // Only release pointer lock when a menu is actually opened from
        // gameplay. State updates while already paused (for example the
        // pointer-lock result itself) must not immediately unlock again.
        if (previousState.menu === null && state.menu !== null) {
          gameInput.clear();
          if (document.pointerLockElement) document.exitPointerLock();
        }
      }),
    [],
  );

  const resume = () => {
    if (!canvas || !ready) return;

    gameInput.clear();

    // Hide the pause menu before requesting pointer lock. Otherwise the
    // menu-open subscriber can treat the pointer-lock state update as a
    // reason to immediately release the lock again.
    useSession.setState({
      menu: null,
      pointerLocked: false,
      error: null,
    });

    try {
      const request = canvas.requestPointerLock();
      if (
        request &&
        typeof (request as PromiseLike<void>).then === "function"
      ) {
        void Promise.resolve(request)
          .then(() => {
            useSession.setState({
              menu: null,
              pointerLocked: true,
              error: null,
            });
          })
          .catch(() => {
            useSession.setState({
              menu: "pause",
              pointerLocked: false,
              error: "Mouse capture failed. Click Resume to try again.",
            });
          });
      }
    } catch {
      useSession.setState({
        menu: "pause",
        pointerLocked: false,
        error: "Mouse capture is unavailable in this browser.",
      });
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 70, 0], fov: 70, near: 0.1, far: 1000 }}
        gl={{
          antialias: true,
          stencil: false,
          depth: true,
          powerPreference: "high-performance",
          alpha: false,
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          setCanvas(gl.domElement);
          setReady(true);
        }}
      >
        <Suspense fallback={null}>
          <DayNightCycle />
          <World />
          <Player />
          <HooksBridge />
        </Suspense>
      </Canvas>

      <GameHUD />

      <div hidden={menu !== "inventory"}>
        <Inventory onClose={() => setMenu("pause")} />
      </div>
      <div hidden={menu !== "crafting"}>
        <Crafting onClose={() => setMenu("pause")} />
      </div>

      {menu === "pause" && (
        <PauseMenu onClose={resume} canResume={ready} />
      )}

      {error && (
        <p
          role="alert"
          className="fixed left-4 right-4 top-4 z-[60] bg-red-900 p-4 text-white"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default function App() {
  return (
    <GameErrorBoundary>
      <Game />
    </GameErrorBoundary>
  );
}
