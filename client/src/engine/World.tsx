import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import Chunk from "./Chunk";
import { generateChunkTerrain } from "../utils/noise";
import { fetchOSMData, processOSMData } from "../utils/osm";
import { useGame } from "../lib/stores/useGame";

interface WorldProps { viewDistance?: number; }

const CHUNK_SIZE = { x: 16, y: 128, z: 16 };
const STARTING_ADDRESS = "53 Buckland Street, Epsom VIC 3551, Australia";
const OSM_ENABLED = import.meta.env.VITE_ENABLE_OSM === "true";

const World: React.FC<WorldProps> = ({ viewDistance = 2 }) => {
  const { camera, scene } = useThree();
  const [centerChunk, setCenterChunk] = useState({ x: 0, z: 0 });
  const { setChunk, getChunk } = useGame();
  const [renderedChunks, setRenderedChunks] = useState<Set<string>>(new Set());
  const lightsAdded = useRef(false);

  useEffect(() => {
    if (lightsAdded.current) return;
    lightsAdded.current = true;

    scene.children = scene.children.filter(obj => !(obj instanceof THREE.Light));

    const hemi = new THREE.HemisphereLight(0xffffff, 0x90a0b0, 0.7);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfcf8e5, 0.8);
    sun.position.set(60, 100, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 500;
    sun.shadow.bias = -0.001;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x90a0b0, 0.2);
    fill.position.set(-60, 40, -40);
    scene.add(fill);

    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 80, 160);
  }, [scene]);

  // The public hub serves this game as static files. Keep optional OSM
  // enrichment disabled unless a deployment also provides the API routes.
  const { data: osmData, isLoading } = useQuery({
    queryKey: ["osmData", STARTING_ADDRESS],
    queryFn: () => fetchOSMData(STARTING_ADDRESS),
    staleTime: 10 * 60 * 1000,
    enabled: OSM_ENABLED,
  });

  useEffect(() => {
    const handle = setInterval(() => {
      const cx = Math.floor(camera.position.x / CHUNK_SIZE.x);
      const cz = Math.floor(camera.position.z / CHUNK_SIZE.z);
      if (cx !== centerChunk.x || cz !== centerChunk.z) setCenterChunk({ x: cx, z: cz });
    }, 250);

    return () => clearInterval(handle);
  }, [camera, centerChunk]);

  useEffect(() => {
    const newRendered = new Set<string>();

    for (let x = centerChunk.x - viewDistance; x <= centerChunk.x + viewDistance; x++) {
      for (let z = centerChunk.z - viewDistance; z <= centerChunk.z + viewDistance; z++) {
        const key = `${x},${z}`;
        newRendered.add(key);

        if (!getChunk(x, z)) {
          let chunkData = generateChunkTerrain(
            x * CHUNK_SIZE.x, 0, z * CHUNK_SIZE.z,
            CHUNK_SIZE.x, CHUNK_SIZE.y, CHUNK_SIZE.z,
          );
          if (osmData) chunkData = processOSMData(chunkData, osmData, x, z, CHUNK_SIZE);
          setChunk(x, z, chunkData);
        }
      }
    }

    setRenderedChunks(newRendered);
  }, [centerChunk, viewDistance, osmData, getChunk, setChunk]);

  if (isLoading) {
    return (
      <mesh position={[0, 64, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="yellow" />
      </mesh>
    );
  }

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
