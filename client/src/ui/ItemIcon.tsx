import React from "react";
import { BlockType, getBlockData } from "../engine/blocks";

/** An item's texture with a readable name and stack count, sized to fill its slot. */
const ItemIcon: React.FC<{ type: BlockType; count?: number }> = ({ type, count = 0 }) => {
  const data = getBlockData(type);
  if (!data || type === BlockType.AIR) return null;
  return (
    <div className="relative h-full w-full">
      {data.texture && (
        <img src={data.texture} alt="" className="h-full w-full object-contain p-1 pixelated" draggable={false} />
      )}
      <div
        className="absolute inset-x-0 top-0 truncate bg-black/60 px-0.5 text-[7px] font-bold leading-3 text-white"
        style={{ textShadow: "1px 1px 0 #000" }}
      >
        {data.name}
      </div>
      {count > 1 && (
        <div
          className="absolute bottom-0 right-1 font-mono text-[10px] font-bold text-white"
          style={{ textShadow: "1px 1px 0 #000" }}
        >
          {count}
        </div>
      )}
    </div>
  );
};

export default ItemIcon;
