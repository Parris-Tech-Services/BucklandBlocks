import React, { useMemo } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { createBlockMesh } from "./mesher";
import { useGame } from "../lib/stores/useGame";

export interface ChunkProps {
  chunkX: number;
  chunkZ: number;
  position: [number, number, number];
  size: { x: number; y: number; z: number };
}

const asset = (name: string) => `${import.meta.env.BASE_URL}textures/${name}`;

const Chunk: React.FC<ChunkProps> = ({ chunkX, chunkZ, position, size }) => {
  const textures = useTexture({
    grass: asset("grass.png"),
    dirt: asset("dirt.png"),
    stone: asset("stone.png"),
    wood: asset("wood.jpg"),
    sand: asset("sand.jpg"),
    sky: asset("sky.png"),
  });

  Object.values(textures).forEach((texture) => {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
  });

  const chunks = useGame((state) => state.chunks);
  const chunkKey = `${chunkX},${chunkZ}`;
  const chunkData = chunks.get(chunkKey);
  const neighborRevisionKey = [
    chunks.get(`${chunkX - 1},${chunkZ}`)?.revision ?? -1,
    chunks.get(`${chunkX + 1},${chunkZ}`)?.revision ?? -1,
    chunks.get(`${chunkX},${chunkZ - 1}`)?.revision ?? -1,
    chunks.get(`${chunkX},${chunkZ + 1}`)?.revision ?? -1,
  ].join(":");

  const materials = useMemo<THREE.Material[]>(() => [
    new THREE.MeshStandardMaterial({ map: textures.dirt, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ map: textures.grass, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ map: textures.stone, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ map: textures.wood, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ map: textures.sand, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({
      map: textures.sky,
      roughness: 0.5,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  ], [textures.dirt, textures.grass, textures.sand, textures.sky, textures.stone, textures.wood]);

  const geometry = useMemo(() => {
    if (!chunkData) return null;
    return createBlockMesh(chunkData.voxelData, size, (localX, y, localZ) => {
      const worldX = chunkX * size.x + localX;
      const worldZ = chunkZ * size.z + localZ;
      return useGame.getState().getBlock(worldX, y, worldZ);
    });
  }, [chunkData, chunkX, chunkZ, neighborRevisionKey, size]);

  if (!geometry) return null;

  return (
    <mesh
      position={position}
      geometry={geometry}
      material={materials}
      castShadow={false}
      receiveShadow={false}
      frustumCulled
    />
  );
};

export default Chunk;
