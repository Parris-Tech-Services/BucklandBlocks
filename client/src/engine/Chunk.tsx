import React, { useEffect, useMemo } from "react";
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

const Chunk: React.FC<ChunkProps> = ({
  chunkX,
  chunkZ,
  position,
  size,
}) => {
  const textures = useTexture({
    grass: "./textures/grass.png",
    dirt: "./textures/dirt.png",
    stone: "./textures/stone.png",
    wood: "./textures/wood.jpg",
    sand: "./textures/sand.jpg",
    sky: "./textures/sky.png",
  });

  Object.values(textures).forEach((texture) => {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestMipmapLinearFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
  });

  const chunkKey = `${chunkX},${chunkZ}`;
  const chunkData = useGame((state) => state.chunks.get(chunkKey));
  const getBlock = useGame((state) => state.getBlock);

  const materials = useMemo<THREE.Material[]>(
    () => [
      new THREE.MeshStandardMaterial({
        map: textures.dirt,
        roughness: 0.95,
      }),
      new THREE.MeshStandardMaterial({
        map: textures.grass,
        roughness: 0.9,
      }),
      new THREE.MeshStandardMaterial({
        map: textures.stone,
        roughness: 0.9,
      }),
      new THREE.MeshStandardMaterial({
        map: textures.wood,
        roughness: 0.9,
      }),
      new THREE.MeshStandardMaterial({
        map: textures.sand,
        roughness: 0.95,
      }),
      new THREE.MeshStandardMaterial({
        map: textures.sky,
        roughness: 0.5,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    ],
    [
      textures.dirt,
      textures.grass,
      textures.sand,
      textures.sky,
      textures.stone,
      textures.wood,
    ],
  );

  const geometry = useMemo(() => {
    if (!chunkData) return null;

    return createBlockMesh(
      chunkData.voxelData,
      size,
      (localX, y, localZ) =>
        getBlock(
          chunkX * size.x + localX,
          y,
          chunkZ * size.z + localZ,
        ),
    );
  }, [
    chunkData?.voxelData,
    chunkData?.revision,
    chunkX,
    chunkZ,
    getBlock,
    size,
  ]);

  useEffect(
    () => () => {
      geometry?.dispose();
    },
    [geometry],
  );

  useEffect(
    () => () => {
      materials.forEach((material) => material.dispose());
    },
    [materials],
  );

  if (!chunkData || !geometry) return null;

  return (
    <mesh
      position={position}
      geometry={geometry}
      material={materials}
      frustumCulled
      castShadow={false}
      receiveShadow={false}
    />
  );
};

export default Chunk;
