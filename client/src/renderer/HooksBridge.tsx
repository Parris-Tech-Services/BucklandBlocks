import { useFrame } from "@react-three/fiber";
import { useThree } from "@react-three/fiber";
import { useGame } from "@/lib/stores/useGame";

export default function HooksBridge() {
  const { camera } = useThree();
  const { setFps, setPlayerPosition, setPlayerRotation } = useGame();
  useFrame((_, delta) => {
    setFps(1 / Math.max(delta, 1e-6));
    setPlayerPosition(camera.position.clone());
    setPlayerRotation({ x: camera.rotation.x, y: camera.rotation.y });
  });
  return null;
}
