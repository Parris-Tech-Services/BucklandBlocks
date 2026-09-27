import React, { Component, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import World from "./engine/World";
import Player from "./engine/Player";
import DayNightCycle from "./engine/DayNightCycle";
import GameHUD from "./ui/GameHUD";
import Inventory from "./ui/Inventory";
import Crafting from "./ui/Crafting";
import PauseMenu from "./ui/PauseMenu";
import HooksBridge from "@/renderer/HooksBridge";
import { clearGameplayInput, isTextInputTarget, requestGameplayPointerLock, releaseGameplayPointerLock } from "./lib/input/gameInput";
import { useGame } from "./lib/stores/useGame";
import "@fontsource/inter";

export enum Controls {
  forward = "forward",
  backward = "backward",
  leftward = "leftward",
  rightward = "rightward",
  jump = "jump",
  sneak = "sneak",
  mine = "mine",
  place = "place",
}

const controls = [
  { name: Controls.forward, keys: ["KeyW", "ArrowUp"] },
  { name: Controls.backward, keys: ["KeyS", "ArrowDown"] },
  { name: Controls.leftward, keys: ["KeyA", "ArrowLeft"] },
  { name: Controls.rightward, keys: ["KeyD", "ArrowRight"] },
  { name: Controls.jump, keys: ["Space"] },
  { name: Controls.sneak, keys: ["ShiftLeft", "ShiftRight"] },
];

interface CanvasBoundaryProps { children: React.ReactNode; onFailure: (message: string) => void; }
interface CanvasBoundaryState { failed: boolean; }

class CanvasErrorBoundary extends Component<CanvasBoundaryProps, CanvasBoundaryState> {
  state: CanvasBoundaryState = { failed: false };

  static getDerivedStateFromError(): CanvasBoundaryState { return { failed: true }; }

  componentDidCatch(error: Error): void {
    this.props.onFailure(error.message || "The graphics renderer could not start.");
  }

  render(): React.ReactNode { return this.state.failed ? null : this.props.children; }
}

function canCreateWebGLContext(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!context) return false;
    const loseContext = context.getExtension("WEBGL_lose_context");
    loseContext?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function GraphicsRecoveryMonitor({ onLost, onRestored }: { onLost: () => void; onRestored: () => void }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const setCanvas = useCallback((element: HTMLCanvasElement | null) => { canvas.current = element; }, []);
  // Canvas is obtained from the renderer through a callback supplied by App.
  return null;
}

function App() {
  const menu = useGame((state) => state.menu);
  const setMenu = useGame((state) => state.setMenu);
  const setSelectedSlot = useGame((state) => state.setSelectedSlot);
  const setGraphicsStatus = useGame((state) => state.setGraphicsStatus);
  const graphicsStatus = useGame((state) => state.graphicsStatus);
  const graphicsError = useGame((state) => state.graphicsError);
  const rootRef = useRef<HTMLDivElement>(null);
  const lockedRef = useRef(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const [inputNotice, setInputNotice] = useState("");
  const [showCanvas, setShowCanvas] = useState(false);

  useEffect(() => setShowCanvas(true), []);

  const resume = useCallback(() => {
    clearGameplayInput();
    const canvas = rootRef.current?.querySelector("canvas") ?? null;
    const lockAttempt = canvas ? requestGameplayPointerLock(canvas) : Promise.resolve(false);
    setMenu("none");
    void lockAttempt.then((locked) => {
      if (!locked) setInputNotice("Pointer lock was unavailable. Keyboard controls still work; move the pointer over the game to look around.");
      else setInputNotice("");
    });
  }, [setMenu]);

  const retryGraphics = useCallback(() => {
    setGraphicsStatus("starting", null);
    setCanvasKey((key) => key + 1);
  }, [setGraphicsStatus]);

  useEffect(() => {
    if (!showCanvas) return;
    if (!canCreateWebGLContext()) {
      setGraphicsStatus("failed", "This browser could not create a WebGL graphics context. Check browser graphics settings, update the browser or graphics driver, then retry.");
      return;
    }
    setGraphicsStatus("starting", null);
  }, [showCanvas, canvasKey, setGraphicsStatus]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isTextInputTarget(event.target)) return;
      const currentMenu = useGame.getState().menu;

      if (event.code === "Escape") {
        event.preventDefault();
        if (currentMenu === "none") setMenu("pause");
        else if (currentMenu === "pause") resume();
        else if (currentMenu === "inventory" || currentMenu === "crafting") setMenu("pause");
        return;
      }
      if (currentMenu === "none") {
        if (event.code === "KeyE") setMenu("inventory");
        else if (event.code === "KeyC") setMenu("crafting");
        else if (/^Digit[1-9]$/.test(event.code)) setSelectedSlot(Number(event.code.slice(-1)) - 1);
      } else if (currentMenu === "inventory" && event.code === "KeyE") {
        setMenu("none");
      } else if (currentMenu === "crafting" && event.code === "KeyC") {
        setMenu("none");
      }
    };

    const handlePointerLockChange = () => {
      const hasLock = document.pointerLockElement === rootRef.current?.querySelector("canvas");
      if (lockedRef.current && !hasLock && useGame.getState().gameplayActive) {
        clearGameplayInput();
        setMenu("pause");
      }
      lockedRef.current = hasLock;
    };
    const pauseForFocusLoss = () => {
      clearGameplayInput();
      if (useGame.getState().gameplayActive) setMenu("pause");
    };
    const handleVisibility = () => { if (document.visibilityState === "hidden") pauseForFocusLoss(); };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", pauseForFocusLoss);
    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", pauseForFocusLoss);
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
    };
  }, [resume, setMenu, setSelectedSlot]);

  useEffect(() => {
    if (menu !== "none") {
      clearGameplayInput();
      releaseGameplayPointerLock();
    }
  }, [menu]);

  const showGraphicsPanel = graphicsStatus === "failed" || graphicsStatus === "lost";

  return (
    <div ref={rootRef} className="relative h-screen w-screen overflow-hidden bg-slate-950">
      {showCanvas && graphicsStatus !== "failed" && (
        <CanvasErrorBoundary onFailure={(message) => setGraphicsStatus("failed", message)}>
          <KeyboardControls map={controls}>
            <Canvas
              key={canvasKey}
              shadows
              dpr={[1, 1.5]}
              camera={{ position: [0, 70, 0], fov: 70, near: 0.1, far: 1000 }}
              gl={{ antialias: true, stencil: false, depth: true, powerPreference: "high-performance", alpha: false }}
              onCreated={({ gl }) => {
                gl.shadowMap.enabled = true;
                gl.shadowMap.type = THREE.PCFSoftShadowMap;
                setGraphicsStatus("ready", null);
                const canvas = gl.domElement;
                canvas.addEventListener("webglcontextlost", (event) => {
                  event.preventDefault();
                  clearGameplayInput();
                  setGraphicsStatus("lost", "Graphics paused because the WebGL context was lost. Your saved world remains on this device. Retry graphics to continue.");
                });
                canvas.addEventListener("webglcontextrestored", () => setGraphicsStatus("ready", null));
              }}
            >
              <Suspense fallback={null}>
                <DayNightCycle />
                <World />
                <Player />
                <HooksBridge />
              </Suspense>
            </Canvas>
          </KeyboardControls>
        </CanvasErrorBoundary>
      )}

      {graphicsStatus === "ready" && <GameHUD />}
      <div className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2 text-center text-sm text-amber-100" aria-live="polite">{inputNotice}</div>

      {menu === "start" && !showGraphicsPanel && <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/65 p-4">
        <section className="w-full max-w-sm rounded-lg border border-slate-500 bg-slate-900 p-6 text-center text-white">
          <h1 className="mb-2 text-2xl font-bold">Buckland Blocks</h1>
          <p className="mb-5 text-sm text-slate-300">Explore and build. Use WASD to move, mouse to look, and Escape to pause.</p>
          <button onClick={resume} className="w-full rounded bg-emerald-700 px-4 py-3 font-semibold hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">Start Game</button>
        </section>
      </div>}
      {menu === "pause" && graphicsStatus === "ready" && <PauseMenu onResume={resume} />}
      {menu === "inventory" && graphicsStatus === "ready" && <Inventory onClose={() => setMenu("none")} />}
      <div style={{ display: menu === "crafting" && graphicsStatus === "ready" ? "contents" : "none" }}>
        <Crafting onClose={() => setMenu("none")} />
      </div>

      {showGraphicsPanel && <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950 p-4 text-white">
        <section role="alert" className="w-full max-w-lg rounded-lg border border-amber-400 bg-slate-900 p-6 shadow-xl">
          <h1 className="mb-3 text-xl font-bold">Graphics could not start</h1>
          <p className="mb-4 text-sm leading-6">{graphicsError ?? "The browser could not start the game renderer."}</p>
          <p className="mb-5 text-sm text-slate-300">This can happen when browser graphics are disabled, the graphics driver resets, or the browser cannot allocate a graphics context. Close other graphics heavy tabs, check browser hardware acceleration and graphics drivers, then retry.</p>
          <button onClick={retryGraphics} className="rounded bg-amber-700 px-4 py-2 font-semibold hover:bg-amber-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">Retry graphics</button>
        </section>
      </div>}
    </div>
  );
}

export default App;
