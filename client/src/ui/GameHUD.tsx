import React, { useEffect, useState } from "react";
import { BlockType, getBlockData } from "../engine/blocks";
import { useGame } from "../lib/stores/useGame";

const GameHUD: React.FC = () => {
  // All data comes from the store (updated by the in-Canvas HooksBridge)
  const {
    selectedSlot,
    inventory,
    inventoryCounts,
    gameTime,
    playerPosition,
    fps,
  } = useGame();


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

  // Same time-of-day display you had
  const timeOfDay = Math.floor((gameTime / 1000) % 24);
  const isNight = timeOfDay >= 18 || timeOfDay < 6;

  return (
    <div className="fixed inset-0 pointer-events-none select-none">
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
        <div>1-9: Hotbar</div>
      </div>


      {/* Hotbar Name Popup */}
      {popupName && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white font-bold text-xl drop-shadow-md animate-pulse font-mono transition-opacity" style={{ textShadow: '2px 2px 0 #000' }}>
          {popupName}
        </div>
      )}

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
                {blockType !== null && blockType !== BlockType.AIR && (
                  <>
                    <img src={getBlockData(blockType)?.texture} className="w-full h-full object-cover pixelated p-1" alt="" />
                    <div className="absolute top-0 left-0 right-0 truncate bg-black/60 px-0.5 text-[7px] font-bold leading-3" style={{ textShadow: '1px 1px 0 #000' }}>
                      {getBlockData(blockType)?.name}
                    </div>
                    <div className="absolute bottom-0 right-1 text-[10px] font-bold font-mono" style={{ textShadow: '1px 1px 0 #000' }}>{count > 0 ? count : ""}</div>
                  </>
                )}
                <div className="absolute bottom-0 right-0 text-[8px] text-gray-400">
                  {i + 1}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GameHUD;
