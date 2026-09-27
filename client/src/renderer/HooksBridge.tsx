import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGame } from "@/lib/stores/useGame";

const STORE_SYNC_INTERVAL_SECONDS = 0.25;

export default function HooksBridge() {
  const { camera } = useThree();
  const elapsedRef = useRef(0);
  const framesRef = useRef(0);

  useFrame((_, delta) => {
    elapsedRef.current += delta;
    framesRef.current += 1;

    if (elapsedRef.current < STORE_SYNC_INTERVAL_SECONDS) return;

    const elapsed = elapsedRef.current;
    const fps = framesRef.current / Math.max(elapsed, 1e-6);

    useGame.setState({
      fps,
      playerPosition: camera.position.clone(),
      playerRotation: {
        x: camera.rotation.x,
        y: camera.rotation.y,
      },
    });

    elapsedRef.current = 0;
    framesRef.current = 0;
  });

  return null;
}
