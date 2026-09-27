import { Canvas } from "@react-three/fiber";
import React, { Component, ReactNode, Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import { useGame } from "./lib/stores/useGame";
import World from "./engine/World";
import Player from "./engine/Player";
import DayNightCycle from "./engine/DayNightCycle";
import GameHUD from "./ui/GameHUD";
import Inventory from "./ui/Inventory";
import Crafting from "./ui/Crafting";
import PauseMenu from "./ui/PauseMenu";
import HooksBridge from "@/renderer/HooksBridge";
import "@fontsource/inter";

interface GraphicsBoundaryProps {
  children: ReactNode;
}

interface GraphicsBoundaryState {
  error: Error | null;
}

class GraphicsBoundary extends Component<GraphicsBoundaryProps, GraphicsBoundaryState> {
  state: GraphicsBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): GraphicsBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Buckland Blocks graphics failure:", error);
  }

  render() {
    if (this.state.error) {
      return <GraphicsFailure message={this.state.error.message} />;
    }
    return this.props.children;
  }
}

const GraphicsFailure = ({ message }: { message: string }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-slate-950 p-6 text-white">
    <div className="w-full max-w-lg rounded-lg border border-slate-600 bg-slate-900 p-6 shadow-xl">
      <h1 className="mb-3 text-2xl font-bold">Buckland Blocks could not start graphics</h1>
      <p className="mb-3 text-slate-200">
        The browser could not create or keep a WebGL graphics context. Your saved world has not been deleted.
      </p>
      <p className="mb-5 break-words text-sm text-slate-400">{message}</p>
      <button
        className="rounded bg-slate-200 px-4 py-2 font-semibold text-slate-900 hover:bg-white"
        onClick={() => window.location.reload()}
      >
        Retry
      </button>
    </div>
  </div>
);

const canCreateWebGLContext = () => {
  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: false });
    return context !== null;
  } catch {
    return false;
  }
};

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
};

function App() {
  const activeMenu = useGame((state) => state.activeMenu);
  const setMenu = useGame((state) => state.setMenu);
  const toggleMenu = useGame((state) => state.toggleMenu);
  const setSelectedSlot = useGame((state) => state.setSelectedSlot);
  const [webglAvailable, setWebglAvailable] = useState(canCreateWebGLContext);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isTypingTarget(event.target)) return;

      if (event.code === "Escape") {
        event.preventDefault();
        if (activeMenu === "none") setMenu("pause");
        else setMenu("none");
        return;
      }

      if (event.code === "KeyE") {
        event.preventDefault();
        if (activeMenu === "none" || activeMenu === "inventory") toggleMenu("inventory");
        return;
      }

      if (event.code === "KeyC") {
        event.preventDefault();
        if (activeMenu === "none" || activeMenu === "crafting") toggleMenu("crafting");
        return;
      }

      if (activeMenu !== "none") return;

      if (/^Digit[1-9]$/.test(event.code)) {
        setSelectedSlot(Number(event.code.slice(-1)) - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeMenu, setMenu, setSelectedSlot, toggleMenu]);

  useEffect(() => {
    if (activeMenu !== "none" && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [activeMenu]);

  if (!webglAvailable) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950 p-6 text-white">
        <div className="w-full max-w-lg rounded-lg border border-slate-600 bg-slate-900 p-6 shadow-xl">
          <h1 className="mb-3 text-2xl font-bold">WebGL is unavailable</h1>
          <p className="mb-5 text-slate-200">
            Buckland Blocks needs WebGL. Try enabling hardware acceleration, updating your browser or graphics driver,
            then retry. This message does not mean your saved world is damaged.
          </p>
          <button
            className="rounded bg-slate-200 px-4 py-2 font-semibold text-slate-900 hover:bg-white"
            onClick={() => setWebglAvailable(canCreateWebGLContext())}
          >
            Retry graphics
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }}>
      <GraphicsBoundary>
        <Canvas
          dpr={1}
          camera={{
            position: [0.5, 70, 0.5],
            fov: 70,
            near: 0.1,
            far: 320,
          }}
          gl={{
            antialias: false,
            stencil: false,
            depth: true,
            powerPreference: "high-performance",
            alpha: false,
          }}
          onCreated={({ gl }) => {
            gl.shadowMap.enabled = false;
            gl.outputColorSpace = THREE.SRGBColorSpace;

            const handleContextLost = (event: Event) => {
              event.preventDefault();
              console.error("WebGL context lost");
            };
            gl.domElement.addEventListener("webglcontextlost", handleContextLost);
          }}
        >
          <Suspense fallback={null}>
            <DayNightCycle />
            <World />
            <Player />
            <HooksBridge />
          </Suspense>
        </Canvas>
      </GraphicsBoundary>

      <GameHUD />
      {activeMenu === "inventory" && <Inventory onClose={() => setMenu("none")} />}
      {activeMenu === "crafting" && <Crafting onClose={() => setMenu("none")} />}
      {activeMenu === "pause" && <PauseMenu onClose={() => setMenu("none")} />}
    </div>
  );
}

export default App;
