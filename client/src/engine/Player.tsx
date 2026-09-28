import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { gameInput } from "./input";
import { isGameplayActive, useSession } from "./session";
import { performRaycast, type RaycastHit } from "./raycast";
import { BlockType, getBlockDrops, isBlockSolid } from "./blocks";
import { initialSave, useGame } from "../lib/stores/useGame";
import {
  moveAxisWithCollision,
  collidesAt,
  PLAYER_HALF_WIDTH,
  HEAD_ROOM,
} from "./collision";

const PLAYER_HEIGHT = 1.8;
const PLAYER_SPEED = 6;
const JUMP_FORCE = 10;
const GRAVITY = -25;
const AIR_CONTROL = 0.3;
const WORLD_HEIGHT = 128;
const DEFAULT_GROUND_Y = 64;

const Player: React.FC = () => {
  const { camera } = useThree();

  const {
    selectedSlot,
    setSelectedSlot,
    inventory,
    inventoryCounts,
    addToInventory,
    addDroppedItem,
    removeFromInventory,
    setBlock,
    getBlock,
    getChunk,
    markChunkDirty,
  } = useGame();

  const velocityRef = useRef(new THREE.Vector3());
  const onGroundRef = useRef(false);
  const [targetBlock, setTargetBlock] = useState<RaycastHit | null>(null);
  const lastActionRef = useRef(0);
  const miningProgressRef = useRef(0);
  const miningTargetRef = useRef<THREE.Vector3 | null>(null);

  const findSurfaceY = (x: number, z: number): number => {
    for (let y = WORLD_HEIGHT - 2; y >= 0; y -= 1) {
      const blockType = getBlock(x, y, z);
      if (!isBlockSolid(blockType)) continue;

      const eyeY = y + 1 + PLAYER_HEIGHT;
      const candidate = new THREE.Vector3(x + 0.5, eyeY, z + 0.5);
      if (!collidesAt(candidate, PLAYER_HEIGHT, getBlock)) {
        return eyeY;
      }
    }
    return DEFAULT_GROUND_Y + PLAYER_HEIGHT;
  };

  useLayoutEffect(() => {
    const saved = useGame.getState();

    camera.position.copy(saved.playerPosition);
    camera.rotation.set(
      saved.playerRotation.x,
      saved.playerRotation.y,
      0,
      "YXZ",
    );

    velocityRef.current.set(0, 0, 0);
    onGroundRef.current = false;

    return useSession.subscribe(() => {
      if (!isGameplayActive()) {
        velocityRef.current.set(0, 0, 0);
        gameInput.clear();
        setTargetBlock(null);
        useGame.setState({
          playerPosition: camera.position.clone(),
          playerRotation: {
            x: camera.rotation.x,
            y: camera.rotation.y,
          },
        });
      }
    });
  }, [camera]);

  useEffect(() => {
    if (initialSave.data) return;

    let cancelled = false;
    const trySpawn = () => {
      if (cancelled) return;
      if (!getChunk(0, 0)) {
        requestAnimationFrame(trySpawn);
        return;
      }

      camera.position.set(0.5, findSurfaceY(0, 0), 0.5);
      velocityRef.current.set(0, 0, 0);
      useGame.setState({
        playerPosition: camera.position.clone(),
        playerRotation: {
          x: camera.rotation.x,
          y: camera.rotation.y,
        },
      });
    };

    trySpawn();
    return () => {
      cancelled = true;
    };
    // World readiness is intentionally polled until chunk 0,0 exists.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleHotbarSelect = (event: CustomEvent) => {
      if (isGameplayActive() && Number.isInteger(event.detail)) {
        setSelectedSlot(event.detail);
      }
    };

    window.addEventListener(
      "hotbarSelect",
      handleHotbarSelect as EventListener,
    );
    return () =>
      window.removeEventListener(
        "hotbarSelect",
        handleHotbarSelect as EventListener,
      );
  }, [setSelectedSlot]);

  useEffect(() => {
    camera.rotation.order = "YXZ";

    const handleMouseMove = (event: MouseEvent) => {
      if (!isGameplayActive()) return;

      const sensitivity = 0.002;
      camera.rotation.y -= event.movementX * sensitivity;
      camera.rotation.x -= event.movementY * sensitivity;
      camera.rotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, camera.rotation.x),
      );
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [camera]);

  useFrame((_, delta) => {
    if (!isGameplayActive()) return;

    const currentChunkX = Math.floor(camera.position.x / 16);
    const currentChunkZ = Math.floor(camera.position.z / 16);
    if (!getChunk(currentChunkX, currentChunkZ)) {
      velocityRef.current.set(0, 0, 0);
      return;
    }

    const keys = gameInput.read();
    const velocity = velocityRef.current;

    const direction = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      camera.quaternion,
    );
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
      camera.quaternion,
    );

    forward.y = 0;
    forward.normalize();
    right.y = 0;
    right.normalize();

    if (keys.forward) direction.add(forward);
    if (keys.backward) direction.sub(forward);
    if (keys.rightward) direction.add(right);
    if (keys.leftward) direction.sub(right);

    direction.normalize();

    const speed = PLAYER_SPEED * (keys.sneak ? 0.5 : 1);
    const control = onGroundRef.current ? 1 : AIR_CONTROL;

    const targetVelocity = direction.multiplyScalar(speed);
    velocity.x = THREE.MathUtils.lerp(
      velocity.x,
      targetVelocity.x,
      control,
    );
    velocity.z = THREE.MathUtils.lerp(
      velocity.z,
      targetVelocity.z,
      control,
    );

    if (keys.jump && onGroundRef.current) {
      velocity.y = JUMP_FORCE;
      onGroundRef.current = false;
    }

    velocity.y += GRAVITY * delta;

    const moveDelta = velocity.clone().multiplyScalar(delta);
    moveAxisWithCollision(
      camera.position,
      velocity,
      "x",
      moveDelta.x,
      PLAYER_HEIGHT,
      getBlock,
    );
    moveAxisWithCollision(
      camera.position,
      velocity,
      "z",
      moveDelta.z,
      PLAYER_HEIGHT,
      getBlock,
    );

    const wasFalling = velocity.y <= 0;
    const blockedY = moveAxisWithCollision(
      camera.position,
      velocity,
      "y",
      moveDelta.y,
      PLAYER_HEIGHT,
      getBlock,
    );
    onGroundRef.current = blockedY && wasFalling;

    const raycast = performRaycast(
      camera.position,
      camera.getWorldDirection(new THREE.Vector3()),
      5,
      getBlock,
    );

    setTargetBlock((previous) => {
      if (!raycast || raycast.distance <= 0.25) return null;
      if (
        previous &&
        previous.position.equals(raycast.position) &&
        previous.normal.equals(raycast.normal) &&
        previous.blockType === raycast.blockType
      ) {
        return previous;
      }
      return raycast;
    });

    const now = Date.now();

    if (keys.mine && raycast && now - lastActionRef.current > 200) {
      lastActionRef.current = now;

      const { x, y, z } = raycast.position;
      const blockType = raycast.blockType;

      setBlock(
        Math.floor(x),
        Math.floor(y),
        Math.floor(z),
        BlockType.AIR,
      );

      const chunkX = Math.floor(Math.floor(x) / 16);
      const chunkZ = Math.floor(Math.floor(z) / 16);
      markChunkDirty(chunkX, chunkZ);

      const drops = getBlockDrops(blockType);
      drops.forEach((drop) => {
        const remaining = addToInventory(drop.id, drop.count);
        if (remaining > 0) {
          // Drop the item in the world slightly in front of the player
          const dropPos = camera.position.clone();
          const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
          dropPos.add(dir.multiplyScalar(2));
          addDroppedItem(drop.id, remaining, dropPos);
        }
      });
    }

    if (
      keys.place &&
      raycast &&
      now - lastActionRef.current > 200
    ) {
      const selectedBlockType = inventory[selectedSlot];

      if (
        selectedBlockType !== null &&
        inventoryCounts[selectedSlot] > 0
      ) {
        lastActionRef.current = now;

        const placePos = raycast.position.clone().add(raycast.normal);
        const { x, y, z } = placePos;

        const playerBox = new THREE.Box3(
          new THREE.Vector3(
            camera.position.x - PLAYER_HALF_WIDTH,
            camera.position.y - PLAYER_HEIGHT,
            camera.position.z - PLAYER_HALF_WIDTH,
          ),
          new THREE.Vector3(
            camera.position.x + PLAYER_HALF_WIDTH,
            camera.position.y + HEAD_ROOM,
            camera.position.z + PLAYER_HALF_WIDTH,
          ),
        );

        const blockBox = new THREE.Box3(
          new THREE.Vector3(
            Math.floor(x),
            Math.floor(y),
            Math.floor(z),
          ),
          new THREE.Vector3(
            Math.floor(x) + 1,
            Math.floor(y) + 1,
            Math.floor(z) + 1,
          ),
        );

        if (!playerBox.intersectsBox(blockBox)) {
          setBlock(
            Math.floor(x),
            Math.floor(y),
            Math.floor(z),
            selectedBlockType,
          );

          const chunkX = Math.floor(Math.floor(x) / 16);
          const chunkZ = Math.floor(Math.floor(z) / 16);
          markChunkDirty(chunkX, chunkZ);

          removeFromInventory(selectedSlot, 1);
        }
      }
    }
  });

  return (
    <>
      {targetBlock && targetBlock.distance > 0.25 && (
        <mesh
          position={[
            targetBlock.position.x + 0.5,
            targetBlock.position.y + 0.5,
            targetBlock.position.z + 0.5,
          ]}
        >
          <boxGeometry args={[1.01, 1.01, 1.01]} />
          <meshBasicMaterial
            color="white"
            wireframe
            opacity={0.5}
            transparent
          />
        </mesh>
      )}
    </>
  );
};

export default Player;
