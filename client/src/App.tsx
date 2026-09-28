import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import World from "./engine/World";
import DroppedItems from "./engine/DroppedItems";
import Player from "./engine/Player";
import DayNightCycle from "./engine/DayNightCycle";
import GameHUD from "./ui/GameHUD";
import Inventory from "./ui/Inventory";
import Crafting from "./ui/Crafting";
import CraftingTable from "./ui/CraftingTable";
import FurnaceUI from "./ui/FurnaceUI";
import PauseMenu from "./ui/PauseMenu";
import GameErrorBoundary from "./ui/GameErrorBoundary";
import HooksBridge from "./renderer/HooksBridge";
import { gameInput } from "./engine/input";
import { isGameplayActive, useSession } from "./engine/session";
import { useGame } from "./lib/stores/useGame";
import { cycleHotbarSlot } from "./engine/hotbar";
import {
  executeKeyboardCommand,
  resolveKeyboardCommand,
} from "./engine/keyboardCommands";
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

    const closeInventory = () => {
      const gameCanvas = document.querySelector("canvas");
      if (!gameCanvas) {
        setMenu("pause");
        return;
      }

      useSession.setState({ menu: null, error: null });
      try {
        gameCanvas.requestPointerLock();
      } catch {
        // Pointer lock is an enhancement. Gameplay remains usable without it.
      }
    };

    const keyboardActions = {
      pause,
      openInventory: () => setMenu("inventory"),
      closeInventory,
      openCrafting: () => setMenu("crafting"),
      closeCrafting: () => setMenu("pause"),
      selectHotbar: (slot: number) =>
        window.dispatchEvent(new CustomEvent("hotbarSelect", { detail: slot })),
      dropSelected: (wholeStack: boolean) =>
        useGame.getState().dropSelectedItem(wholeStack),
      toggleHud: () => useSession.getState().toggleHud(),
      changeViewDistance: (delta: 1 | -1) =>
        useSession.getState().changeViewDistance(delta),
    };

    const down = (event: KeyboardEvent) => {
      if (editable(event.target)) return;

      const active = isGameplayActive();
      if (gameInput.key(event.code, true, active)) {
        event.preventDefault();
      }
      if (event.repeat) return;

      const command = resolveKeyboardCommand(
        event.code,
        useSession.getState().menu,
        active,
        event.shiftKey,
      );
      if (!command) return;

      event.preventDefault();
      executeKeyboardCommand(command, keyboardActions);
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
    const wheel = (event: WheelEvent) => {
      if (!isGameplayActive() || event.deltaY === 0) return;
      event.preventDefault();
      const game = useGame.getState();
      game.setSelectedSlot(cycleHotbarSlot(game.selectedSlot, event.deltaY));
    };
    const visibility = () => {
      if (document.hidden) pause();
    };
    const lock = () => {
      const locked = !!canvas && document.pointerLockElement === canvas;
      const wasLocked = useSession.getState().pointerLocked;
      clear();
      useSession.setState({ pointerLocked: locked });
      if (locked) {
        setMenu(null);
      } else if (wasLocked && useSession.getState().menu === null) {
        pause();
      }
    };
    const lockError = () => {
      clear();
      useSession.setState({
        error: "Mouse capture is unavailable; continuing without captured mouse look.",
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
    window.addEventListener("wheel", wheel, { passive: false });
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
      window.removeEventListener("wheel", wheel);
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
        // Release pointer lock only when gameplay opens a menu. State updates
        // while already paused must not cancel a newly requested Resume lock.
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
    // Do not make pointer lock a prerequisite for starting the game. It is
    // unavailable in some browsers, embeds, and accessibility configurations.
    useSession.setState({ menu: null, pointerLocked: false, error: null });

    try {
      const request = canvas.requestPointerLock();
      if (request && typeof (request as PromiseLike<void>).then === "function") {
        void Promise.resolve(request)
          .then(() => {
            // Modern browsers resolve requestPointerLock() when capture has
            // been granted. Keep the event listener as the compatibility path
            // for browsers that return void from this API.
            useSession.setState({
              menu: null,
              pointerLocked: true,
              error: null,
            });
          })
          .catch(() => {
            useSession.setState({
              menu: null,
              pointerLocked: false,
              error: "Mouse capture is unavailable; continuing without captured mouse look.",
            });
          });
      }
    } catch {
      useSession.setState({
        menu: null,
        pointerLocked: false,
        error: "Mouse capture is unavailable; continuing without captured mouse look.",
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
          <DroppedItems />
          <Player />
          <HooksBridge />
        </Suspense>
      </Canvas>

      <GameHUD />

      <div hidden={menu !== "inventory"}>
        <Inventory
          onClose={resume}
          onOpenCrafting={() => setMenu("crafting")}
        />
      </div>
      <div hidden={menu !== "crafting"}>
        <Crafting onClose={resume} />
      </div>
      <div hidden={menu !== "crafting_table"}>
        <CraftingTable onClose={resume} />
      </div>
      <div hidden={menu !== "furnace"}>
        <FurnaceUI onClose={resume} />
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
