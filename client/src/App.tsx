import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "./lib/stores/useGame";
import World from "./engine/World";
import Player from "./engine/Player";
import DayNightCycle from "./engine/DayNightCycle";
import GameHUD from "./ui/GameHUD";
import Inventory from "./ui/Inventory";
import Crafting from "./ui/Crafting";
import PauseMenu from "./ui/PauseMenu";
import HooksBridge from "./renderer/HooksBridge";
import "@fontsource/inter";

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

class GraphicsBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function GraphicsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-lg rounded-lg border border-slate-600 bg-slate-900 p-6 shadow-xl">
        <h1 className="text-2xl font-bold mb-3">Buckland Blocks couldn’t start 3D graphics</h1>
        <p className="text-slate-300 mb-3">{message}</p>
        <p className="text-sm text-slate-400 mb-5">
          Try reloading, closing other graphics-heavy tabs, or enabling hardware acceleration in your browser. Your saved world has not been deleted.
        </p>
        <button className="rounded bg-slate-700 hover:bg-slate-600 px-4 py-2" onClick={onRetry}>Retry</button>
      </div>
    </div>
  );
}

function App() {
  const menu = useGame((state) => state.menu);
  const setMenu = useGame((state) => state.setMenu);
  const setSelectedSlot = useGame((state) => state.setSelectedSlot);
  const [graphicsError, setGraphicsError] = useState<string | null>(() => supportsWebGL() ? null : "WebGL is unavailable in this browser session.");
  const [canvasKey, setCanvasKey] = useState(0);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      return Boolean(element?.closest("input, textarea, select, [contenteditable='true']"));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isTypingTarget(event.target)) return;
      if (event.code === "Escape") {
        event.preventDefault();
        setMenu(menu === "none" ? "pause" : "none");
        return;
      }
      if (event.code === "KeyE") {
        event.preventDefault();
        setMenu(menu === "inventory" ? "none" : "inventory");
        return;
      }
      if (event.code === "KeyC") {
        event.preventDefault();
        setMenu(menu === "crafting" ? "none" : "crafting");
        return;
      }
      if (menu === "none" && /^Digit[1-9]$/.test(event.code)) {
        setSelectedSlot(Number(event.code.slice(-1)) - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menu, setMenu, setSelectedSlot]);

  const canvas = useMemo(() => (
    <GraphicsBoundary onError={(error) => setGraphicsError(error.message || "The renderer failed to initialise.")}>
      <Canvas
        key={canvasKey}
        dpr={[1, 1.5]}
        shadows={false}
        camera={{ position: [0.5, 70, 0.5], fov: 70, near: 0.1, far: 260 }}
        gl={{ antialias: false, stencil: false, depth: true, powerPreference: "high-performance", alpha: false }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          const canvasElement = gl.domElement;
          canvasElement.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
            setGraphicsError("The browser lost the WebGL graphics context.");
          }, { once: true });
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
  ), [canvasKey]);

  if (graphicsError) {
    return (
      <GraphicsError
        message={graphicsError}
        onRetry={() => {
          if (!supportsWebGL()) {
            setGraphicsError("WebGL is still unavailable in this browser session.");
            return;
          }
          setGraphicsError(null);
          setCanvasKey((value) => value + 1);
        }}
      />
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }}>
      {canvas}
      <GameHUD />
      {menu === "inventory" && <Inventory />}
      {menu === "crafting" && <Crafting />}
      {menu === "pause" && <PauseMenu />}
    </div>
  );
}

export default App;
