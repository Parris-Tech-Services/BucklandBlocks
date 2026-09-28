import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { BlockType, getBlockData } from '../engine/blocks';
import ItemIcon from './ItemIcon';
import { useGame } from '../lib/stores/useGame';
import { RECIPES as recipes } from '../engine/recipes';

interface CraftingTableProps {
  onClose: () => void;
}

const CraftingTable: React.FC<CraftingTableProps> = ({ onClose }) => {
  const { 
    craftingTableGrid, craftingTableCounts, 
    cursorItem, setCursorItem, addToInventory
  } = useGame();
  
  const handleDropOutside = (e: React.MouseEvent) => {
    e.preventDefault();
    if (cursorItem) {
      const state = useGame.getState();
      const pos = state.playerPosition.clone();
      // Drop in front of player roughly
      pos.z -= 2;
      pos.y += 1;
      state.addDroppedItem(cursorItem.type, cursorItem.count, pos);
      useGame.setState({ cursorItem: null });
    }
  };
  
  const craftResult = useMemo(() => {
    let minRow = 3, maxRow = -1, minCol = 3, maxCol = -1;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (craftingTableGrid[r * 3 + c] !== null) {
          minRow = Math.min(minRow, r);
          maxRow = Math.max(maxRow, r);
          minCol = Math.min(minCol, c);
          maxCol = Math.max(maxCol, c);
        }
      }
    }
    
    if (maxRow === -1) return null;
    
    const w = maxCol - minCol + 1;
    const h = maxRow - minRow + 1;
    
    for (const r of recipes) {
      if (r.pattern.length !== h || r.pattern[0].length !== w) continue;
      
      let match = true;
      for (let pr = 0; pr < h; pr++) {
        for (let pc = 0; pc < w; pc++) {
          const gridItem = craftingTableGrid[(minRow + pr) * 3 + (minCol + pc)];
          const char = r.pattern[pr][pc];
          const expectedBlock = char === ' ' ? null : r.legend[char];
          
          if (gridItem !== expectedBlock) {
            match = false;
            break;
          }
        }
        if (!match) break;
      }
      if (match) return r;
    }
    return null;
  }, [craftingTableGrid]);

  const handleGridClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const state = useGame.getState();
    const newGrid = [...state.craftingTableGrid];
    const newCounts = [...state.craftingTableCounts];
    let newCursor = state.cursorItem ? { ...state.cursorItem } : null;
    
    const slotType = newGrid[index];
    const slotCount = newCounts[index];
    const rightClick = e.type === 'contextmenu' || e.button === 2;
    
    if (newCursor) {
      if (slotType === null) {
        const placeCount = rightClick ? 1 : newCursor.count;
        newGrid[index] = newCursor.type;
        newCounts[index] = placeCount;
        newCursor.count -= placeCount;
        if (newCursor.count <= 0) newCursor = null;
      } else if (slotType === newCursor.type) {
        const maxStack = getBlockData(slotType)?.maxStack ?? 64;
        const space = maxStack - slotCount;
        if (space > 0) {
          const placeCount = rightClick ? 1 : Math.min(space, newCursor.count);
          newCounts[index] += placeCount;
          newCursor.count -= placeCount;
          if (newCursor.count <= 0) newCursor = null;
        }
      } else {
        newGrid[index] = newCursor.type;
        newCounts[index] = newCursor.count;
        newCursor = { type: slotType, count: slotCount };
      }
    } else if (slotType !== null) {
      const takeCount = rightClick ? Math.ceil(slotCount / 2) : slotCount;
      newCursor = { type: slotType, count: takeCount };
      newCounts[index] -= takeCount;
      if (newCounts[index] <= 0) newGrid[index] = null;
    }
    
    useGame.setState({ craftingTableGrid: newGrid, craftingTableCounts: newCounts, cursorItem: newCursor });
  };

  const handleResultClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!craftResult) return;
    
    const state = useGame.getState();
    let newCursor = state.cursorItem ? { ...state.cursorItem } : null;
    const resultType = getBlockData(craftResult.result.type)?.id ?? craftResult.result.type;
    const resultCount = craftResult.result.count;
    
    if (e.shiftKey && !newCursor) {
      // Ingredients are consumed below, so anything that doesn't fit in the
      // inventory is dropped at the player's feet rather than lost.
      const remaining = state.addToInventory(resultType, resultCount);
      if (remaining > 0) {
        state.addDroppedItem(resultType, remaining, state.playerPosition.clone());
      }
      const newGrid = [...state.craftingTableGrid];
      const newCounts = [...state.craftingTableCounts];
      for (let i = 0; i < newGrid.length; i++) {
        if (newGrid[i] !== null) {
          newCounts[i]--;
          if (newCounts[i] <= 0) newGrid[i] = null;
        }
      }
      useGame.setState({ craftingTableGrid: newGrid, craftingTableCounts: newCounts });
      return;
    }
    
    if (!newCursor) {
      newCursor = { type: resultType, count: resultCount };
    } else if (newCursor.type === resultType) {
      const maxStack = getBlockData(resultType)?.maxStack ?? 64;
      if (newCursor.count + resultCount <= maxStack) {
        newCursor.count += resultCount;
      } else {
        return;
      }
    } else {
      return;
    }
    
    const newGrid = [...state.craftingTableGrid];
    const newCounts = [...state.craftingTableCounts];
    for (let i = 0; i < newGrid.length; i++) {
      if (newGrid[i] !== null) {
        newCounts[i]--;
        if (newCounts[i] <= 0) newGrid[i] = null;
      }
    }
    
    useGame.setState({ craftingTableGrid: newGrid, craftingTableCounts: newCounts, cursorItem: newCursor });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleDropOutside} onContextMenu={handleDropOutside}>
      <div className="bg-gray-800 border-2 border-gray-400 p-6 rounded-lg shadow-xl relative cursor-default max-w-md w-full" onClick={(e) => e.stopPropagation()} onContextMenu={(e) => e.preventDefault()}>
        <div className="flex justify-between items-center mb-6 border-b border-gray-600 pb-2">
          <h2 className="text-xl font-bold text-white">Crafting Table</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex justify-between items-center px-4">
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => {
              const blockType = craftingTableGrid[i];
              return (
                <div
                  key={i}
                  onMouseDown={(e) => handleGridClick(e, i)}
                  title={blockType !== null ? getBlockData(blockType)?.name : undefined}
                  className="w-12 h-12 bg-gray-700 border-2 border-gray-600 hover:border-gray-400 hover:bg-gray-600 transition-colors rounded cursor-pointer relative"
                >
                  {blockType !== null && <ItemIcon type={blockType} count={craftingTableCounts[i]} />}
                </div>
              );
            })}
          </div>
          
          <div className="text-4xl text-gray-500 font-bold">→</div>
          
          <div 
            onMouseDown={handleResultClick}
            title={craftResult ? getBlockData(craftResult.result.type)?.name : undefined}
            className="w-16 h-16 bg-gray-700 border-2 border-gray-500 hover:border-gray-300 transition-colors rounded cursor-pointer relative"
          >
            {craftResult && <ItemIcon type={craftResult.result.type} count={craftResult.result.count} />}
          </div>
        </div>
        {cursorItem && (
          <div className="fixed pointer-events-none z-[100]" style={{ left: '50%', top: '10%', transform: 'translate(-50%, -50%)' }}>
            <div className="w-12 h-12 border-2 border-white bg-gray-700 opacity-80">
              <ItemIcon type={cursorItem.type} count={cursorItem.count} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default CraftingTable;
