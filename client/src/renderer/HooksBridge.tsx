import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGame } from '@/lib/stores/useGame';

export default function HooksBridge() {
  const elapsed = useRef(0);
  useFrame(({ camera }, delta) => {
    elapsed.current += delta;
    if (elapsed.current < 0.1) return;
    elapsed.current = 0;
    useGame.setState({ fps: 1 / Math.max(delta, 1e-6),
      playerPosition: camera.position.clone(),
      playerRotation: { x: camera.rotation.x, y: camera.rotation.y } });
  });
  return null;
}

