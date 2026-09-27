import React, { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { performRaycast } from "./raycast";
import { BlockType, getBlockDrops, isBlockSolid } from "./blocks";
import { useGame } from "../lib/stores/useGame";

const PLAYER_HEIGHT = 1.8;
const EYE_HEIGHT = 1.62;
const PLAYER_HALF_WIDTH = 0.3;
const PLAYER_SPEED = 6;
const JUMP_FORCE = 8.5;
const GRAVITY = -24;
const MAX_MOVE_STEP = 0.18;
const INTERACTION_RANGE = 5;

interface InputState {
  keys: Set<string>;
  mine: boolean;
  place: boolean;
  lockedAt: number;
}

const collidesAt = (
  position: THREE.Vector3,
  getBlock: (x: number, y: number, z: number) => BlockType,
) => {
  const epsilon = 0.001;
  const feetY = position.y - EYE_HEIGHT;
  const topY = feetY + PLAYER_HEIGHT;

  const minX = Math.floor(position.x - PLAYER_HALF_WIDTH + epsilon);
  const maxX = Math.floor(position.x + PLAYER_HALF_WIDTH - epsilon);
  const minY = Math.floor(feetY + epsilon);
  const maxY = Math.floor(topY - epsilon);
  const minZ = Math.floor(position.z - PLAYER_HALF_WIDTH + epsilon);
  const maxZ = Math.floor(position.z + PLAYER_HALF_WIDTH - epsilon);

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        if (isBlockSolid(getBlock(x, y, z))) return true;
      }
    }
  }

  return false;
};

const playerIntersectsBlock = (position: THREE.Vector3, x: number, y: number, z: number) => {
  const feetY = position.y - EYE_HEIGHT;
  const topY = feetY + PLAYER_HEIGHT;

  return (
    position.x + PLAYER_HALF_WIDTH > x &&
    position.x - PLAYER_HALF_WIDTH < x + 1 &&
    topY > y &&
    feetY < y + 1 &&
    position.z + PLAYER_HALF_WIDTH > z &&
    position.z - PLAYER_HALF_WIDTH < z + 1
  );
};

const isNaturalSpawnSurface = (type: BlockType) =>
  type === BlockType.GRASS ||
  type === BlockType.DIRT ||
  type === BlockType.SAND ||
  type === BlockType.STONE ||
  type === BlockType.COBBLESTONE ||
  type === BlockType.BRICK;

const findSafeSpawn = () => {
  const state = useGame.getState();
  if (!state.getChunk(0, 0)) return null;

  for (let radius = 0; radius <= 8; radius += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      for (let z = -radius; z <= radius; z += 1) {
        if (radius > 0 && Math.abs(x) !== radius && Math.abs(z) !== radius) continue;

        for (let y = 126; y >= 1; y -= 1) {
          const surface = state.getBlock(x, y, z);
          if (!isNaturalSpawnSurface(surface)) continue;
          if (isBlockSolid(state.getBlock(x, y + 1, z))) continue;
          if (isBlockSolid(state.getBlock(x, y + 2, z))) continue;
          return new THREE.Vector3(x + 0.5, y + 1 + EYE_HEIGHT, z + 0.5);
        }
      }
    }
  }

  return null;
};

