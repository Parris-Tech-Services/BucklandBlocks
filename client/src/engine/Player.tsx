import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { Controls } from '../App';
import { performRaycast, type RaycastHit } from './raycast';
import { BlockType, getBlockDrops, isBlockSolid } from './blocks';
import { useGame } from '../lib/stores/useGame';
// hasSave() is Codex's public API (save.ts) for whether a save exists.
// Applying a *loaded* transform to the camera is Codex's contract to
// implement (see OWNERSHIP.md); this file only avoids fighting a save that's
// about to be restored by skipping its own default spawn in that case.
import { hasSave } from './save';
import { moveAxisWithCollision, collidesAt, PLAYER_HALF_WIDTH, HEAD_ROOM } from './collision';

const PLAYER_HEIGHT = 1.8;
const PLAYER_SPEED = 6;      // Slightly faster movement
const JUMP_FORCE = 10;      // Higher jumps
const GRAVITY = -25;        // Faster falling
const AIR_CONTROL = 0.3;    // Some control while in air
const WORLD_HEIGHT = 128;
const DEFAULT_GROUND_Y = 64;

const Player: React.FC = () => {
  const { camera } = useThree();
  const [, getKeys] = useKeyboardControls<Controls>();
  
  const {
    selectedSlot,
    setSelectedSlot,
    inventory,
    inventoryCounts,
    addToInventory,
    removeFromInventory,
    setBlock,
    getBlock,
    getChunk,
    markChunkDirty
  } = useGame();
  
  const velocityRef = useRef(new THREE.Vector3());
  const onGroundRef = useRef(false);
  const targetBlockRef = useRef<{
    position: THREE.Vector3;
    normal: THREE.Vector3;
    blockType: BlockType;
  } | null>(null);
  const mouseButtonsRef = useRef({ mine: false, place: false });
  const [targetBlock, setTargetBlock] = useState<RaycastHit | null>(null);
  
  const miningTimeRef = useRef(0);
  const lastMineRef = useRef(0);

  // Finds a safe spawn eye-height at world column (x, z): any solid block
  // (ground, or the top of a tree — you can physically stand on either) with
  // the player's actual volume verified clear above it. Excluding specific
  // block *types* (e.g. tree trunks) from being valid ground is not enough
  // on its own and can make the search impossible: a trunk sitting directly
  // on the excluded ground block, with no gap between them, has nowhere
  // meeting both "is ground" and "has clearance" at any height in that
  // column. Checking clearance directly, for whatever is actually solid, is
  // both simpler and correct.
  const findSurfaceY = (x: number, z: number): number => {
    for (let y = WORLD_HEIGHT - 2; y >= 0; y--) {
      const blockType = getBlock(x, y, z);
      if (!isBlockSolid(blockType)) continue;

      const eyeY = y + 1 + PLAYER_HEIGHT;
      // Validate standing at the *centre* of column (x, z), matching where
      // the caller actually places the player (see the spawn effect below).
      // Checking the integer corner instead would let the ±half-width check
      // straddle into the neighbouring column and reject valid spawns based
      // on unrelated terrain there.
      const candidate = new THREE.Vector3(x + 0.5, eyeY, z + 0.5);
      if (!collidesAt(candidate, PLAYER_HEIGHT, getBlock)) {
        return eyeY;
      }
      // Ground here is real, but something (e.g. a tree trunk) occupies the
      // headroom above it — keep searching further down.
    }
    return DEFAULT_GROUND_Y + PLAYER_HEIGHT;
  };

  // One-time safe default spawn: wait for the spawn chunk to actually exist
  // (getChunk distinguishes "not generated yet" from "generated and empty" —
  // getBlock cannot, it returns AIR for both), then stand on the highest
  // non-decoration solid block with headroom above. Skipped entirely when a
  // save exists — applying the *restored* transform is Codex's contract
  // (see OWNERSHIP.md); this only covers the fresh-start case so a new
  // player doesn't spawn embedded in terrain or fall through an ungenerated
  // world.
  useEffect(() => {
    if (hasSave()) return;
    let cancelled = false;
    const trySpawn = () => {
      if (cancelled) return;
      if (!getChunk(0, 0)) {
        requestAnimationFrame(trySpawn);
        return;
      }
      // Centre of column (0, 0) — must match the point findSurfaceY validates.
      camera.position.set(0.5, findSurfaceY(0, 0), 0.5);
      velocityRef.current.set(0, 0, 0);
    };
    trySpawn();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClick = () => {
      document.body.requestPointerLock();
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 0) mouseButtonsRef.current.mine = true;
      if (event.button === 2) {
        event.preventDefault();
        mouseButtonsRef.current.place = true;
      }
    };
    const handleMouseUp = (event: MouseEvent) => {
      if (event.button === 0) mouseButtonsRef.current.mine = false;
      if (event.button === 2) mouseButtonsRef.current.place = false;
    };
    const stopContextMenu = (event: MouseEvent) => event.preventDefault();
    const clearMouseButtons = () => {
      mouseButtonsRef.current.mine = false;
      mouseButtonsRef.current.place = false;
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', clearMouseButtons);
    window.addEventListener('contextmenu', stopContextMenu);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', clearMouseButtons);
      window.removeEventListener('contextmenu', stopContextMenu);
    };
  }, []);

  useEffect(() => {
    const handleHotbarSelect = (event: CustomEvent) => {
      setSelectedSlot(event.detail);
    };

    window.addEventListener('hotbarSelect', handleHotbarSelect as EventListener);
    return () => window.removeEventListener('hotbarSelect', handleHotbarSelect as EventListener);
  }, [setSelectedSlot]);

  useEffect(() => {
    // Three.js's default Euler order ('XYZ') applies pitch (x) around the
    // camera's *original* X axis before yaw (y) is applied on top of it —
    // so pitch is only really "up/down" when facing the initial direction.
    // Turn around (yaw ~180°) and the same pitch rotation reads as visually
    // inverted; at yaw ~90°/270° it does nothing at all. 'YXZ' applies yaw
    // first (around the fixed world-up axis), then pitch around the
    // resulting local X axis, which is what a first-person camera needs:
    // pitch behaves identically no matter which way you're facing.
    camera.rotation.order = 'YXZ';

    const handleMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== document.body) return;

      const sensitivity = 0.002;
      camera.rotation.y -= event.movementX * sensitivity;
      camera.rotation.x -= event.movementY * sensitivity;
      camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [camera]);

  useFrame((state, delta) => {
    const keys = getKeys();
    const velocity = velocityRef.current;
    
    const direction = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    
    forward.y = 0;
    forward.normalize();
    right.y = 0;
    right.normalize();

    if (keys.forward) direction.add(forward);
    if (keys.backward) direction.sub(forward);
    if (keys.rightward) direction.add(right);
    if (keys.leftward) direction.sub(right);

    direction.normalize();
    
    // Apply movement based on ground state
    const speed = PLAYER_SPEED * (keys.sneak ? 0.5 : 1.0);
    const control = onGroundRef.current ? 1.0 : AIR_CONTROL;
    
    // Smooth acceleration
    const targetVelocity = direction.multiplyScalar(speed);
    velocity.x = THREE.MathUtils.lerp(velocity.x, targetVelocity.x, control);
    velocity.z = THREE.MathUtils.lerp(velocity.z, targetVelocity.z, control);

    if (keys.jump && onGroundRef.current) {
      velocity.y = JUMP_FORCE;
      onGroundRef.current = false;
    }

    velocity.y += GRAVITY * delta;

    // Don't simulate physics over a column whose chunk hasn't generated yet —
    // getBlock returns AIR for both "generated and empty" and "not generated
    // at all", so collision would silently treat unready terrain as open air
    // and the player would fall through it. Freeze in place until it exists;
    // the one-time spawn effect above handles first placement.
    const currentChunkX = Math.floor(camera.position.x / 16);
    const currentChunkZ = Math.floor(camera.position.z / 16);
    if (!getChunk(currentChunkX, currentChunkZ)) {
      velocity.set(0, 0, 0);
    } else {
      const moveDelta = velocity.clone().multiplyScalar(delta);
      moveAxisWithCollision(camera.position, velocity, 'x', moveDelta.x, PLAYER_HEIGHT, getBlock);
      moveAxisWithCollision(camera.position, velocity, 'z', moveDelta.z, PLAYER_HEIGHT, getBlock);
      const wasFalling = velocity.y <= 0;
      const blockedY = moveAxisWithCollision(camera.position, velocity, 'y', moveDelta.y, PLAYER_HEIGHT, getBlock);
      onGroundRef.current = blockedY && wasFalling;
    }

    const raycast = performRaycast(
      camera.position,
      camera.getWorldDirection(new THREE.Vector3()),
      5,
      getBlock
    );
    targetBlockRef.current = raycast;
    setTargetBlock((previous) => {
      if (!previous && (!raycast || raycast.distance <= 0.25)) return previous;
      if (raycast && raycast.distance <= 0.25) return null;
      if (previous && raycast && previous.position.equals(raycast.position)) return previous;
      return raycast;
    });

    const now = Date.now();
    
    if ((keys.mine || mouseButtonsRef.current.mine) && raycast && now - lastMineRef.current > 200) {
      lastMineRef.current = now;
      
      const { x, y, z } = raycast.position;
      const blockType = raycast.blockType;
      
      console.log(`Mining block at ${x}, ${y}, ${z}: ${blockType}`);
      
      setBlock(Math.floor(x), Math.floor(y), Math.floor(z), BlockType.AIR);
      
      const chunkX = Math.floor(Math.floor(x) / 16);
      const chunkZ = Math.floor(Math.floor(z) / 16);
      markChunkDirty(chunkX, chunkZ);
      
      const drops = getBlockDrops(blockType);
      drops.forEach(drop => addToInventory(drop.id, drop.count));
    }

    if ((keys.place || mouseButtonsRef.current.place) && raycast && now - lastMineRef.current > 200) {
      const selectedBlockType = inventory[selectedSlot];
      if (selectedBlockType && inventoryCounts[selectedSlot] > 0) {
        lastMineRef.current = now;
        
        const placePos = raycast.position.clone().add(raycast.normal);
        const { x, y, z } = placePos;
        
        const playerBox = new THREE.Box3(
          new THREE.Vector3(
            camera.position.x - PLAYER_HALF_WIDTH,
            camera.position.y - PLAYER_HEIGHT,
            camera.position.z - PLAYER_HALF_WIDTH
          ),
          new THREE.Vector3(
            camera.position.x + PLAYER_HALF_WIDTH,
            camera.position.y + HEAD_ROOM,
            camera.position.z + PLAYER_HALF_WIDTH
          )
        );
        
        const blockBox = new THREE.Box3(
          new THREE.Vector3(Math.floor(x), Math.floor(y), Math.floor(z)),
          new THREE.Vector3(Math.floor(x) + 1, Math.floor(y) + 1, Math.floor(z) + 1)
        );
        
        if (!playerBox.intersectsBox(blockBox)) {
          console.log(`Placing block at ${Math.floor(x)}, ${Math.floor(y)}, ${Math.floor(z)}: ${selectedBlockType}`);
          
          setBlock(Math.floor(x), Math.floor(y), Math.floor(z), selectedBlockType);
          
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
        // Terrain occupies [x, x+1) per axis (raycast.position is the voxel's
        // min corner), but a mesh's own position is its center — offset by
        // half a block or the wireframe straddles four neighbouring voxels
        // instead of wrapping the one actually targeted.
        <mesh
          position={[
            targetBlock.position.x + 0.5,
            targetBlock.position.y + 0.5,
            targetBlock.position.z + 0.5,
          ]}
        >
          <boxGeometry args={[1.01, 1.01, 1.01]} />
          <meshBasicMaterial color="white" wireframe opacity={0.5} transparent />
        </mesh>
      )}
    </>
  );
};

export default Player;
