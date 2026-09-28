import React from "react";
import { BlockType, BLOCKS } from "../engine/blocks";
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
    miningProgress,
  } = useGame();

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

      {miningProgress.active && (
        <div className="absolute top-1/2 left-1/2 mt-8 -translate-x-1/2 rounded bg-black/75 px-3 py-2 text-center text-white shadow-lg">
          <div className="text-xs font-semibold">{miningProgress.label}</div>
          {miningProgress.progress > 0 && (
            <>
              <div className="mt-1 h-2 w-40 overflow-hidden rounded bg-gray-700">
                <div
                  className="h-full bg-red-500 transition-[width] duration-75"
                  style={{ width: `${Math.round(miningProgress.progress * 100)}%` }}
                />
              </div>
              <div className="mt-1 text-[10px]">
                Hold LMB · {Math.round(miningProgress.progress * 100)}%
              </div>
            </>
          )}
        </div>
      )}

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
                className={`relative w-12 h-12 border-2 flex flex-col items-center justify-center text-white text-xs ${
                  isSelected ? "border-white bg-gray-700" : "border-gray-500 bg-gray-800"
                }`}
              >
                {blockType !== null && blockType !== BlockType.AIR && (
                  <>
                    <div className="text-[8px] font-bold">
                      {BLOCKS[blockType].name.slice(0, 3)}
                    </div>
                    <div className="text-[10px]">{count > 0 ? count : ""}</div>
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
