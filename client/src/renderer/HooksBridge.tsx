import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGame } from "@/lib/stores/useGame";

export default function HooksBridge() {
  const elapsedRef = useRef(0);
  const framesRef = useRef(0);

  useFrame((_, delta) => {
    elapsedRef.current += delta;
    framesRef.current += 1;

    if (elapsedRef.current >= 0.25) {
      const fps = framesRef.current / elapsedRef.current;
      useGame.getState().setFps(fps);
      elapsedRef.current = 0;
      framesRef.current = 0;
    }
  });

  return null;
}
