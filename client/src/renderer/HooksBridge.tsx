import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGame } from "@/lib/stores/useGame";

export default function HooksBridge() {
  const { camera } = useThree();
  const accumulator = useRef(0);
  const frames = useRef(0);

  useFrame((_, delta) => {
    accumulator.current += delta;
    frames.current += 1;
    if (accumulator.current < 0.25) return;

    const elapsed = accumulator.current;
    const game = useGame.getState();
    game.setFps(frames.current / elapsed);
    game.setPlayerPosition(camera.position);
    game.setPlayerRotation({ x: camera.rotation.x, y: camera.rotation.y });
    accumulator.current = 0;
    frames.current = 0;
  });

  return null;
}
