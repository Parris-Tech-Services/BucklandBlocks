import React, { useState } from "react";
import { FolderOpen, Play, Save, Settings, Trash2, Home } from "lucide-react";
import { useGame } from "../lib/stores/useGame";

interface PauseMenuProps {
  onClose: () => void;
}

const PauseMenu: React.FC<PauseMenuProps> = ({ onClose }) => {
  const [status, setStatus] = useState<string>("");
  const [hasSave, setHasSave] = useState(
    () => localStorage.getItem("buckland_blocks_save") !== null,
  );

  const handleResume = () => {
    onClose();

    const canvas = document.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) return;

    try {
      const result = canvas.requestPointerLock();
      if (result instanceof Promise) {
        result.catch(() => {
          // The game remains usable; the next canvas click can request lock again.
        });
      }
    } catch {
      // Pointer lock can be denied by the browser without making resume fail.
    }
  };

  const handleSave = () => {
    try {
      const state = useGame.getState();
      const chunks = Array.from(state.chunks.entries())
        .filter(([, chunk]) => chunk.dirty)
        .map(([key, chunk]) => ({
          key,
          voxelData: Array.from(chunk.voxelData),
        }));

      const saveData = {
        version: 2,
        playerPosition: {
          x: state.playerPosition.x,
          y: state.playerPosition.y,
          z: state.playerPosition.z,
        },
        playerRotation: { ...state.playerRotation },
        inventory: [...state.inventory],
        inventoryCounts: [...state.inventoryCounts],
        selectedSlot: state.selectedSlot,
        gameTime: state.gameTime,
        chunks,
        timestamp: Date.now(),
      };

      localStorage.setItem("buckland_blocks_save", JSON.stringify(saveData));
      setHasSave(true);
      setStatus("World saved.");
    } catch (error) {
      console.error("Failed to save world:", error);
      setStatus("Save failed. Browser storage may be full or unavailable.");
    }
  };

  const handleLoad = () => {
    try {
      const raw = localStorage.getItem("buckland_blocks_save");
      if (!raw) {
        setStatus("No saved world found.");
        return;
      }

      JSON.parse(raw);
      window.location.reload();
    } catch (error) {
      console.error("Failed to load world:", error);
      setStatus("The saved world could not be read. It has not been deleted.");
    }
  };

  const handleNewWorld = () => {
    if (!window.confirm("Start a new world? This deletes the saved Buckland Blocks world in this browser.")) {
      return;
    }

    localStorage.removeItem("buckland_blocks_save");
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-sm rounded-lg border-2 border-gray-400 bg-gray-800 p-5">
        <h2 className="mb-5 text-center text-2xl font-bold text-white">Buckland Blocks</h2>

        <div className="space-y-3">
          <button
            onClick={handleResume}
            className="flex w-full items-center gap-3 rounded bg-gray-700 px-4 py-3 text-white transition-colors hover:bg-gray-600"
          >
            <Play size={20} />
            <span>Resume Game</span>
          </button>

          <button
            onClick={handleSave}
            className="flex w-full items-center gap-3 rounded bg-gray-700 px-4 py-3 text-white transition-colors hover:bg-gray-600"
          >
            <Save size={20} />
            <span>Save World</span>
          </button>

          <button
            onClick={handleLoad}
            disabled={!hasSave}
            className="flex w-full items-center gap-3 rounded bg-gray-700 px-4 py-3 text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FolderOpen size={20} />
            <span>Load World</span>
          </button>

          <button
            disabled
            className="flex w-full cursor-not-allowed items-center gap-3 rounded bg-gray-700 px-4 py-3 text-gray-400 opacity-60"
          >
            <Settings size={20} />
            <span>Settings (not available yet)</span>
          </button>

          <button
            onClick={handleNewWorld}
            className="flex w-full items-center gap-3 rounded bg-red-700 px-4 py-3 text-white transition-colors hover:bg-red-600"
          >
            <Trash2 size={20} />
            <span>New World</span>
          </button>

          <button
            disabled
            className="flex w-full cursor-not-allowed items-center gap-3 rounded bg-gray-700 px-4 py-3 text-gray-400 opacity-60"
          >
            <Home size={20} />
            <span>Main Menu (not available yet)</span>
          </button>
        </div>

        {status && <div className="mt-4 text-center text-sm text-emerald-300">{status}</div>}

        <div className="mt-5 text-center text-sm text-gray-400">
          <div>Press ESC to resume</div>
          <div className="mt-1 text-xs">Buckland Blocks repair preview</div>
        </div>
      </div>
    </div>
  );
};

export default PauseMenu;
