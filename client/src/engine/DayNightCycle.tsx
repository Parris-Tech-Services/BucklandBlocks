import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGame } from "../lib/stores/useGame";
import * as THREE from "three";

const DayNightCycle: React.FC = () => {
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const gameTimeRef = useRef(useGame.getState().gameTime);
  const syncAccumulatorRef = useRef(0);

  useFrame((state, delta) => {
    const game = useGame.getState();

    if (game.gameplayActive) {
      gameTimeRef.current = (gameTimeRef.current + delta * 100) % 24000;
      syncAccumulatorRef.current += delta;

      if (syncAccumulatorRef.current >= 0.25) {
        const advance = (gameTimeRef.current - game.gameTime + 24000) % 24000;
        if (advance > 0) game.updateGameTime(advance);
        syncAccumulatorRef.current = 0;
      }
    }

    const timeOfDay = (gameTimeRef.current / 24000) * 24;
    const sunAngle = (timeOfDay / 24) * Math.PI * 2 - Math.PI / 2;
    const sunY = Math.sin(sunAngle) * 100;

    if (dirLightRef.current) {
      dirLightRef.current.position.set(Math.cos(sunAngle) * 100, Math.max(sunY, 10), 50);
      dirLightRef.current.intensity = sunY > 0 ? Math.max(0.2, Math.min(1, sunY / 100)) : 0.15;
    }

    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = sunY > 0 ? 0.45 : 0.12;
    }

    state.scene.background =
      sunY > 0
        ? new THREE.Color(0.53, 0.81, 0.92)
        : new THREE.Color(0.05, 0.05, 0.2);
  });

  return (
    <>
      <ambientLight ref={ambientLightRef} intensity={0.45} />
      <directionalLight
        ref={dirLightRef}
        position={[100, 100, 50]}
        intensity={1}
        castShadow={false}
      />
    </>
  );
};

export default DayNightCycle;
