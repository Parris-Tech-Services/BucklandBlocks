import React, { useState } from "react";
import { BlockType, getBlockData } from "../engine/blocks";

/**
 * An item's picture with its readable name and stack count, sized to fill a
 * slot. If the item has no texture or the image fails to load, the name is
 * shown as text instead of a broken-image icon.
 */
const ItemIcon: React.FC<{ type: BlockType; count?: number }> = ({ type, count = 0 }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const data = getBlockData(type);
  if (!data || type === BlockType.AIR) return null;
  const showImage = Boolean(data.texture) && !imageFailed;

  return (
    <span className="pointer-events-none relative flex h-full w-full items-center justify-center">
      {showImage ? (
        <img
          src={data.texture}
          alt=""
          draggable={false}
          onError={() => setImageFailed(true)}
          className="h-full w-full object-contain p-1 pixelated"
        />
      ) : (
        <span data-testid="item-text-fallback" className="px-0.5 text-center text-[8px] font-bold leading-tight text-white">
          {data.name}
        </span>
      )}
      {showImage && (
        <span
          className="absolute inset-x-0 top-0 truncate bg-black/60 px-0.5 text-[7px] font-bold leading-3 text-white"
          style={{ textShadow: "1px 1px 0 #000" }}
        >
          {data.name}
        </span>
      )}
      {count > 1 && (
        <span className="absolute bottom-0 right-1 font-mono text-[10px] font-bold text-white" style={{ textShadow: "1px 1px 0 #000" }}>
          {count}
        </span>
      )}
    </span>
  );
};

export default ItemIcon;
