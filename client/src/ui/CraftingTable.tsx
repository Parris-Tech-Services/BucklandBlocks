import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { BlockType, getBlockData } from '../engine/blocks';
import { useGame } from '../lib/stores/useGame';
import recipesData from '../data/recipes.json';
import {
  craftIntoCursor,
  craftIntoInventory,
  findMatchingRecipe,
  interactWithCraftingSlot,
  type CraftingRecipe,
} from '../engine/craftingGrid';

interface CraftingTableProps {
  onClose: () => void;
}

const recipes = recipesData as unknown as CraftingRecipe[];

const CraftingTable: React.FC<CraftingTableProps> = ({ onClose }) => {
  const {
    craftingTableGrid,
    craftingTableCounts,
    cursorItem,
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
  
  const craftResult = useMemo(
    () => findMatchingRecipe(craftingTableGrid, 3, recipes),
    [craftingTableGrid],
  );

  const handleGridClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    const state = useGame.getState();
    const next = interactWithCraftingSlot(
      {
        grid: state.craftingTableGrid,
        counts: state.craftingTableCounts,
        cursor: state.cursorItem,
      },
      index,
      e.type === 'contextmenu' || e.button === 2,
    );

    useGame.setState({
      craftingTableGrid: next.grid,
      craftingTableCounts: next.counts,
      cursorItem: next.cursor,
    });
  };

  const handleResultClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!craftResult) return;

    const state = useGame.getState();
    const crafting = {
      grid: state.craftingTableGrid,
      counts: state.craftingTableCounts,
      cursor: state.cursorItem,
    };

    if (e.shiftKey && !state.cursorItem) {
      const transaction = craftIntoInventory(
        crafting,
        state.inventory,
        state.inventoryCounts,
        craftResult,
      );
      if (!transaction.ok) return;

      useGame.setState({
        craftingTableGrid: transaction.crafting.grid,
        craftingTableCounts: transaction.crafting.counts,
        inventory: transaction.inventory,
        inventoryCounts: transaction.inventoryCounts,
      });
      return;
    }

    const transaction = craftIntoCursor(crafting, craftResult);
    if (!transaction.ok) return;
    useGame.setState({
      craftingTableGrid: transaction.state.grid,
      craftingTableCounts: transaction.state.counts,
      cursorItem: transaction.state.cursor,
    });
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
                  {blockType !== null && (
                    <>
                      <img src={getBlockData(blockType)?.texture} alt="item" className="w-full h-full object-cover pixelated p-1" />
                      {craftingTableCounts[i] > 1 && (
                        <span className="absolute bottom-0 right-1 text-white text-xs font-bold font-mono" style={{ textShadow: '1px 1px 0 #000' }}>
                          {craftingTableCounts[i]}
                        </span>
                      )}
                    </>
                  )}
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
            {craftResult && (
              <>
                <img src={getBlockData(craftResult.result.type)?.texture} alt="result" className="w-full h-full object-cover pixelated p-2" />
                {craftResult.result.count > 1 && (
                  <span className="absolute bottom-0 right-1 text-white text-sm font-bold font-mono" style={{ textShadow: '1px 1px 0 #000' }}>
                    {craftResult.result.count}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default CraftingTable;
