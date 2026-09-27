import React from "react";
import { BlockType, BLOCKS } from "../engine/blocks";
import { useGame } from "../lib/stores/useGame";

const GameHUD: React.FC = () => {
  const selectedSlot = useGame((state) => state.selectedSlot);
  const inventory = useGame((state) => state.inventory);
  const inventoryCounts = useGame((state) => state.inventoryCounts);
  const gameTime = useGame((state) => state.gameTime);
  const playerPosition = useGame((state) => state.playerPosition);
  const fps = useGame((state) => state.fps);
  const menu = useGame((state) => state.menu);

  const timeOfDay = Math.floor((gameTime / 1000) % 24);
  const isNight = timeOfDay >= 18 || timeOfDay < 6;

  return (
    <div className="fixed inset-0 pointer-events-none select-none">
      {menu === "none" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative w-4 h-4 opacity-80">
            <div className="absolute top-1/2 left-1/2 w-0.5 h-4 bg-white -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 w-4 h-0.5 bg-white -translate-x-1/2 -translate-y-1/2" />
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 bg-black/55 text-white p-2 rounded font-mono text-sm">
        <div>FPS: {Math.round(fps)}</div>
        <div>XYZ: {playerPosition.x.toFixed(1)}, {playerPosition.y.toFixed(1)}, {playerPosition.z.toFixed(1)}</div>
        <div>Time: {timeOfDay}:00 {isNight ? "🌙" : "☀️"}</div>
      </div>

      <div className="absolute top-4 right-4 bg-black/55 text-white p-2 rounded font-mono text-xs">
        <div>Click game: capture mouse</div>
        <div>WASD: Move · Space: Jump</div>
        <div>LMB: Mine · RMB: Place</div>
        <div>E: Inventory · C: Crafting</div>
        <div>ESC: Pause · 1-9: Hotbar</div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <div className="flex space-x-1 bg-black/75 p-2 rounded">
          {Array.from({ length: 9 }, (_, index) => {
            const blockType = inventory[index];
            const count = inventoryCounts[index];
            const isSelected = index === selectedSlot;
            return (
              <div key={index} className={`relative w-12 h-12 border-2 flex flex-col items-center justify-center text-white text-xs ${isSelected ? "border-white bg-gray-700" : "border-gray-500 bg-gray-800"}`}>
                {blockType !== null && blockType !== BlockType.AIR && (
                  <>
                    <div className="text-[8px] font-bold">{BLOCKS[blockType].name.slice(0, 4)}</div>
                    <div className="text-[10px]">{count > 0 ? count : ""}</div>
                  </>
                )}
                <div className="absolute bottom-0 right-0 text-[8px] text-gray-400">{index + 1}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GameHUD;
