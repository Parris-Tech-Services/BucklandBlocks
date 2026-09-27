import React, { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { performRaycast } from "./raycast";
import { BlockType, getBlockDrops, isBlockSolid } from "./blocks";
import { useGame } from "../lib/stores/useGame";

const PLAYER_HEIGHT = 1.8;
const EYE_HEIGHT = 1.62;
const PLAYER_RADIUS = 0.3;
const PLAYER_SPEED = 5.2;
const JUMP_FORCE = 8.2;
const GRAVITY = -22;
const INTERACTION_RANGE = 5;

const Player: React.FC = () => {
  const { camera, gl } = useThree();
  const menu = useGame((state) => state.menu);
  const outlineRef = useRef<THREE.Mesh>(null);
  const velocityRef = useRef(new THREE.Vector3());
  const onGroundRef = useRef(false);
  const initializedRef = useRef(false);
  const keysRef = useRef(new Set<string>());
  const mouseButtonsRef = useRef({ mine: false, place: false });
  const lastActionRef = useRef(0);
  const jumpConsumedRef = useRef(false);
  const lockAcquiredAtRef = useRef(0);

  useEffect(() => {
    camera.rotation.order = "YXZ";
  }, [camera]);

  useEffect(() => {
    const canvas = gl.domElement;
    const clearInputs = () => {
      keysRef.current.clear();
      mouseButtonsRef.current.mine = false;
      mouseButtonsRef.current.place = false;
      jumpConsumedRef.current = false;
    };

    const isTypingTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      return Boolean(element?.closest("input, textarea, select, [contenteditable='true']"));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (["KeyW", "KeyA", "KeyS", "KeyD", "Space", "ShiftLeft", "ShiftRight"].includes(event.code)) {
        keysRef.current.add(event.code);
        if (event.code === "Space") event.preventDefault();
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => keysRef.current.delete(event.code);
    const handlePointerDown = (event: PointerEvent) => {
      if (menu !== "none") return;
      if (document.pointerLockElement !== canvas) {
        try {
          const request = canvas.requestPointerLock();
          if (request && typeof (request as Promise<void>).catch === "function") {
            (request as Promise<void>).catch(() => undefined);
          }
        } catch {
          // The browser may reject pointer lock. Gameplay remains usable through menus.
        }
        return;
      }
      if (event.button === 0) mouseButtonsRef.current.mine = true;
      if (event.button === 2) mouseButtonsRef.current.place = true;
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (event.button === 0) mouseButtonsRef.current.mine = false;
      if (event.button === 2) mouseButtonsRef.current.place = false;
    };
    const handleMouseMove = (event: MouseEvent) => {
      if (menu !== "none" || document.pointerLockElement !== canvas) return;
      camera.rotation.y -= event.movementX * 0.002;
      camera.rotation.x -= event.movementY * 0.002;
      camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
    };
    const handlePointerLock = () => {
      clearInputs();
      if (document.pointerLockElement === canvas) lockAcquiredAtRef.current = performance.now();
    };
    const handleVisibility = () => {
      if (document.hidden) clearInputs();
    };
    const handleContextMenu = (event: MouseEvent) => {
      if (menu === "none" && document.pointerLockElement === canvas) event.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearInputs);
    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("pointerlockchange", handlePointerLock);
    document.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearInputs);
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("pointerlockchange", handlePointerLock);
      document.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [camera, gl, menu]);

  useEffect(() => {
    keysRef.current.clear();
    mouseButtonsRef.current.mine = false;
    mouseButtonsRef.current.place = false;
    velocityRef.current.x = 0;
    velocityRef.current.z = 0;
    if (menu !== "none" && document.pointerLockElement) document.exitPointerLock();
  }, [menu]);

  const findSpawn = (): THREE.Vector3 | null => {
    const { getBlock, getChunk } = useGame.getState();
    if (!getChunk(0, 0)) return null;
    for (let radius = 0; radius <= 8; radius += 1) {
      for (let x = -radius; x <= radius; x += 1) {
        for (let z = -radius; z <= radius; z += 1) {
          for (let y = 126; y >= 1; y -= 1) {
            if (!isBlockSolid(getBlock(x, y, z))) continue;
            if (isBlockSolid(getBlock(x, y + 1, z)) || isBlockSolid(getBlock(x, y + 2, z))) continue;
            return new THREE.Vector3(x + 0.5, y + 1 + EYE_HEIGHT, z + 0.5);
          }
        }
      }
    }
    return null;
  };

  const collides = (position: THREE.Vector3): boolean => {
    const { getBlock, getChunk } = useGame.getState();
    const chunkX = Math.floor(position.x / 16);
    const chunkZ = Math.floor(position.z / 16);
    if (!getChunk(chunkX, chunkZ)) return true;

    const minX = position.x - PLAYER_RADIUS;
    const maxX = position.x + PLAYER_RADIUS;
    const minY = position.y - EYE_HEIGHT;
    const maxY = minY + PLAYER_HEIGHT;
    const minZ = position.z - PLAYER_RADIUS;
    const maxZ = position.z + PLAYER_RADIUS;
    if (minY < 0) return true;

    for (let x = Math.floor(minX + 1e-5); x <= Math.floor(maxX - 1e-5); x += 1) {
      for (let y = Math.floor(minY + 1e-5); y <= Math.floor(maxY - 1e-5); y += 1) {
        for (let z = Math.floor(minZ + 1e-5); z <= Math.floor(maxZ - 1e-5); z += 1) {
          if (isBlockSolid(getBlock(x, y, z))) return true;
        }
      }
    }
    return false;
  };

  const moveAxis = (axis: "x" | "y" | "z", amount: number) => {
    if (amount === 0) return true;
    const candidate = camera.position.clone();
    candidate[axis] += amount;
    if (collides(candidate)) return false;
    camera.position.copy(candidate);
    return true;
  };

  useFrame((_, rawDelta) => {
    const store = useGame.getState();
    if (!initializedRef.current) {
      if (store.hasSavedGame) {
        camera.position.copy(store.playerPosition);
        camera.rotation.set(store.playerRotation.x, store.playerRotation.y, 0, "YXZ");
        initializedRef.current = true;
      } else {
        const spawn = findSpawn();
        if (!spawn) return;
        camera.position.copy(spawn);
        camera.rotation.set(0, Math.PI, 0, "YXZ");
        store.setPlayerPosition(spawn);
        store.setPlayerRotation({ x: 0, y: Math.PI });
        initializedRef.current = true;
      }
    }

    const direction = camera.getWorldDirection(new THREE.Vector3());
    const hit = performRaycast(camera.position, direction, INTERACTION_RANGE, store.getBlock);
    if (outlineRef.current) {
      outlineRef.current.visible = Boolean(hit);
      if (hit) outlineRef.current.position.set(hit.position.x + 0.5, hit.position.y + 0.5, hit.position.z + 0.5);
    }

    if (menu !== "none") return;
    const delta = Math.min(rawDelta, 0.05);
    const steps = Math.max(1, Math.min(4, Math.ceil(delta / (1 / 60))));
    const dt = delta / steps;
    const keys = keysRef.current;
    const velocity = velocityRef.current;

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();
    const wish = new THREE.Vector3();
    if (keys.has("KeyW")) wish.add(forward);
    if (keys.has("KeyS")) wish.sub(forward);
    if (keys.has("KeyD")) wish.add(right);
    if (keys.has("KeyA")) wish.sub(right);
    if (wish.lengthSq() > 0) wish.normalize();

    const speed = PLAYER_SPEED * (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 0.55 : 1);
    const targetX = wish.x * speed;
    const targetZ = wish.z * speed;
    const damping = 1 - Math.exp(-(onGroundRef.current ? 18 : 5) * delta);
    velocity.x = THREE.MathUtils.lerp(velocity.x, targetX, damping);
    velocity.z = THREE.MathUtils.lerp(velocity.z, targetZ, damping);

    const jumpDown = keys.has("Space");
    if (jumpDown && onGroundRef.current && !jumpConsumedRef.current) {
      velocity.y = JUMP_FORCE;
      onGroundRef.current = false;
      jumpConsumedRef.current = true;
    }
    if (!jumpDown) jumpConsumedRef.current = false;

    for (let step = 0; step < steps; step += 1) {
      velocity.y += GRAVITY * dt;
      if (!moveAxis("x", velocity.x * dt)) velocity.x = 0;
      if (!moveAxis("z", velocity.z * dt)) velocity.z = 0;
      const verticalMoved = moveAxis("y", velocity.y * dt);
      if (!verticalMoved) {
        if (velocity.y < 0) onGroundRef.current = true;
        velocity.y = 0;
      } else if (velocity.y < -0.05) {
        onGroundRef.current = false;
      }
    }

    if (document.pointerLockElement !== gl.domElement || performance.now() - lockAcquiredAtRef.current < 220) return;
    const now = performance.now();
    if (now - lastActionRef.current < 180 || !hit) return;

    if (mouseButtonsRef.current.mine) {
      lastActionRef.current = now;
      store.setBlock(hit.position.x, hit.position.y, hit.position.z, BlockType.AIR);
      getBlockDrops(hit.blockType).forEach((drop) => store.addToInventory(drop.id, drop.count));
    } else if (mouseButtonsRef.current.place) {
      const selectedType = store.inventory[store.selectedSlot];
      if (selectedType === null || store.inventoryCounts[store.selectedSlot] <= 0) return;
      const target = hit.position.clone().add(hit.normal);
      if (target.y < 0 || target.y >= 128 || store.getBlock(target.x, target.y, target.z) !== BlockType.AIR) return;

      const playerMinY = camera.position.y - EYE_HEIGHT;
      const playerMaxY = playerMinY + PLAYER_HEIGHT;
      const intersectsPlayer =
        target.x + 1 > camera.position.x - PLAYER_RADIUS && target.x < camera.position.x + PLAYER_RADIUS &&
        target.y + 1 > playerMinY && target.y < playerMaxY &&
        target.z + 1 > camera.position.z - PLAYER_RADIUS && target.z < camera.position.z + PLAYER_RADIUS;
      if (intersectsPlayer) return;

      lastActionRef.current = now;
      store.setBlock(target.x, target.y, target.z, selectedType);
      store.removeFromInventory(store.selectedSlot, 1);
    }
  });

  return (
    <mesh ref={outlineRef} visible={false}>
      <boxGeometry args={[1.01, 1.01, 1.01]} />
      <meshBasicMaterial color="white" wireframe transparent opacity={0.7} depthTest={false} />
    </mesh>
  );
};

export default Player;
