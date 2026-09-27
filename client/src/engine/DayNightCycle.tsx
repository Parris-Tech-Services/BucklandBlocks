import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../lib/stores/useGame";

const DayNightCycle: React.FC = () => {
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const visualTimeRef = useRef(useGame.getState().gameTime);
  const syncAccumulatorRef = useRef(0);

  useFrame((state, delta) => {
    const game = useGame.getState();
    if (game.menu === "none") {
      visualTimeRef.current = (visualTimeRef.current + delta * 100) % 24000;
      syncAccumulatorRef.current += delta;
      if (syncAccumulatorRef.current >= 0.25) {
        game.updateGameTime(syncAccumulatorRef.current * 100);
        syncAccumulatorRef.current = 0;
      }
    }

    const timeOfDay = (visualTimeRef.current / 24000) * 24;
    const sunAngle = (timeOfDay / 24) * Math.PI * 2 - Math.PI / 2;
    const sunY = Math.sin(sunAngle) * 100;
    const sunX = Math.cos(sunAngle) * 100;

    if (dirLightRef.current) {
      dirLightRef.current.position.set(sunX, Math.max(sunY, 8), 50);
      dirLightRef.current.intensity = sunY > 0 ? Math.max(0.25, Math.min(1, sunY / 100)) : 0.12;
    }
    if (ambientLightRef.current) ambientLightRef.current.intensity = sunY > 0 ? 0.5 : 0.14;

    state.scene.background = sunY > 0
      ? new THREE.Color(0.53, 0.81, 0.92)
      : new THREE.Color(0.04, 0.05, 0.14);
  });

  return (
    <>
      <ambientLight ref={ambientLightRef} intensity={0.5} />
      <directionalLight ref={dirLightRef} position={[100, 100, 50]} intensity={1} castShadow={false} />
    </>
  );
};

export default DayNightCycle;
