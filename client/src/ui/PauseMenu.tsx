import { useState } from "react";
import { Play, Save, FolderOpen, Trash2 } from "lucide-react";
import { useGame } from "../lib/stores/useGame";
import { deleteSave, loadWorld, readSaveStatus, saveWorld } from "../engine/save";

interface PauseMenuProps {
  onResume: () => void;
}

export default function PauseMenu({ onResume }: PauseMenuProps) {
  const [notice, setNotice] = useState("");
  const [confirmLoad, setConfirmLoad] = useState(false);
  const [confirmNewWorld, setConfirmNewWorld] = useState(false);
  const state = useGame();
  const saveStatus = readSaveStatus();

  const handleSave = () => {
    const result = saveWorld({
      version: 2,
      seed: "procedural-v1",
      chunks: Array.from(state.chunks, ([key, chunk]) => ({
        key,
        voxelData: Array.from(chunk.voxelData),
      })),
      inventory: [...state.inventory],
      inventoryCounts: [...state.inventoryCounts],
      selectedSlot: state.selectedSlot,
      playerPosition: { x: state.playerPosition.x, y: state.playerPosition.y, z: state.playerPosition.z },
      playerRotation: { x: state.playerRotation.x, y: state.playerRotation.y },
      gameTime: state.gameTime,
      timestamp: Date.now(),
    });
    setNotice(result.ok ? "World saved on this device." : `Could not save: ${result.error}`);
  };

  const handleLoad = () => {
    const save = loadWorld();
    if (!save) {
      setNotice("The saved world is invalid or unavailable. Its data was kept unchanged.");
      return;
    }
    state.restoreWorld(save);
    setNotice("");
    setConfirmLoad(false);
    onResume();
  };

  const handleNewWorld = () => {
    const result = deleteSave();
    if (!result.ok) {
      setNotice(`Could not remove the old save: ${result.error}`);
      return;
    }
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-3" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <section className="my-auto w-full max-w-sm rounded-lg border-2 border-gray-400 bg-gray-800 p-5 text-white shadow-xl">
        <h2 id="pause-title" className="mb-5 text-center text-2xl font-bold">Buckland Blocks</h2>
        <div className="space-y-3">
          <button onClick={onResume} className="flex w-full items-center gap-3 rounded bg-gray-700 px-4 py-3 hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
            <Play size={20} /><span>Resume Game</span>
          </button>
          <button onClick={handleSave} className="flex w-full items-center gap-3 rounded bg-gray-700 px-4 py-3 hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
            <Save size={20} /><span>Save World</span>
          </button>
          {saveStatus.exists && saveStatus.valid && !confirmLoad && (
            <button onClick={() => setConfirmLoad(true)} className="flex w-full items-center gap-3 rounded bg-gray-700 px-4 py-3 hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              <FolderOpen size={20} /><span>Load saved world…</span>
            </button>
          )}
          {confirmLoad && <div className="rounded border border-amber-400 p-3 text-sm" role="alert">
            Loading replaces the current unsaved world.
            <div className="mt-3 flex gap-2">
              <button onClick={handleLoad} className="rounded bg-amber-700 px-3 py-2 hover:bg-amber-600">Confirm load</button>
              <button onClick={() => setConfirmLoad(false)} className="rounded bg-gray-700 px-3 py-2 hover:bg-gray-600">Cancel</button>
            </div>
          </div>}
          {saveStatus.exists && !saveStatus.valid && <p className="rounded border border-amber-400 p-3 text-sm" role="status">A saved world could not be validated ({saveStatus.message}). It has not been deleted.</p>}
          {!confirmNewWorld ? (
            <button onClick={() => setConfirmNewWorld(true)} className="flex w-full items-center gap-3 rounded bg-red-800 px-4 py-3 hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              <Trash2 size={20} /><span>Start New World…</span>
            </button>
          ) : <div className="rounded border border-red-400 p-3 text-sm" role="alert">
            This permanently removes the saved world on this device.
            <div className="mt-3 flex gap-2">
              <button onClick={handleNewWorld} className="rounded bg-red-800 px-3 py-2 hover:bg-red-700">Delete save and restart</button>
              <button onClick={() => setConfirmNewWorld(false)} className="rounded bg-gray-700 px-3 py-2 hover:bg-gray-600">Cancel</button>
            </div>
          </div>}
        </div>
        {notice && <p className="mt-4 rounded border border-amber-400 p-3 text-sm" role="status">{notice}</p>}
        <p className="mt-5 text-center text-sm text-gray-300">Press Escape to resume</p>
      </section>
    </div>
  );
}
