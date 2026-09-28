import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { gameInput } from "./input";
import { isGameplayActive, useSession } from "./session";
import { performRaycast, type RaycastHit } from "./raycast";
import { BlockType, getBlockData, getBlockDrops, isBlockSolid } from "./blocks";
import { heldTool, idleMining, stepMining } from "./mining";
import { createHitTimer, playBreak, playHit, playPlace } from "./sfx";
import { blockEntityContents, blockEntityKey, interactionMenuFor, newBlockEntity, resolveRightClick } from "./blockEntities";
import { hasSolidSupport } from "./placement";
import { isFeatureOn } from "./features";
import { getFallDamage } from "./physics";
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


const Hand: React.FC<{ miningProgressRef: React.MutableRefObject<number> }> = ({ miningProgressRef }) => {
  const { camera } = useThree();
  const { inventory, selectedSlot } = useGame();
  const handRef = useRef<THREE.Group>(null);
  
  const blockType = inventory[selectedSlot];
  const blockData = blockType !== null ? getBlockData(blockType) : null;
  
  useFrame((state) => {
    if (!handRef.current) return;
    const time = state.clock.getElapsedTime();
    const miningProgress = miningProgressRef.current;
    const isMining = miningProgress > 0;
    
    let targetX = 0.5;
    let targetY = -0.5 + Math.sin(time * 2) * 0.02;
    let targetZ = -1;
    let rotX = 0;
    let rotZ = 0;
    
    if (isMining) {
      const swing = (miningProgress * 15) % (Math.PI * 2);
      targetY += Math.sin(swing) * 0.2;
      targetZ -= Math.sin(swing) * 0.2;
      rotX = -Math.sin(swing) * 0.5;
      rotZ = Math.sin(swing) * 0.2;
    }
    
    handRef.current.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.2);
    handRef.current.rotation.x = THREE.MathUtils.lerp(handRef.current.rotation.x, rotX, 0.2);
    handRef.current.rotation.z = THREE.MathUtils.lerp(handRef.current.rotation.z, rotZ, 0.2);
  });

  if (!blockData) return null;

  return createPortal(
    <group ref={handRef}>
      {/* 3D Item in hand */}
      <mesh scale={blockData.isTool ? 0.6 : 0.3} rotation={[0, -Math.PI / 4, 0]}>
        <boxGeometry />
        <meshBasicMaterial color={blockData.isTool ? "gray" : "brown"} />
      </mesh>
    </group>,
    camera
  );
};


