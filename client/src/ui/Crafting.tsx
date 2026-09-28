import { useState } from 'react';
import { BlockType, BLOCKS } from '../engine/blocks';
import { craftSelection } from '../engine/crafting';
import { useGame } from '../lib/stores/useGame';

export default function Crafting({ onClose }: { onClose: () => void }) {
  const inventory = useGame(s => s.inventory);
  const counts = useGame(s => s.inventoryCounts);
  const [selected, setSelected] = useState<BlockType>(BlockType.WOOD_LOG);
  const [grid, setGrid] = useState<(BlockType | null)[]>([null, null, null, null]);
  const [message, setMessage] = useState('');
  const close = () => { setGrid([null, null, null, null]); onClose(); };
  const craft = () => {
    // Read fresh state at click time; commit both inventory arrays in one update.
    const state = useGame.getState();
    const slots = state.inventory.map((type, i) => type === null ? null : { type, count: state.inventoryCounts[i] });
    const result = craftSelection(slots, grid);
    if (!result.ok) { setMessage(result.error); return; }
    useGame.setState({
      inventory: result.slots.map(s => s?.type ?? null),
      inventoryCounts: result.slots.map(s => s?.count ?? 0),
    });
    setMessage('Crafted 4 wood planks. Consumed 1 wood log.');
  };
  return <div role="dialog" aria-modal="true" aria-labelledby="craft-title"
    onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div className="bg-gray-800 p-4 rounded text-white w-full max-w-md max-h-full overflow-auto">
      <h2 id="craft-title">Crafting (2×2)</h2>
      <p>Choose an ingredient, then click a cell. Click it again to clear.
        Ingredients stay in inventory until you craft. Closing or reloading loses nothing.</p>
      <div className="flex flex-wrap gap-2 my-3">
        {Array.from(new Set(inventory.filter((x): x is BlockType => x !== null && x !== BlockType.AIR))).map(type =>
          <button key={type} aria-pressed={selected === type} onClick={() => setSelected(type)}
            className="border p-2">{BLOCKS[type]?.name ?? 'Unknown'} × {inventory.reduce((n, t, i) => n + (t === type ? counts[i] : 0), 0)}</button>)}
      </div>
      <div className="grid grid-cols-2 gap-2 my-4">
        {grid.map((type, i) => <button key={i} className="border p-3"
          aria-label={'Crafting slot ' + (i + 1) + ': ' + (type === null ? 'empty' : BLOCKS[type].name)}
          onClick={() => setGrid(g => g.map((t, j) => j === i ? (t === selected ? null : selected) : t))}>
          {type === null ? 'Empty' : BLOCKS[type].name}
        </button>)}
      </div>
      <button onClick={craft} className="border p-3">Craft wood planks × 4</button>
      <button onClick={close} className="border p-3">Close crafting</button>
      <p role="status">{message}</p>
      <p className="text-sm mt-3">Recipe: one wood log in any cell → four wood planks.
        Sticks, tools and 3×3 recipes are not implemented.</p>
    </div>
  </div>;
}