const Player: React.FC = () => {
  const { camera, gl } = useThree();
  const velocityRef = useRef(new THREE.Vector3());
  const onGroundRef = useRef(false);
  const lastInteractionRef = useRef(0);
  const poseAccumulatorRef = useRef(0);
  const spawnResolvedRef = useRef(useGame.getState().hasLoadedSave);
  const outlineRef = useRef<THREE.Mesh>(null);
  const inputRef = useRef<InputState>({
    keys: new Set<string>(),
    mine: false,
    place: false,
    lockedAt: 0,
  });

  useEffect(() => {
    camera.rotation.order = "YXZ";
    const state = useGame.getState();

    if (state.hasLoadedSave) {
      camera.position.copy(state.playerPosition);
      camera.rotation.set(state.playerRotation.x, state.playerRotation.y, 0, "YXZ");
    } else {
      camera.rotation.set(0, 0, 0, "YXZ");
    }
  }, [camera]);

  useEffect(() => {
    const canvas = gl.domElement;

    const clearInput = () => {
      inputRef.current.keys.clear();
      inputRef.current.mine = false;
      inputRef.current.place = false;
      velocityRef.current.set(0, 0, 0);
    };

    const requestLock = () => {
      try {
        const result = canvas.requestPointerLock();
        if (result instanceof Promise) {
          result.catch((error) => console.warn("Pointer lock was not granted:", error));
        }
      } catch (error) {
        console.warn("Pointer lock request failed:", error);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const state = useGame.getState();
      if (!state.gameplayActive) return;

      if (document.pointerLockElement !== canvas) {
        inputRef.current.lockedAt = performance.now();
        requestLock();
        return;
      }

      if (event.button === 0) inputRef.current.mine = true;
      if (event.button === 2) inputRef.current.place = true;
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.button === 0) inputRef.current.mine = false;
      if (event.button === 2) inputRef.current.place = false;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (
        document.pointerLockElement !== canvas ||
        !useGame.getState().gameplayActive
      ) {
        return;
      }

      const sensitivity = 0.002;
      camera.rotation.y -= event.movementX * sensitivity;
      camera.rotation.x -= event.movementY * sensitivity;
      camera.rotation.x = THREE.MathUtils.clamp(
        camera.rotation.x,
        -Math.PI / 2 + 0.01,
        Math.PI / 2 - 0.01,
      );
      camera.rotation.z = 0;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !useGame.getState().gameplayActive ||
        document.pointerLockElement !== canvas
      ) {
        return;
      }

      if (
        event.code === "KeyW" ||
        event.code === "KeyA" ||
        event.code === "KeyS" ||
        event.code === "KeyD" ||
        event.code === "Space" ||
        event.code === "ShiftLeft" ||
        event.code === "ShiftRight"
      ) {
        event.preventDefault();
        inputRef.current.keys.add(event.code);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      inputRef.current.keys.delete(event.code);
    };

    const handlePointerLockChange = () => {
      if (document.pointerLockElement !== canvas) clearInput();
      else inputRef.current.lockedAt = performance.now();
    };

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") clearInput();
    };

    const handleContextMenu = (event: MouseEvent) => {
      if (
        event.target === canvas &&
        document.pointerLockElement === canvas &&
        useGame.getState().gameplayActive
      ) {
        event.preventDefault();
      }
    };

    const unsubscribe = useGame.subscribe(
      (state) => state.gameplayActive,
      (active) => {
        if (!active) {
          clearInput();
          if (document.pointerLockElement === canvas) document.exitPointerLock();
        }
      },
    );

    canvas.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearInput);
    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      unsubscribe();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearInput);
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [camera, gl]);

  useFrame((_, rawDelta) => {
    const state = useGame.getState();

    if (!spawnResolvedRef.current) {
      const spawn = findSafeSpawn();
      if (!spawn) return;
      camera.position.copy(spawn);
      velocityRef.current.set(0, 0, 0);
      state.setPlayerPosition(spawn);
      state.setPlayerRotation({ x: camera.rotation.x, y: camera.rotation.y });
      spawnResolvedRef.current = true;
    }

    const currentChunkX = Math.floor(camera.position.x / 16);
    const currentChunkZ = Math.floor(camera.position.z / 16);
    if (!state.getChunk(currentChunkX, currentChunkZ)) return;

    const canvas = gl.domElement;
    if (!state.gameplayActive || document.pointerLockElement !== canvas) {
      velocityRef.current.set(0, 0, 0);
      return;
    }

    const delta = Math.min(rawDelta, 0.1);
    const input = inputRef.current;
    const velocity = velocityRef.current;

    const yaw = camera.rotation.y;
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const direction = new THREE.Vector3();

    if (input.keys.has("KeyW")) direction.add(forward);
    if (input.keys.has("KeyS")) direction.sub(forward);
    if (input.keys.has("KeyD")) direction.add(right);
    if (input.keys.has("KeyA")) direction.sub(right);

    if (direction.lengthSq() > 0) direction.normalize();

    const sneaking =
      input.keys.has("ShiftLeft") || input.keys.has("ShiftRight");
    const speed = PLAYER_SPEED * (sneaking ? 0.5 : 1);
    velocity.x = direction.x * speed;
    velocity.z = direction.z * speed;

    onGroundRef.current = collidesAt(
      camera.position.clone().add(new THREE.Vector3(0, -0.04, 0)),
      state.getBlock,
    );

    if (input.keys.has("Space") && onGroundRef.current) {
      velocity.y = JUMP_FORCE;
      onGroundRef.current = false;
    }

    velocity.y += GRAVITY * delta;

    const movement = velocity.clone().multiplyScalar(delta);
    const steps = Math.max(
      1,
      Math.ceil(
        Math.max(Math.abs(movement.x), Math.abs(movement.y), Math.abs(movement.z)) /
          MAX_MOVE_STEP,
      ),
    );
    const step = movement.multiplyScalar(1 / steps);

    for (let i = 0; i < steps; i += 1) {
      if (step.x !== 0) {
        const candidate = camera.position.clone();
        candidate.x += step.x;
        if (collidesAt(candidate, state.getBlock)) velocity.x = 0;
        else camera.position.x = candidate.x;
      }

      if (step.z !== 0) {
        const candidate = camera.position.clone();
        candidate.z += step.z;
        if (collidesAt(candidate, state.getBlock)) velocity.z = 0;
        else camera.position.z = candidate.z;
      }

      if (step.y !== 0) {
        const candidate = camera.position.clone();
        candidate.y += step.y;
        if (collidesAt(candidate, state.getBlock)) {
          if (step.y < 0) onGroundRef.current = true;
          velocity.y = 0;
        } else {
          camera.position.y = candidate.y;
        }
      }
    }

    const raycast = performRaycast(
      camera.position,
      camera.getWorldDirection(new THREE.Vector3()),
      INTERACTION_RANGE,
      state.getBlock,
    );

    if (outlineRef.current) {
      outlineRef.current.visible = Boolean(raycast);
      if (raycast) {
        outlineRef.current.position.set(
          raycast.position.x + 0.5,
          raycast.position.y + 0.5,
          raycast.position.z + 0.5,
        );
      }
    }

    const now = performance.now();
    const canInteract = now - input.lockedAt > 200 && now - lastInteractionRef.current > 180;

    if (canInteract && input.mine && raycast) {
      lastInteractionRef.current = now;
      const x = Math.floor(raycast.position.x);
      const y = Math.floor(raycast.position.y);
      const z = Math.floor(raycast.position.z);
      const blockType = raycast.blockType;

      state.setBlock(x, y, z, BlockType.AIR);
      for (const drop of getBlockDrops(blockType)) {
        state.addToInventory(drop.id, drop.count);
      }
    }

    if (canInteract && input.place && raycast) {
      const liveState = useGame.getState();
      const selectedBlockType = liveState.inventory[liveState.selectedSlot];
      const selectedCount = liveState.inventoryCounts[liveState.selectedSlot];

      if (selectedBlockType !== null && selectedCount > 0) {
        const placePos = raycast.position.clone().add(raycast.normal);
        const x = Math.floor(placePos.x);
        const y = Math.floor(placePos.y);
        const z = Math.floor(placePos.z);

        if (
          liveState.getBlock(x, y, z) === BlockType.AIR &&
          !playerIntersectsBlock(camera.position, x, y, z)
        ) {
          lastInteractionRef.current = now;
          liveState.setBlock(x, y, z, selectedBlockType);
          liveState.removeFromInventory(liveState.selectedSlot, 1);
        }
      }
    }

    poseAccumulatorRef.current += delta;
    if (poseAccumulatorRef.current >= 0.1) {
      poseAccumulatorRef.current = 0;
      const liveState = useGame.getState();
      liveState.setPlayerPosition(camera.position);
      liveState.setPlayerRotation({ x: camera.rotation.x, y: camera.rotation.y });
    }
  });

  return (
    <mesh ref={outlineRef} visible={false}>
      <boxGeometry args={[1.01, 1.01, 1.01]} />
      <meshBasicMaterial color="white" wireframe opacity={0.65} transparent />
    </mesh>
  );
};

export default Player;
