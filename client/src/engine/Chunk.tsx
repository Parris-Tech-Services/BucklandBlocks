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

const Chunk: React.FC<ChunkProps> = ({ chunkX, chunkZ, position, size }) => {
  const textures = useTexture({
    grass: "./textures/grass.png",
    dirt: "./textures/dirt.png",
    stone: "./textures/stone.png",
    wood: "./textures/wood.jpg",
    sand: "./textures/sand.jpg",
    sky: "./textures/sky.png",
    craftingTable: "./textures/crafting_table.png",
    chest: "./textures/chest.png",
    furnace: "./textures/furnace.png",
  });

  // crisp voxel look + correct color space.
  // minFilter must mipmap (NearestMipmapLinear, not NearestFilter) or any
  // minified/distant surface aliases into full-screen shimmering "static" —
  // magFilter stays Nearest so close-up texels still look crisp/blocky.
  Object.values(textures).forEach((t) => {
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestMipmapLinearFilter;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    // r3f/three@0.15+ uses colorSpace
    (t as any).colorSpace = THREE.SRGBColorSpace;
  });

  const chunks = useGame((s) => s.chunks);
  const chunkKey = `${chunkX},${chunkZ}`;
  const chunkData = chunks.get(chunkKey);
  const voxelData = chunkData?.voxelData;

  if (!voxelData) return null;

  const { geometry, materials } = useMemo(() => {
  const geo = createBlockMesh(voxelData, size);
    // normals for proper lighting
    geo.computeVertexNormals();

    const mats: THREE.Material[] = [
      new THREE.MeshStandardMaterial({ map: textures.dirt, roughness: 0.9, metalness: 0 }),
      new THREE.MeshStandardMaterial({ map: textures.grass, roughness: 0.8, metalness: 0 }),
      new THREE.MeshStandardMaterial({ map: textures.stone, roughness: 0.7, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ map: textures.wood, roughness: 0.8, metalness: 0 }),
      new THREE.MeshStandardMaterial({ map: textures.sand, roughness: 0.9, metalness: 0 }),
      new THREE.MeshStandardMaterial({
        map: textures.sky,
        roughness: 0.1,
        metalness: 0,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      }),
      // Water: a flat colour reads better than a stretched/tiled texture on
      // a liquid surface. Translucent so the lakebed shows through, and
      // double-sided so the underside is visible from below the surface.
      new THREE.MeshStandardMaterial({
        color: 0x3a7bd5,
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
      }),
      new THREE.MeshStandardMaterial({
        map: textures.craftingTable,
        roughness: 0.8,
        metalness: 0,
      }),
      new THREE.MeshStandardMaterial({
        map: textures.chest,
        roughness: 0.8,
        metalness: 0,
      }),
      new THREE.MeshStandardMaterial({
        map: textures.furnace,
        roughness: 0.9,
        metalness: 0.05,
      }),
    ];

    if (chunkData?.dirty) chunkData.dirty = false;
    return { geometry: geo, materials: mats };
  }, [
    voxelData,
    size,
    textures.dirt,
    textures.grass,
    textures.stone,
    textures.wood,
    textures.sand,
    textures.sky,
    textures.craftingTable,
    textures.chest,
    textures.furnace,
    chunkData,
  ]);

  return (
    <mesh
      position={position}
      geometry={geometry}
      // IMPORTANT: pass the whole array so geometry.groups use the right material index
      material={materials}
      // turn shadows OFF for perf for now
      castShadow={false}
      receiveShadow={false}
    />
  );
};

export default Chunk;
