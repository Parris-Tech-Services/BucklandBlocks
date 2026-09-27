import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGame } from '../lib/stores/useGame';
import * as THREE from 'three';
import { isGameplayActive } from './session';

const DayNightCycle: React.FC = () => {
  const { gameTime, updateGameTime } = useGame();
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);

  useFrame((state, delta) => {
    if (isGameplayActive()) updateGameTime(delta * 100);

    const timeOfDay = (gameTime / 24000) * 24;
    const sunAngle = (timeOfDay / 24) * Math.PI * 2 - Math.PI / 2;
    
    const sunX = Math.cos(sunAngle) * 100;
    const sunY = Math.sin(sunAngle) * 100;
    const sunZ = 50;

    if (dirLightRef.current) {
      dirLightRef.current.position.set(sunX, Math.max(sunY, 10), sunZ);
    }

    const isDaytime = sunY > 0;
    const dayIntensity = Math.max(0.2, Math.min(1, sunY / 100));
    const nightIntensity = 0.15;
    
    const lightIntensity = isDaytime ? dayIntensity : nightIntensity;
    const ambientIntensity = isDaytime ? 0.4 : 0.1;

    if (dirLightRef.current) {
      dirLightRef.current.intensity = lightIntensity;
    }
    
    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = ambientIntensity;
    }

    const skyColor = isDaytime
      ? new THREE.Color(0.53, 0.81, 0.92)
      : new THREE.Color(0.05, 0.05, 0.2);
    
    state.scene.background = skyColor;
  });

  return (
    <>
      <ambientLight ref={ambientLightRef} intensity={0.4} />
      <directionalLight
        ref={dirLightRef}
        position={[100, 100, 50]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
    </>
  );
};

export default DayNightCycle;


