import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import Chunk from "./Chunk";
import { generateChunkTerrain } from "../utils/noise";
import { fetchOSMData, processOSMData } from "../utils/osm";
import { useGame } from "../lib/stores/useGame";

interface WorldProps {
  viewDistance?: number;
}

const CHUNK_SIZE = { x: 16, y: 128, z: 16 };
const STARTING_ADDRESS = "53 Buckland Street, Epsom VIC 3551, Australia";

const World: React.FC<WorldProps> = ({ viewDistance = 1 }) => {
  const { camera, scene } = useThree();
  const getChunk = useGame((state) => state.getChunk);
  const setChunk = useGame((state) => state.setChunk);
  const [centerChunk, setCenterChunk] = useState({ x: 0, z: 0 });

  useEffect(() => {
    const previousFog = scene.fog;
    scene.fog = new THREE.Fog(0x87ceeb, 70, 150);
    return () => {
      scene.fog = previousFog;
    };
  }, [scene]);

  const { data: osmData, isLoading } = useQuery({
    queryKey: ["osmData", STARTING_ADDRESS],
    queryFn: () => fetchOSMData(STARTING_ADDRESS),
    staleTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const updateCenter = () => {
      const x = Math.floor(camera.position.x / CHUNK_SIZE.x);
      const z = Math.floor(camera.position.z / CHUNK_SIZE.z);
      setCenterChunk((current) => (current.x === x && current.z === z ? current : { x, z }));
    };

    updateCenter();
    const handle = window.setInterval(updateCenter, 250);
    return () => window.clearInterval(handle);
  }, [camera]);

  useEffect(() => {
    if (isLoading) return;

    for (let x = centerChunk.x - viewDistance; x <= centerChunk.x + viewDistance; x += 1) {
      for (let z = centerChunk.z - viewDistance; z <= centerChunk.z + viewDistance; z += 1) {
        if (getChunk(x, z)) continue;

        let chunkData = generateChunkTerrain(
          x * CHUNK_SIZE.x,
          0,
          z * CHUNK_SIZE.z,
          CHUNK_SIZE.x,
          CHUNK_SIZE.y,
          CHUNK_SIZE.z,
        );

        if (osmData) {
          chunkData = processOSMData(chunkData, osmData, x, z, CHUNK_SIZE);
        }

        setChunk(x, z, chunkData);
      }
    }
  }, [centerChunk, getChunk, isLoading, osmData, setChunk, viewDistance]);

  const renderedChunks = useMemo(() => {
    const keys: Array<{ x: number; z: number; key: string }> = [];
    for (let x = centerChunk.x - viewDistance; x <= centerChunk.x + viewDistance; x += 1) {
      for (let z = centerChunk.z - viewDistance; z <= centerChunk.z + viewDistance; z += 1) {
        keys.push({ x, z, key: `${x},${z}` });
      }
    }
    return keys;
  }, [centerChunk, viewDistance]);

  if (isLoading) {
    return (
      <mesh position={[0.5, 66, 0.5]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="gold" />
      </mesh>
    );
  }

  return (
    <>
      {renderedChunks.map(({ x, z, key }) => (
        <Chunk
          key={key}
          chunkX={x}
          chunkZ={z}
          position={[x * CHUNK_SIZE.x, 0, z * CHUNK_SIZE.z]}
          size={CHUNK_SIZE}
        />
      ))}
    </>
  );
};

export default World;
