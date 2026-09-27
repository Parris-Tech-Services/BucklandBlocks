import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGame } from "@/lib/stores/useGame";

// The store's playerPosition/playerRotation/fps fields only feed UI (HUD text,
// pause menu, save-on-demand) — nothing needs them at render framerate.
// Writing to the zustand store every frame forces every un-selective store
// subscriber (including the whole chunk tree) to re-render 60x/sec, which is
// what was collapsing the game to single-digit FPS. Throttle these writes to
// a UI-appropriate rate instead.
const HUD_UPDATE_INTERVAL = 0.1; // seconds (10Hz)

export default function HooksBridge() {
  const { camera } = useThree();
  const setFps = useGame((s) => s.setFps);
  const setPlayerPosition = useGame((s) => s.setPlayerPosition);
  const setPlayerRotation = useGame((s) => s.setPlayerRotation);
  const accumulatorRef = useRef(0);

  useFrame((_, delta) => {
    accumulatorRef.current += delta;
    if (accumulatorRef.current < HUD_UPDATE_INTERVAL) return;
    accumulatorRef.current = 0;

    setFps(1 / Math.max(delta, 1e-6));
    setPlayerPosition(camera.position.clone());
    setPlayerRotation({ x: camera.rotation.x, y: camera.rotation.y });
  });
  return null;
}