const BlockDamageOverlay: React.FC<{ targetBlock: any, miningProgressRef: React.MutableRefObject<number>, getBlockData: any }> = ({ targetBlock, miningProgressRef, getBlockData }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (!meshRef.current) return;
    const progress = miningProgressRef.current;
    if (progress > 0 && targetBlock) {
      const ratio = Math.min(1, progress);
      meshRef.current.visible = true;
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = ratio * 0.8;
    } else {
      meshRef.current.visible = false;
    }
  });
  
  if (!targetBlock || targetBlock.distance <= 0.25) return null;
  
  return (
    <group position={[targetBlock.position.x + 0.5, targetBlock.position.y + 0.5, targetBlock.position.z + 0.5]}>
      <mesh>
        <boxGeometry args={[1.01, 1.01, 1.01]} />
        <meshBasicMaterial color="white" wireframe opacity={0.5} transparent />
      </mesh>
      <mesh ref={meshRef} visible={false}>
        <boxGeometry args={[1.005, 1.005, 1.005]} />
        <meshBasicMaterial color="black" transparent depthWrite={false} />
      </mesh>
    </group>
  );
};

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
    damagePlayer,
  } = useGame();

  const velocityRef = useRef(new THREE.Vector3());
  const onGroundRef = useRef(false);
  const [targetBlock, setTargetBlock] = useState<RaycastHit | null>(null);
  const lastActionRef = useRef(0);
  const miningProgressRef = useRef(0);
  const miningRef = useRef(idleMining());
  const hitTimerRef = useRef(createHitTimer());
  const fallStartYRef = useRef<number | null>(null);

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
    const handleRespawn = () => {
      const spawnY = findSurfaceY(0, 0);
      camera.position.set(0.5, spawnY, 0.5);
      camera.rotation.set(0, 0, 0, "YXZ");
      velocityRef.current.set(0, 0, 0);
      onGroundRef.current = false;
      fallStartYRef.current = null;
      useGame.setState({
        playerPosition: camera.position.clone(),
        playerRotation: {
          x: camera.rotation.x,
          y: camera.rotation.y,
        },
      });
    };

    window.addEventListener("playerRespawn", handleRespawn);
    return () =>
      window.removeEventListener("playerRespawn", handleRespawn);
    // The event listener intentionally uses the current camera and world state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const minePress = gameInput.consumeMousePress("mine");
    const placePress = gameInput.consumeMousePress("place");
    const mineActive = keys.mine || minePress;
    const placeActive = keys.place || placePress;
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

    const inWater = [
      Math.floor(camera.position.y),
      Math.floor(camera.position.y - 0.9),
      Math.floor(camera.position.y - PLAYER_HEIGHT),
    ].some(
      (y) =>
        getBlock(
          Math.floor(camera.position.x),
          y,
          Math.floor(camera.position.z),
        ) === BlockType.WATER,
    );

    const speed = inWater
      ? PLAYER_SPEED * (keys.sneak ? 0.35 : 0.65)
      : PLAYER_SPEED * (keys.sneak ? 0.5 : 1);
    const control = inWater
      ? 0.55
      : onGroundRef.current
        ? 1
        : AIR_CONTROL;

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

    if (inWater && keys.jump) {
      velocity.y = Math.max(velocity.y, 4.5);
    } else if (inWater && keys.sneak) {
      velocity.y = Math.min(velocity.y, -3.5);
    } else if (keys.jump && onGroundRef.current) {
      velocity.y = JUMP_FORCE;
      onGroundRef.current = false;
    }

    velocity.y += (inWater ? -3 : GRAVITY) * delta;
    if (inWater) {
      velocity.y = THREE.MathUtils.clamp(velocity.y, -4, 4.5);
    }

    if (!inWater && fallStartYRef.current === null && velocity.y < 0) {
      fallStartYRef.current = camera.position.y;
    }
    if (inWater) {
      fallStartYRef.current = null;
    }

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

    if (blockedY && wasFalling) {
      const fallDistance =
        fallStartYRef.current === null
          ? 0
          : fallStartYRef.current - camera.position.y;
      const damage = getFallDamage(fallDistance, inWater);
      if (damage > 0) {
        damagePlayer(damage);
      }
      fallStartYRef.current = null;
    }

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

    const miningTarget = raycast && raycast.distance > 0.25
      ? { key: `${raycast.position.x},${raycast.position.y},${raycast.position.z}`, blockType: raycast.blockType }
      : null;
    const broke = stepMining(
      miningRef.current,
      miningTarget,
      mineActive,
      heldTool(inventory[selectedSlot]),
      delta,
    );
    miningProgressRef.current = miningRef.current.progress;

    const canSoundMine =
      !!miningTarget && miningTarget.blockType !== BlockType.WATER && mineActive;
    if (hitTimerRef.current(canSoundMine, delta) && raycast) {
      playHit(raycast.blockType);
    }

    if (broke && raycast) {
      lastActionRef.current = now;

      const { x, y, z } = raycast.position;
      const blockType = raycast.blockType;

      playBreak(blockType);
      setBlock(
        Math.floor(x),
        Math.floor(y),
        Math.floor(z),
        BlockType.AIR,
      );

      // Breaking a furnace also hands back whatever was inside it.
      const entityKey = blockEntityKey(x, y, z);
      const { blockEntities, setBlockEntity } = useGame.getState();
      const contents = blockEntityContents(blockEntities[entityKey]);
      if (blockEntities[entityKey]) setBlockEntity(entityKey, null);

      const drops = [
        ...getBlockDrops(blockType),
        ...contents.map(({ type, count }) => ({ id: type, count })),
      ];
      drops.forEach((drop) => {
        const remaining = addToInventory(drop.id, drop.count);
        if (remaining > 0) {
          addDroppedItem(
            drop.id,
            remaining,
            new THREE.Vector3(
              Math.floor(x) + 0.5,
              Math.floor(y) + 0.5,
              Math.floor(z) + 0.5,
            ),
          );
        }
      });
    }

    if (
      placeActive &&
      raycast &&
      now - lastActionRef.current > 200
    ) {
      // Right-clicking a crafting table or furnace opens it rather than
      // placing a block against it (behind the openblocks flag).
      const game = useGame.getState();
      const action = resolveRightClick(
        { blockType: raycast.blockType, ...raycast.position },
        (key) => Boolean(game.blockEntities[key]),
      );
      if (action.kind === "open" && isFeatureOn("openblocks")) {
        lastActionRef.current = now;
        if (action.createEntity) {
          game.setBlockEntity(action.entityKey, newBlockEntity(action.entityKey, raycast.blockType));
        }
        gameInput.clear();
        useSession.setState({ menu: action.menu, currentEntityId: action.entityKey });
        return;
      }

      const selectedBlockType = inventory[selectedSlot];

      if (
        selectedBlockType !== null &&
        inventoryCounts[selectedSlot] > 0 &&
        getBlockData(selectedBlockType).placeable !== false
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

        const canPlace = hasSolidSupport(
          Math.floor(x),
          Math.floor(y),
          Math.floor(z),
          getBlock,
        );

        if (canPlace && !playerBox.intersectsBox(blockBox)) {
          setBlock(
            Math.floor(x),
            Math.floor(y),
            Math.floor(z),
            selectedBlockType,
          );
          playPlace(selectedBlockType);
          if (isFeatureOn("openblocks") && interactionMenuFor(selectedBlockType) === "furnace") {
            const entityKey = blockEntityKey(x, y, z);
            useGame.getState().setBlockEntity(entityKey, newBlockEntity(entityKey, selectedBlockType));
          }

          removeFromInventory(selectedSlot, 1);
        }
      }
    }
  });

  return (
    <>
      <Hand miningProgressRef={miningProgressRef} />
      <BlockDamageOverlay targetBlock={targetBlock} miningProgressRef={miningProgressRef} getBlockData={getBlockData} />
    </>
  );
};

export default Player;
