import React from "react";
import { BlockType, BLOCKS } from "../engine/blocks";
import { useGame } from "../lib/stores/useGame";
import { useSession } from "../engine/session";

const GameHUD: React.FC = () => {
  const selectedSlot = useGame((state) => state.selectedSlot);
  const inventory = useGame((state) => state.inventory);
  const inventoryCounts = useGame((state) => state.inventoryCounts);
  const gameTime = useGame((state) => state.gameTime);
  const playerPosition = useGame((state) => state.playerPosition);
  const fps = useGame((state) => state.fps);
  const menu = useSession((state) => state.menu);

  const timeOfDay = Math.floor(
    ((gameTime % 24000) / 24000) * 24,
  );
  const isNight = timeOfDay >= 18 || timeOfDay < 6;

  return (
    <div className="pointer-events-none fixed inset-0 select-none">
      {menu === null && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative h-4 w-4 opacity-80">
            <div className="absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-white" />
            <div className="absolute left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 -translate-y-1/2 bg-white" />
          </div>
        </div>
      )}

      <div className="absolute left-4 top-4 rounded bg-black/55 p-2 font-mono text-sm text-white">
        <div>FPS: {Math.round(fps)}</div>
        <div>
          XYZ: {playerPosition.x.toFixed(1)},{" "}
          {playerPosition.y.toFixed(1)},{" "}
          {playerPosition.z.toFixed(1)}
        </div>
        <div>
          Time: {timeOfDay}:00 {isNight ? "🌙" : "☀️"}
        </div>
        <div>Biome: Temperate</div>
      </div>

      <div className="absolute right-4 top-4 rounded bg-black/55 p-2 font-mono text-xs text-white">
        <div>WASD: Move · Space: Jump</div>
        <div>Mouse: Look</div>
        <div>LMB: Mine · RMB: Place</div>
        <div>E: Inventory · C: Crafting</div>
        <div>ESC: Pause · 1-9: Hotbar</div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <div className="flex space-x-1 rounded bg-black/75 p-2">
          {Array.from({ length: 9 }, (_, index) => {
            const blockType = inventory[index];
            const count = inventoryCounts[index];
            const selected = index === selectedSlot;

            return (
              <div
                key={index}
                className={`relative flex h-12 w-12 flex-col items-center justify-center border-2 text-xs text-white ${
                  selected
                    ? "border-white bg-gray-700"
                    : "border-gray-500 bg-gray-800"
                }`}
              >
                {blockType !== null &&
                  blockType !== BlockType.AIR && (
                    <>
                      <div className="text-[8px] font-bold">
                        {BLOCKS[blockType].name.slice(0, 4)}
                      </div>
                      <div className="text-[10px]">
                        {count > 0 ? count : ""}
                      </div>
                    </>
                  )}
                <div className="absolute bottom-0 right-0 text-[8px] text-gray-400">
                  {index + 1}
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
