import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../lib/stores/useGame';
import { getBlockData } from './blocks';
import { useTexture } from '@react-three/drei';

const DroppedItems: React.FC = () => {
  const droppedItems = useGame(state => state.droppedItems);
  const groupRef = useRef<THREE.Group>(null);
  
  const textures = useTexture({
    grass: "./textures/grass.png",
    dirt: "./textures/dirt.png",
    stone: "./textures/stone.png",
    wood: "./textures/wood.jpg",
    sand: "./textures/sand.jpg",
  });
  
  Object.values(textures).forEach((t) => {
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestMipmapLinearFilter;
  });

  useFrame((state, delta) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();
      groupRef.current.children.forEach((child, i) => {
        // Spin the item
        child.rotation.y += delta;
        // Bob up and down
        child.position.y += Math.sin(time * 3 + i) * 0.005;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {droppedItems.map((item) => {
        const data = getBlockData(item.type);
        if (!data) return null;
        
        // Simple textured box for blocks, or sprite/plane for tools
        return (
          <mesh 
            key={item.id} 
            position={[item.position.x + 0.5, item.position.y + 0.25, item.position.z + 0.5]} 
            scale={0.25}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial 
              map={data.texture.includes('grass') ? textures.grass : 
                   data.texture.includes('stone') ? textures.stone : 
                   data.texture.includes('wood') ? textures.wood : 
                   data.texture.includes('sand') ? textures.sand : textures.dirt} 
            />
          </mesh>
        );
      })}
    </group>
  );
};

export default DroppedItems;
