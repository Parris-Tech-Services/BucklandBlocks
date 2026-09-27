import React, { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import Chunk from "./Chunk";
import { generateChunkTerrain } from "../utils/noise";
import { useGame } from "../lib/stores/useGame";

interface WorldProps {
  viewDistance?: number;
}

const CHUNK_SIZE = { x: 16, y: 128, z: 16 };

const World: React.FC<WorldProps> = ({ viewDistance = 1 }) => {
  const { camera, scene } = useThree();
  const [centerChunk, setCenterChunk] = useState({ x: 0, z: 0 });
  const [renderedChunks, setRenderedChunks] = useState<Set<string>>(new Set());
  const getChunk = useGame((state) => state.getChunk);
  const setChunk = useGame((state) => state.setChunk);

  useEffect(() => {
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 72, 150);
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  useEffect(() => {
    const updateCenter = () => {
      const x = Math.floor(camera.position.x / CHUNK_SIZE.x);
      const z = Math.floor(camera.position.z / CHUNK_SIZE.z);
      setCenterChunk((current) => current.x === x && current.z === z ? current : { x, z });
    };
    updateCenter();
    const handle = window.setInterval(updateCenter, 250);
    return () => window.clearInterval(handle);
  }, [camera]);

  useEffect(() => {
    const next = new Set<string>();
    for (let x = centerChunk.x - viewDistance; x <= centerChunk.x + viewDistance; x += 1) {
      for (let z = centerChunk.z - viewDistance; z <= centerChunk.z + viewDistance; z += 1) {
        const key = `${x},${z}`;
        next.add(key);
        if (!getChunk(x, z)) {
          setChunk(
            x,
            z,
            generateChunkTerrain(
              x * CHUNK_SIZE.x,
              0,
              z * CHUNK_SIZE.z,
              CHUNK_SIZE.x,
              CHUNK_SIZE.y,
              CHUNK_SIZE.z,
            ),
          );
        }
      }
    }
    setRenderedChunks(next);
  }, [centerChunk, getChunk, setChunk, viewDistance]);

  return (
    <>
      {Array.from(renderedChunks).map((key) => {
        const [x, z] = key.split(",").map(Number);
        return (
          <Chunk
            key={key}
            chunkX={x}
            chunkZ={z}
            position={[x * CHUNK_SIZE.x, 0, z * CHUNK_SIZE.z]}
            size={CHUNK_SIZE}
          />
        );
      })}
    </>
  );
};

export default World;
