import React, { useState } from "react";
import { X } from "lucide-react";
import { BlockType, BLOCKS } from "../engine/blocks";
import { useGame } from "../lib/stores/useGame";

const Inventory: React.FC = () => {
  const inventory = useGame((state) => state.inventory);
  const inventoryCounts = useGame((state) => state.inventoryCounts);
  const swapInventorySlots = useGame((state) => state.swapInventorySlots);
  const setMenu = useGame((state) => state.setMenu);
  const [pickedSlot, setPickedSlot] = useState<number | null>(null);

  const handleSlotClick = (slotIndex: number) => {
    if (pickedSlot === null) {
      setPickedSlot(slotIndex);
      return;
    }
    if (pickedSlot !== slotIndex) swapInventorySlots(pickedSlot, slotIndex);
    setPickedSlot(null);
  };

  const renderSlot = (slotIndex: number, isHotbar = false) => {
    const blockType = inventory[slotIndex];
    const count = inventoryCounts[slotIndex];
    const picked = pickedSlot === slotIndex;
    return (
      <button
        type="button"
        key={slotIndex}
        aria-label={`Inventory slot ${slotIndex + 1}`}
        className={`w-12 h-12 border-2 bg-gray-700 flex flex-col items-center justify-center hover:bg-gray-600 ${
          picked ? "border-cyan-300" : isHotbar ? "border-yellow-400" : "border-gray-400"
        }`}
        onClick={() => handleSlotClick(slotIndex)}
      >
        {blockType !== null && blockType !== BlockType.AIR && (
          <>
            <div className="text-white text-[8px] font-bold text-center">{BLOCKS[blockType].name.slice(0, 6)}</div>
            {count > 0 && <div className="text-white text-[10px]">{count}</div>}
          </>
        )}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3">
      <div className="bg-gray-800 border-2 border-gray-400 p-4 rounded-lg max-w-full overflow-x-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-lg font-bold">Inventory</h2>
          <button onClick={() => setMenu("none")} className="text-white hover:text-gray-300" aria-label="Close inventory"><X size={20} /></button>
        </div>
        <div className="grid grid-cols-9 gap-1 mb-4 min-w-[428px]">
          {Array.from({ length: 27 }, (_, index) => renderSlot(index + 9))}
        </div>
        <div className="border-t border-gray-600 pt-3">
          <div className="grid grid-cols-9 gap-1 min-w-[428px]">
            {Array.from({ length: 9 }, (_, index) => renderSlot(index, true))}
          </div>
        </div>
        <div className="mt-4 text-center text-gray-300 text-sm">
          {pickedSlot === null ? "Click a slot, then another slot to move or swap it." : `Slot ${pickedSlot + 1} selected. Choose its destination.`}
        </div>
      </div>
    </div>
  );
};

export default Inventory;
