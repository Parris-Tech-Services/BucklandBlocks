import React, { useEffect, useState } from "react";
import { BlockType, getBlockData } from "../engine/blocks";
import { useGame } from "../lib/stores/useGame";
import ItemIcon from "./ItemIcon";
import { useSession } from "../engine/session";

const GameHUD: React.FC = () => {
  // All data comes from the store (updated by the in-Canvas HooksBridge)
  const {
    selectedSlot,
    inventory,
    inventoryCounts,
    gameTime,
    playerPosition,
    fps,
    health,
    respawn,
    worldSeed,
  } = useGame();
  const menu = useSession((state) => state.menu);
  const setMenu = useSession((state) => state.setMenu);
  const hudVisible = useSession((state) => state.hudVisible);
  const viewDistance = useSession((state) => state.viewDistance);


  const [popupName, setPopupName] = useState<string | null>(null);
  
  useEffect(() => {
    const type = inventory[selectedSlot];
    if (type !== null) {
      setPopupName(getBlockData(type)?.name || null);
      const timer = setTimeout(() => setPopupName(null), 2000);
      return () => clearTimeout(timer);
    } else {
      setPopupName(null);
    }
  }, [selectedSlot, inventory]);

  useEffect(() => {
    if (health <= 0 && menu !== "death") {
      setMenu("death");
    }
  }, [health, menu, setMenu]);

  const handleRespawn = () => {
    respawn();
    window.dispatchEvent(new Event("playerRespawn"));
    // Pointer lock was released when the death menu opened. Return to Pause
    // so Resume can reacquire mouse capture through the tested path.
    setMenu("pause");
  };

  // Same time-of-day display you had
  const timeOfDay = Math.floor(((gameTime % 24000) / 24000) * 24);
  const isNight = timeOfDay >= 18 || timeOfDay < 6;
  const displayedHealth = Math.max(0, Math.min(20, health));

  return (
    <div className="fixed inset-0 pointer-events-none select-none">
      {hudVisible && (
        <>
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative w-4 h-4 border-2 border-white opacity-75">
          <div className="absolute top-1/2 left-1/2 w-0.5 h-4 bg-white -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 w-4 h-0.5 bg-white -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* HUD Info */}
      <div className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded font-mono text-sm">
        <div>FPS: {Math.round(fps)}</div>
        <div>
          XYZ: {playerPosition.x.toFixed(1)}, {playerPosition.y.toFixed(1)},{" "}
          {playerPosition.z.toFixed(1)}
        </div>
        <div>
          Time: {timeOfDay}:00 {isNight ? "🌙" : "☀️"}
        </div>
        <div>Biome: Temperate</div>
        <div>Seed: {worldSeed}</div>
        <div>View: {viewDistance} chunk{viewDistance === 1 ? "" : "s"}</div>
      </div>

      {/* Controls Help */}
      <div className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded font-mono text-xs">
        <div>WASD: Move</div>
        <div>Mouse: Look</div>
        <div>Space: Jump</div>
        <div>LMB: Mine</div>
        <div>RMB: Place</div>
        <div>E: Inventory</div>
        <div>C: Crafting</div>
        <div>ESC: Pause</div>
        <div>1-9 / Wheel: Hotbar</div>
        <div>Q: Drop stack</div>
        <div>Shift+Q: Drop one</div>
        <div>F1: Toggle HUD</div>
        <div>+/-: View distance</div>
      </div>


      {/* Hotbar Name Popup */}
      {popupName && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white font-bold text-xl drop-shadow-md animate-pulse font-mono transition-opacity" style={{ textShadow: '2px 2px 0 #000' }}>
          {popupName}
        </div>
      )}

      {/* Minecraft-style health bar */}
      <div
        className="absolute bottom-[4.5rem] left-1/2 -translate-x-1/2 flex gap-0.5 rounded bg-black/35 px-1 py-0.5"
        role="img"
        aria-label={`Health: ${displayedHealth} out of 20`}
      >
        {Array.from({ length: 10 }, (_, i) => {
          const heartHealth = Math.max(
            0,
            Math.min(2, displayedHealth - i * 2),
          );
          const fill =
            heartHealth === 2
              ? "100%"
              : heartHealth === 1
                ? "50%"
                : "0%";

          return (
            <span
              key={i}
              className="relative inline-block h-4 w-4 text-center text-[18px] leading-4"
              aria-hidden="true"
            >
              <span
                className="absolute inset-0 text-black"
                style={{ textShadow: "1px 1px 0 #000" }}
              >
                ♥
              </span>
              <span
                className="absolute inset-y-0 left-0 overflow-hidden text-red-600"
                style={{
                  width: fill,
                  textShadow: "1px 1px 0 #520000",
                }}
              >
                <span className="inline-block w-4">♥</span>
              </span>
            </span>
          );
        })}
      </div>

      {/* Hotbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <div className="flex space-x-1 bg-black/75 p-2 rounded">
          {Array.from({ length: 9 }, (_, i) => {
            const blockType = inventory[i];
            const count = inventoryCounts[i];
            const isSelected = i === selectedSlot;

            return (
              <div
                key={i}
                title={blockType !== null ? getBlockData(blockType)?.name : "Empty"}
                className={`relative w-12 h-12 border-2 flex flex-col items-center justify-center text-white text-xs ${
                  isSelected ? "border-white bg-gray-700" : "border-gray-500 bg-gray-800"
                }`}
              >
                {blockType !== null && <ItemIcon type={blockType} count={count} />}
                <div className="absolute bottom-0 right-0 text-[8px] text-gray-400">
                  {i + 1}
                </div>
              </div>
            );
          })}
        </div>
      </div>


        </>
      )}
      {menu === "death" && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/65">
          <div className="rounded border-2 border-red-700 bg-black/90 px-10 py-8 text-center text-white shadow-2xl">
            <h2 className="font-mono text-4xl font-bold text-red-500">
              You Died
            </h2>
            <p className="mt-3 font-mono text-lg">
              Health reached zero.
            </p>
            <button
              type="button"
              onClick={handleRespawn}
              className="mt-6 rounded border-2 border-white bg-gray-800 px-8 py-3 font-mono text-lg font-bold hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-white"
            >
              Respawn
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameHUD;
