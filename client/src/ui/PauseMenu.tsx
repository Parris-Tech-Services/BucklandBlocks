import React, { useState } from "react";
import { FolderOpen, Home, Play, Save, Settings, Trash2 } from "lucide-react";
import { useGame } from "../lib/stores/useGame";

const SAVE_KEY = "buckland_blocks_save";

const PauseMenu: React.FC = () => {
  const setMenu = useGame((state) => state.setMenu);
  const saveGame = useGame((state) => state.saveGame);
  const hasSavedGame = useGame((state) => state.hasSavedGame);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = () => {
    const saved = saveGame();
    setMessage(saved ? "World saved." : "Save failed. Your existing save was left untouched.");
  };

  const handleNewWorld = () => {
    if (!window.confirm("Start a new world? This deletes the current local save.")) return;
    localStorage.removeItem(SAVE_KEY);
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border-2 border-gray-400 p-6 rounded-lg w-full max-w-sm">
        <h2 className="text-white text-2xl font-bold text-center mb-6">Buckland Blocks</h2>
        <div className="space-y-3">
          <button onClick={() => setMenu("none")} className="w-full flex items-center gap-3 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded">
            <Play size={20} /> <span>Resume Game</span>
          </button>
          <button onClick={handleSave} className="w-full flex items-center gap-3 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded">
            <Save size={20} /> <span>Save World</span>
          </button>
          {hasSavedGame && (
            <button onClick={() => window.location.reload()} className="w-full flex items-center gap-3 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded">
              <FolderOpen size={20} /> <span>Load Saved World</span>
            </button>
          )}
          <button disabled title="Settings are not implemented yet" className="w-full flex items-center gap-3 px-4 py-3 bg-gray-700/50 text-gray-400 rounded cursor-not-allowed">
            <Settings size={20} /> <span>Settings (coming later)</span>
          </button>
          <button onClick={handleNewWorld} className="w-full flex items-center gap-3 px-4 py-3 bg-red-700 hover:bg-red-600 text-white rounded">
            <Trash2 size={20} /> <span>New World</span>
          </button>
          <button disabled title="There is no separate main menu yet" className="w-full flex items-center gap-3 px-4 py-3 bg-gray-700/50 text-gray-400 rounded cursor-not-allowed">
            <Home size={20} /> <span>Main Menu (coming later)</span>
          </button>
        </div>
        {message && <div className="mt-4 text-center text-sm text-slate-200">{message}</div>}
        <div className="mt-5 text-center text-gray-400 text-sm">Press ESC to resume</div>
      </div>
    </div>
  );
};

export default PauseMenu;
