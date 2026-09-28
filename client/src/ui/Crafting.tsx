import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { BlockType, getBlockData } from '../engine/blocks';
import { useGame } from '../lib/stores/useGame';
import recipesData from '../data/recipes.json';
import {
  craftIntoCursor,
  findMatchingRecipe,
  interactWithCraftingSlot,
  type CraftingRecipe,
} from '../engine/craftingGrid';

interface CraftingProps {
  onClose: () => void;
}

const recipes = recipesData as unknown as CraftingRecipe[];

const Crafting: React.FC<CraftingProps> = ({ onClose }) => {
  const {
    craftingGrid,
    craftingCounts,
    cursorItem,
  } = useGame();
  
  const craftResult = useMemo(
    () => findMatchingRecipe(craftingGrid, 2, recipes),
    [craftingGrid],
  );

  const handleCraftingSlotClick = (e: React.MouseEvent, slotIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    const state = useGame.getState();
    const next = interactWithCraftingSlot(
      {
        grid: state.craftingGrid,
        counts: state.craftingCounts,
        cursor: state.cursorItem,
      },
      slotIndex,
      e.type === 'contextmenu' || e.button === 2,
    );

    useGame.setState({
      craftingGrid: next.grid,
      craftingCounts: next.counts,
      cursorItem: next.cursor,
    });
  };

  const handleCraftButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!craftResult) return;

    const state = useGame.getState();
    const transaction = craftIntoCursor(
      {
        grid: state.craftingGrid,
        counts: state.craftingCounts,
        cursor: state.cursorItem,
      },
      craftResult,
    );
    if (!transaction.ok) return;

    useGame.setState({
      craftingGrid: transaction.state.grid,
      craftingCounts: transaction.state.counts,
      cursorItem: transaction.state.cursor,
    });
  };

  const renderSlot = (slotIndex: number) => {
    const blockType = craftingGrid[slotIndex];
    const count = craftingCounts[slotIndex];
    return (
      <div
        key={slotIndex}
        className="w-12 h-12 border-2 border-gray-500 bg-gray-700 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-600"
        onClick={(e) => handleCraftingSlotClick(e, slotIndex)}
        onContextMenu={(e) => handleCraftingSlotClick(e, slotIndex)}
      >
        {blockType !== null && blockType !== BlockType.AIR && (
          <>
            <div className="text-white text-[8px] font-bold text-center">
              {getBlockData(blockType)?.name.slice(0, 8) || 'Unknown'}
            </div>
            {count > 0 && (
              <div className="text-white text-[10px] font-mono mt-1">{count}</div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderResultSlot = () => {
    if (!craftResult) return <div className="w-12 h-12 border-2 border-gray-500 bg-gray-700 opacity-50" />;
    return (
      <div
        className="w-12 h-12 border-2 border-yellow-400 bg-gray-700 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-600"
        onClick={handleCraftButtonClick}
      >
        <div className="text-white text-[8px] font-bold text-center">
          {getBlockData(craftResult.result.type)?.name.slice(0, 8)}
        </div>
        <div className="text-white text-[10px] font-mono mt-1">{craftResult.result.count}</div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 pointer-events-auto">
      <div className="bg-gray-800 border-2 border-gray-400 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-lg font-bold">Crafting</h2>
          <button onClick={onClose} className="text-white hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center space-x-4 mb-4">
          <div className="grid grid-cols-2 gap-1">
            {Array.from({ length: 4 }, (_, i) => renderSlot(i))}
          </div>
          <div className="text-white text-2xl">→</div>
          {renderResultSlot()}
        </div>

        <div className="border-t border-gray-600 pt-4">
          <h3 className="text-white font-bold mb-2 text-sm">2x2 Supported Recipes:</h3>
          <div className="text-gray-300 text-xs space-y-1 max-h-32 overflow-y-auto">
            {recipes.filter(r => r.pattern.length <= 2 && Math.max(...r.pattern.map(p => p.length)) <= 2).map((recipe, index) => (
              <div key={index} className="flex justify-between">
                <span>{getBlockData(recipe.result.type)?.name}</span>
                <span>({recipe.result.count}x)</span>
              </div>
            ))}
          </div>
          
          <h3 className="text-gray-500 font-bold mt-2 text-xs">Requires 3x3 Grid (Unsupported):</h3>
          <div className="text-gray-600 text-xs space-y-1 max-h-32 overflow-y-auto">
            {recipes.filter(r => r.pattern.length > 2 || Math.max(...r.pattern.map(p => p.length)) > 2).map((recipe, index) => (
              <div key={index} className="flex justify-between">
                <span>{getBlockData(recipe.result.type)?.name}</span>
                <span>({recipe.result.count}x)</span>
              </div>
            ))}
          </div>
        </div>

        {cursorItem && (
          <div className="fixed pointer-events-none z-[100]" style={{ left: '50%', top: '10%', transform: 'translate(-50%, -50%)' }}>
            <div className="w-12 h-12 border-2 border-white bg-gray-700 flex flex-col items-center justify-center opacity-80">
              <div className="text-white text-[8px] font-bold text-center">
                {getBlockData(cursorItem.type)?.name.slice(0, 8) || 'Unknown'}
              </div>
              <div className="text-white text-[10px] font-mono mt-1">{cursorItem.count}</div>
            </div>
          </div>
        )}

        <div className="mt-4 text-center text-gray-400 text-xs">
          Left/Right click to arrange items.<br/>
          Click result to craft.<br/>
          Press C or ESC to close.
        </div>
      </div>
    </div>
  );
};

export default Crafting;
