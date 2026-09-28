import { useState } from 'react';
import { initialSave, useGame } from '../lib/stores/useGame';
import { deleteSave, readSave, writeSave } from '../engine/save';
import { isSfxMuted, saveSoundEnabled, setSfxMuted } from '../engine/sfx';
import { isFeatureOn } from '../engine/features';

export default function PauseMenu({ onClose, canResume = true }: { onClose: () => void; canResume?: boolean }) {
  const [message, setMessage] = useState<string | null>(initialSave.error);
  const [soundMuted, setSoundMuted] = useState(isSfxMuted);
  const toggleSound = () => {
    const muted = !soundMuted;
    setSfxMuted(muted);
    setSoundMuted(muted);
    try {
      saveSoundEnabled(!muted, window.localStorage);
    } catch {
      // Storage unavailable: the choice still applies for this session.
    }
  };
  const save = () => {
    try {
      const state = useGame.getState();
      writeSave({ playerPosition: { ...state.playerPosition }, playerRotation: state.playerRotation,
        inventory: { slots: state.inventory, counts: state.inventoryCounts, selectedSlot: state.selectedSlot },
        gameTime: state.gameTime,
        worldSeed: state.worldSeed,
        chunks: Array.from(state.chunks, ([key, chunk]) => {
          if (!chunk.dirty) return null;
          const [x, z] = key.split(',').map(Number);
          return { x, z, voxelData: chunk.voxelData, timestamp: Date.now() };
        }).filter((chunk): chunk is {
          x: number;
          z: number;
          voxelData: Uint8Array;
          timestamp: number;
        } => chunk !== null) });
      setMessage('World saved on this device.');
    } catch {
      setMessage('Save failed. Your previous save has not been replaced. Check browser storage space or access.');
    }
  };
  const load = () => {
    try {
      const result = readSave();
      if (result.error || !result.data) { setMessage(result.error ?? 'No saved world on this device.'); return; }
      if (window.confirm('Load your saved world? Unsaved changes will be lost.')) window.location.reload();
    } catch { setMessage('Browser storage is unavailable.'); }
  };
  const startNew = () => {
    if (!window.confirm('Start a new world? Unsaved progress will be lost. The previous save will be backed up on this device.')) return;
    try { deleteSave(); window.location.reload(); }
    catch { setMessage('Could not back up the previous world. Nothing was deleted.'); }
  };
  return <div role="dialog" aria-modal="true" aria-labelledby="pause-title"
    className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
    <div className="bg-gray-800 border-2 border-gray-400 p-6 rounded-lg text-white w-full max-w-sm max-h-full overflow-auto">
      <h2 id="pause-title" className="text-2xl font-bold mb-4">Buckland Blocks</h2>
      <p className="mb-4">Paused. Resume captures your mouse; Escape releases it.</p>
      <div className="space-y-3">
        <button autoFocus disabled={!canResume} onClick={onClose} className="w-full p-3 bg-gray-700 rounded disabled:opacity-50">Resume Game</button>
        <button disabled={!!initialSave.error || !canResume} onClick={save} className="w-full p-3 bg-gray-700 rounded disabled:opacity-50">Save World</button>
        <button onClick={load} className="w-full p-3 bg-gray-700 rounded">Load World</button>
        {isFeatureOn('soundtoggle') && (
          <button onClick={toggleSound} aria-pressed={!soundMuted} className="w-full p-3 bg-gray-700 rounded">Sound: {soundMuted ? 'Off' : 'On'}</button>
        )}
        <button onClick={startNew} className="w-full p-3 bg-red-800 rounded">New World</button>
      </div>
      {message && <p role="status" className="mt-4">{message}</p>}
    </div>
  </div>;
}
